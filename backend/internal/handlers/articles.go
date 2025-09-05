package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

// CreateArticleRequest 创建文章请求结构
type CreateArticleRequest struct {
	Title           string `json:"title" binding:"required"`
	Content         string `json:"content" binding:"required"`
	Excerpt         string `json:"excerpt"`
	CoverImage      string `json:"cover_image"`
	CategoryID      *uint  `json:"category_id"`
	TagIDs          []uint `json:"tag_ids"`
	SeriesID        *uint  `json:"series_id"`
	SeriesOrder     *int   `json:"series_order"`
	IsPublished     bool   `json:"is_published"`
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	MetaKeywords    string `json:"meta_keywords"`
}

// UpdateArticleRequest 更新文章请求结构
type UpdateArticleRequest struct {
	Title           *string `json:"title"`
	Content         *string `json:"content"`
	Excerpt         *string `json:"excerpt"`
	CoverImage      *string `json:"cover_image"`
	CategoryID      *uint   `json:"category_id"`
	TagIDs          []uint  `json:"tag_ids"`
	SeriesID        *uint   `json:"series_id"`
	SeriesOrder     *int    `json:"series_order"`
	IsPublished     *bool   `json:"is_published"`
	MetaTitle       *string `json:"meta_title"`
	MetaDescription *string `json:"meta_description"`
	MetaKeywords    *string `json:"meta_keywords"`
}

// GetArticles 获取文章列表
func GetArticles(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	categoryID := c.Query("category_id")
	tagIDs := c.Query("tag_ids")
	seriesID := c.Query("series_id")
	isPublished := c.Query("is_published")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	search := c.Query("search")

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// 构建查询
	query := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series")

	// 搜索条件
	if search != "" {
		query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}

	// 分类筛选
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// 标签筛选
	if tagIDs != "" {
		tagIDList := strings.Split(tagIDs, ",")
		query = query.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id IN ?", tagIDList)
	}

	// 系列筛选
	if seriesID != "" {
		query = query.Where("series_id = ?", seriesID)
	}

	// 发布状态筛选
	if isPublished == "true" {
		query = query.Where("is_published = ?", true)
	} else if isPublished == "false" {
		query = query.Where("is_published = ?", false)
	}

	// 排序
	allowedSortFields := map[string]bool{
		"created_at":   true,
		"updated_at":   true,
		"published_at": true,
		"title":        true,
		"views_count":  true,
		"likes_count":  true,
		"reading_time": true,
	}
	if !allowedSortFields[sortBy] {
		sortBy = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	orderBy := sortBy + " " + sortOrder
	query = query.Order(orderBy)

	// 计算总数
	var total int64
	query.Count(&total)

	// 分页
	offset := (page - 1) * limit
	var articles []models.Article
	err := query.Offset(offset).Limit(limit).Find(&articles).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询文章列表失败",
		})
		return
	}

	// 计算总页数
	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"articles": articles,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetArticle 获取单篇文章
func GetArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章ID无效",
		})
		return
	}

	var article models.Article
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		First(&article, uint(id)).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "文章不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询文章失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    article,
	})
}

// GetArticleBySlug 根据slug获取文章
func GetArticleBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章slug不能为空",
		})
		return
	}

	var article models.Article
	err := database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("slug = ?", slug).
		First(&article).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "文章不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询文章失败",
		})
		return
	}

	// 检查用户是否已点赞
	clientIP := c.ClientIP()
	var existingLike models.ArticleLike
	isLiked := database.DB.Where("article_id = ? AND ip = ?", article.ID, clientIP).
		First(&existingLike).Error == nil

	// 创建响应数据，包含点赞状态
	responseData := gin.H{
		"id":               article.ID,
		"title":            article.Title,
		"slug":             article.Slug,
		"excerpt":          article.Excerpt,
		"content":          article.Content,
		"cover_image":      article.CoverImage,
		"is_published":     article.IsPublished,
		"is_draft":         article.IsDraft,
		"published_at":     article.PublishedAt,
		"reading_time":     article.ReadingTime,
		"views_count":      article.ViewsCount,
		"likes_count":      article.LikesCount,
		"author_id":        article.AuthorID,
		"category_id":      article.CategoryID,
		"series_id":        article.SeriesID,
		"series_order":     article.SeriesOrder,
		"meta_title":       article.MetaTitle,
		"meta_description": article.MetaDescription,
		"meta_keywords":    article.MetaKeywords,
		"created_at":       article.CreatedAt,
		"updated_at":       article.UpdatedAt,
		"author":           article.Author,
		"category":         article.Category,
		"series":           article.Series,
		"tags":             article.Tags,
		"is_liked":         isLiked,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responseData,
	})
}

// CreateArticle 创建文章
func CreateArticle(c *gin.Context) {
	var req CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 生成slug
	slug := utils.GenerateSlug(req.Title)

	// 从 Gin 的上下文中获取当前登录的用户 ID
	authorID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	// 验证Slug是否唯一
	var existingArticle models.Article
	err := database.DB.Where("slug = ?", slug).First(&existingArticle).Error
	if err == nil {
		// slug已存在，添加后缀
		slug = utils.GenerateUniqueSlug(slug)
	}

	// 计算阅读时间
	readingTime := utils.CalculateReadingTime(req.Content)

	// 生成摘要（如果没有提供）
	excerpt := req.Excerpt
	if excerpt == "" {
		excerpt = utils.TruncateText(utils.StripHTML(req.Content), 150)
	}

	// 创建文章
	article := models.Article{
		AuthorID:        authorID,
		Title:           req.Title,
		Slug:            slug,
		Content:         req.Content,
		Excerpt:         excerpt,
		CoverImage:      req.CoverImage,
		CategoryID:      req.CategoryID,
		SeriesID:        req.SeriesID,
		SeriesOrder:     req.SeriesOrder,
		IsPublished:     req.IsPublished,
		IsDraft:         !req.IsPublished,
		ReadingTime:     readingTime,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		MetaKeywords:    req.MetaKeywords,
	}

	// 如果是发布状态，设置发布时间
	if req.IsPublished {
		now := time.Now()
		article.PublishedAt = &now
	}

	// 开始事务
	tx := database.DB.Begin()

	// 创建文章
	err = tx.Create(&article).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建文章失败",
		})
		return
	}

	// 关联标签
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		err = tx.Where("id IN ?", req.TagIDs).Find(&tags).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "查询标签失败",
			})
			return
		}

		err = tx.Model(&article).Association("Tags").Append(tags)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "关联标签失败",
			})
			return
		}
	}

	tx.Commit()

	// 重新查询文章（包含关联数据）
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		First(&article, article.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询创建的文章失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "文章创建成功",
		"data":    article,
	})
}

// UpdateArticle 更新文章
func UpdateArticle(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章ID无效",
		})
		return
	}

	var req UpdateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 查找文章
	var article models.Article
	err = database.DB.First(&article, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "文章不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询文章失败",
		})
		return
	}

	// 权限检查：只有作者或管理员可以编辑
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if article.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "没有权限编辑此文章",
		})
		return
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Title != nil {
		updates["title"] = *req.Title
		// 如果标题改变，重新生成slug
		newSlug := utils.GenerateSlug(*req.Title)
		if newSlug != article.Slug {
			// 检查新slug是否已存在
			var existingArticle models.Article
			err := database.DB.Where("slug = ? AND id != ?", newSlug, article.ID).First(&existingArticle).Error
			if err == nil {
				newSlug = utils.GenerateUniqueSlug(newSlug)
			}
			updates["slug"] = newSlug
		}
	}

	if req.Content != nil {
		updates["content"] = *req.Content
		// 重新计算阅读时间
		updates["reading_time"] = utils.CalculateReadingTime(*req.Content)

		// 如果没有提供新的摘要，从新内容生成
		if req.Excerpt == nil {
			updates["excerpt"] = utils.TruncateText(utils.StripHTML(*req.Content), 150)
		}
	}

	if req.Excerpt != nil {
		updates["excerpt"] = *req.Excerpt
	}

	if req.CoverImage != nil {
		updates["cover_image"] = *req.CoverImage
	}

	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}

	if req.SeriesID != nil {
		updates["series_id"] = *req.SeriesID
	}

	if req.SeriesOrder != nil {
		updates["series_order"] = *req.SeriesOrder
	}

	if req.IsPublished != nil {
		updates["is_published"] = *req.IsPublished
		updates["is_draft"] = !(*req.IsPublished)

		// 如果从草稿变为发布，设置发布时间
		if *req.IsPublished && !article.IsPublished {
			now := time.Now()
			updates["published_at"] = &now
		}
	}

	if req.MetaTitle != nil {
		updates["meta_title"] = *req.MetaTitle
	}

	if req.MetaDescription != nil {
		updates["meta_description"] = *req.MetaDescription
	}

	if req.MetaKeywords != nil {
		updates["meta_keywords"] = *req.MetaKeywords
	}

	// 开始事务
	tx := database.DB.Begin()

	// 更新文章
	if len(updates) > 0 {
		err = tx.Model(&article).Updates(updates).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新文章失败",
			})
			return
		}
	}

	// 更新标签关联
	if req.TagIDs != nil {
		// 清除现有标签关联
		err = tx.Model(&article).Association("Tags").Clear()
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "清除文章标签关联失败",
			})
			return
		}

		// 添加新的标签关联
		if len(req.TagIDs) > 0 {
			var tags []models.Tag
			err = tx.Where("id IN ?", req.TagIDs).Find(&tags).Error
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "查询标签失败",
				})
				return
			}

			err = tx.Model(&article).Association("Tags").Append(tags)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"error":   "关联标签失败",
				})
				return
			}
		}
	}

	tx.Commit()

	// 重新查询文章（包含关联数据）
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		First(&article, article.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询更新后的文章失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "文章更新成功",
		"data":    article,
	})
}
