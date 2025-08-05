package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/pkg/search"
)

// SearchRequest 搜索请求结构
type SearchRequest struct {
	Query       string   `json:"query"`
	CategoryIDs []string `json:"category_ids"`
	TagIDs      []string `json:"tag_ids"`
	AuthorIDs   []string `json:"author_ids"`
	SeriesIDs   []string `json:"series_ids"`
	DateFrom    string   `json:"date_from"`
	DateTo      string   `json:"date_to"`
	SortBy      string   `json:"sort_by"`    // score, date, views, likes
	SortOrder   string   `json:"sort_order"` // asc, desc
	Page        int      `json:"page"`
	Limit       int      `json:"limit"`
	Highlight   bool     `json:"highlight"`
}

// SearchContent 搜索内容
func SearchContent(c *gin.Context) {
	// 获取查询参数
	query := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sortBy := c.DefaultQuery("sort_by", "score")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	highlight := c.DefaultQuery("highlight", "true") == "true"

	// 获取筛选条件
	categoryIDs := strings.Split(c.Query("category_ids"), ",")
	if len(categoryIDs) == 1 && categoryIDs[0] == "" {
		categoryIDs = []string{}
	}
	
	tagIDs := strings.Split(c.Query("tag_ids"), ",")
	if len(tagIDs) == 1 && tagIDs[0] == "" {
		tagIDs = []string{}
	}
	
	authorIDs := strings.Split(c.Query("author_ids"), ",")
	if len(authorIDs) == 1 && authorIDs[0] == "" {
		authorIDs = []string{}
	}
	
	seriesIDs := strings.Split(c.Query("series_ids"), ",")
	if len(seriesIDs) == 1 && seriesIDs[0] == "" {
		seriesIDs = []string{}
	}

	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	// 如果没有搜索引擎，使用数据库搜索作为备选方案
	if search.Engine == nil {
		fallbackSearchResult, err := fallbackDatabaseSearch(query, categoryIDs, tagIDs, page, limit, sortBy, sortOrder)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "搜索失败",
			})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    fallbackSearchResult,
			"message": "使用数据库搜索（搜索引擎不可用）",
		})
		return
	}

	// 构建搜索选项
	searchOptions := search.SearchOptions{
		Query:       query,
		CategoryIDs: categoryIDs,
		TagIDs:      tagIDs,
		AuthorIDs:   authorIDs,
		SeriesIDs:   seriesIDs,
		DateFrom:    dateFrom,
		DateTo:      dateTo,
		SortBy:      sortBy,
		SortOrder:   sortOrder,
		From:        (page - 1) * limit,
		Size:        limit,
		Highlight:   highlight,
	}

	// 执行搜索
	searchResult, err := search.Engine.Search(searchOptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "搜索执行失败: " + err.Error(),
		})
		return
	}

	// 计算分页信息
	totalPages := (int(searchResult.Total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"documents": searchResult.Documents,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       searchResult.Total,
				"total_pages": totalPages,
			},
			"took":      searchResult.Took.String(),
			"max_score": searchResult.MaxScore,
		},
	})
}

// fallbackDatabaseSearch 数据库搜索备选方案
func fallbackDatabaseSearch(query string, categoryIDs, tagIDs []string, page, limit int, sortBy, sortOrder string) (gin.H, error) {
	// 构建数据库查询
	dbQuery := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("is_published = ?", true)

	// 全文搜索条件
	if query != "" {
		searchCondition := "title ILIKE ? OR content ILIKE ? OR excerpt ILIKE ?"
		searchTerm := "%" + query + "%"
		dbQuery = dbQuery.Where(searchCondition, searchTerm, searchTerm, searchTerm)
	}

	// 分类筛选
	if len(categoryIDs) > 0 && categoryIDs[0] != "" {
		dbQuery = dbQuery.Where("category_id IN ?", categoryIDs)
	}

	// 标签筛选
	if len(tagIDs) > 0 && tagIDs[0] != "" {
		dbQuery = dbQuery.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id IN ?", tagIDs)
	}

	// 排序
	orderClause := "created_at DESC"
	switch sortBy {
	case "date":
		if sortOrder == "asc" {
			orderClause = "published_at ASC"
		} else {
			orderClause = "published_at DESC"
		}
	case "views":
		if sortOrder == "asc" {
			orderClause = "views_count ASC"
		} else {
			orderClause = "views_count DESC"
		}
	case "likes":
		if sortOrder == "asc" {
			orderClause = "likes_count ASC"
		} else {
			orderClause = "likes_count DESC"
		}
	}
	dbQuery = dbQuery.Order(orderClause)

	// 计算总数
	var total int64
	dbQuery.Count(&total)

	// 分页
	offset := (page - 1) * limit
	var articles []models.Article
	err := dbQuery.Offset(offset).Limit(limit).Find(&articles).Error
	if err != nil {
		return nil, err
	}

	// 转换为搜索文档格式
	documents := make([]search.SearchDocument, len(articles))
	for i, article := range articles {
		doc := search.SearchDocument{
			ID:          strconv.FormatUint(uint64(article.ID), 10),
			Title:       article.Title,
			Excerpt:     article.Excerpt,
			Slug:        article.Slug,
			AuthorName:  article.Author.Name,
			IsPublished: article.IsPublished,
			CreatedAt:   article.CreatedAt,
			UpdatedAt:   article.UpdatedAt,
			ViewsCount:  article.ViewsCount,
			LikesCount:  article.LikesCount,
		}

		if article.PublishedAt != nil {
			doc.PublishedAt = *article.PublishedAt
		}

		if article.Category != nil {
			doc.Category = article.Category.Name
			doc.CategoryID = strconv.FormatUint(uint64(article.Category.ID), 10)
		}

		if article.Series != nil {
			doc.Series = article.Series.Name
			doc.SeriesID = strconv.FormatUint(uint64(article.Series.ID), 10)
		}

		if len(article.Tags) > 0 {
			doc.Tags = make([]string, len(article.Tags))
			doc.TagIDs = make([]string, len(article.Tags))
			for j, tag := range article.Tags {
				doc.Tags[j] = tag.Name
				doc.TagIDs[j] = strconv.FormatUint(uint64(tag.ID), 10)
			}
		}

		documents[i] = doc
	}

	totalPages := (int(total) + limit - 1) / limit

	return gin.H{
		"documents": documents,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
		"took":      "0ms",
		"max_score": 0.0,
	}, nil
}

// SearchSuggestions 搜索建议
func SearchSuggestions(c *gin.Context) {
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	
	if limit < 1 || limit > 20 {
		limit = 5
	}

	if query == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []string{},
		})
		return
	}

	// 从文章标题中获取建议
	var suggestions []string
	err := database.DB.Model(&models.Article{}).
		Where("is_published = ? AND title ILIKE ?", true, "%"+query+"%").
		Limit(limit).
		Pluck("title", &suggestions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取搜索建议失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    suggestions,
	})
}

// IndexAllArticles 重建搜索索引
func IndexAllArticles(c *gin.Context) {
	// 权限检查：只有管理员可以重建索引
	isAdmin, exists := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	if search.Engine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "搜索引擎不可用",
		})
		return
	}

	// 获取所有已发布的文章
	var articles []models.Article
	err := database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("is_published = ?", true).
		Find(&articles).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询文章失败",
		})
		return
	}

	// 批量索引文章
	err = search.Engine.BatchIndexArticles(articles)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "重建索引失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "搜索索引重建成功",
		"data": gin.H{
			"indexed_articles": len(articles),
		},
	})
}