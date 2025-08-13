package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	categoryID := c.Query("category_id")
	tagIDs := c.Query("tag_ids")
	seriesID := c.Query("series_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	sortBy := c.DefaultQuery("sort_by", "published_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	
	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	
	// 直接使用数据库搜索
	var articles []models.Article
	dbQuery := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("is_published = ?", true)
	
	// 添加搜索条件
	if query != "" {
		searchCondition := "LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?) OR LOWER(excerpt) LIKE LOWER(?)"
		searchTerm := "%" + query + "%"
		dbQuery = dbQuery.Where(searchCondition, searchTerm, searchTerm, searchTerm)
	}
	
	// 分类筛选
	if categoryID != "" {
		dbQuery = dbQuery.Where("category_id = ?", categoryID)
	}
	
	// 标签筛选
	if tagIDs != "" {
		tagIDList := strings.Split(tagIDs, ",")
		if len(tagIDList) > 0 {
			dbQuery = dbQuery.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
				Where("article_tags.tag_id IN ?", tagIDList).
				Distinct()
		}
	}
	
	// 系列筛选
	if seriesID != "" {
		dbQuery = dbQuery.Where("series_id = ?", seriesID)
	}
	
	// 日期范围筛选
	if dateFrom != "" {
		dbQuery = dbQuery.Where("published_at >= ?", dateFrom)
	}
	if dateTo != "" {
		dbQuery = dbQuery.Where("published_at <= ?", dateTo)
	}
	
	// 排序
	orderClause := "published_at DESC"
	switch sortBy {
	case "created_at":
		if sortOrder == "asc" {
			orderClause = "created_at ASC"
		} else {
			orderClause = "created_at DESC"
		}
	case "updated_at":
		if sortOrder == "asc" {
			orderClause = "updated_at ASC"
		} else {
			orderClause = "updated_at DESC"
		}
	case "published_at":
		if sortOrder == "asc" {
			orderClause = "published_at ASC"
		} else {
			orderClause = "published_at DESC"
		}
	case "title":
		if sortOrder == "asc" {
			orderClause = "title ASC"
		} else {
			orderClause = "title DESC"
		}
	case "views_count":
		if sortOrder == "asc" {
			orderClause = "views_count ASC"
		} else {
			orderClause = "views_count DESC"
		}
	case "likes_count":
		if sortOrder == "asc" {
			orderClause = "likes_count ASC"
		} else {
			orderClause = "likes_count DESC"
		}
	}
	
	// 计算总数
	var total int64
	dbQuery.Count(&total)
	
	// 分页查询
	offset := (page - 1) * limit
	err := dbQuery.Order(orderClause).Offset(offset).Limit(limit).Find(&articles).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "搜索失败: " + err.Error(),
		})
		return
	}
	
	// 记录搜索统计（只有当有搜索查询时才记录）
	if query != "" {
		searchStat := models.SearchStatistics{
			Query:       query,
			IP:          c.ClientIP(),
			UserAgent:   c.GetHeader("User-Agent"),
			ResultCount: int(total),
		}
		database.DB.Create(&searchStat)
	}
	
	// 计算分页信息
	totalPages := (int(total) + limit - 1) / limit
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"documents": articles,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
		"message": "使用数据库搜索",
	})
}

// TestSearch 测试搜索
func TestSearch(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "测试成功",
	})
}

// fallbackDatabaseSearch 数据库搜索备选方案
func fallbackDatabaseSearch(query string, categoryIDs, tagIDs []string, page, limit int, sortBy, sortOrder string) (gin.H, error) {
	log.Printf("开始数据库搜索: query=%s, categoryIDs=%v, tagIDs=%v", query, categoryIDs, tagIDs)
	
	// 检查数据库连接
	if database.DB == nil {
		return nil, fmt.Errorf("数据库连接未初始化")
	}
	
	// 构建数据库查询
	dbQuery := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("is_published = ?", true)
	
	log.Println("基础查询构建完成")

	// 全文搜索条件
	if query != "" {
		searchCondition := "LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?) OR LOWER(excerpt) LIKE LOWER(?)"
		searchTerm := "%" + query + "%"
		dbQuery = dbQuery.Where(searchCondition, searchTerm, searchTerm, searchTerm)
	}

	// 分类筛选
	if len(categoryIDs) > 0 {
		dbQuery = dbQuery.Where("category_id IN ?", categoryIDs)
	}

	// 标签筛选
	if len(tagIDs) > 0 {
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
		Where("is_published = ? AND LOWER(title) LIKE LOWER(?)", true, "%"+query+"%").
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

// GetSearchStats 获取搜索统计
func GetSearchStats(c *gin.Context) {
	// 获取总搜索次数
	var totalSearches int64
	err := database.DB.Model(&models.SearchStatistics{}).Count(&totalSearches).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询搜索统计失败",
		})
		return
	}

	// 获取热门搜索（按查询次数分组并排序）
	type PopularQuery struct {
		Query string `json:"query"`
		Count int    `json:"count"`
	}
	var popularQueries []PopularQuery
	err = database.DB.Model(&models.SearchStatistics{}).
		Select("query, COUNT(*) as count").
		Where("query != ''").
		Group("query").
		Order("count DESC").
		Limit(10).
		Scan(&popularQueries).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询热门搜索失败",
		})
		return
	}

	// 获取最近搜索
	type RecentSearch struct {
		Query       string    `json:"query"`
		Timestamp   time.Time `json:"timestamp"`
		ResultCount int       `json:"resultCount"`
	}
	var recentSearches []RecentSearch
	err = database.DB.Model(&models.SearchStatistics{}).
		Select("query, searched_at as timestamp, result_count").
		Where("query != ''").
		Order("searched_at DESC").
		Limit(10).
		Scan(&recentSearches).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询最近搜索失败",
		})
		return
	}

	// 获取搜索趋势（过去7天）
	type SearchTrend struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}
	var searchTrends []SearchTrend
	
	// 生成过去7天的日期
	now := time.Now()
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		var count int64
		
		// 查询当天的搜索次数
		database.DB.Model(&models.SearchStatistics{}).
			Where("DATE(searched_at) = ?", date).
			Count(&count)
		
		searchTrends = append(searchTrends, SearchTrend{
			Date:  date,
			Count: int(count),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalSearches":   totalSearches,
			"popularQueries":  popularQueries,
			"recentSearches":  recentSearches,
			"searchTrends":    searchTrends,
		},
	})
}