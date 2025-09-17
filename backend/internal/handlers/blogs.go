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

// CreateBlogRequest 创建博客请求结构
type CreateBlogRequest struct {
	Title           string  `json:"title" binding:"required"`
	Description     string  `json:"description"`
	Content         string  `json:"content"`
	Type            string  `json:"type" binding:"required,oneof=audio video"`
	MediaURL        string  `json:"media_url" binding:"required"`
	Thumbnail       string  `json:"thumbnail"`
	Duration        int     `json:"duration"`
	FileSize        int64   `json:"file_size"`
	MimeType        string  `json:"mime_type"`
	CategoryID      *uint   `json:"category_id"`
	TagIDs          []uint  `json:"tag_ids"`
	IsPublished     bool    `json:"is_published"`
	MetaTitle       string  `json:"meta_title"`
	MetaDescription string  `json:"meta_description"`
	MetaKeywords    string  `json:"meta_keywords"`
}

// UpdateBlogRequest 更新博客请求结构
type UpdateBlogRequest struct {
	Title           *string `json:"title"`
	Description     *string `json:"description"`
	Content         *string `json:"content"`
	Type            *string `json:"type" binding:"omitempty,oneof=audio video"`
	MediaURL        *string `json:"media_url"`
	Thumbnail       *string `json:"thumbnail"`
	Duration        *int    `json:"duration"`
	FileSize        *int64  `json:"file_size"`
	MimeType        *string `json:"mime_type"`
	CategoryID      *uint   `json:"category_id"`
	TagIDs          []uint  `json:"tag_ids"`
	IsPublished     *bool   `json:"is_published"`
	MetaTitle       *string `json:"meta_title"`
	MetaDescription *string `json:"meta_description"`
	MetaKeywords    *string `json:"meta_keywords"`
}

// GetBlogs 获取博客列表
func GetBlogs(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	categoryID := c.Query("category_id")
	tagIDs := c.Query("tag_ids")
	blogType := c.Query("type")
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
	query := database.DB.Model(&models.Blog{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags")

	// 搜索条件
	if search != "" {
		query = query.Where("LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}

	// 分类筛选
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	// 标签筛选
	if tagIDs != "" {
		tagIDList := strings.Split(tagIDs, ",")
		query = query.Joins("JOIN blog_tags ON blog_tags.blog_id = blogs.id").
			Where("blog_tags.tag_id IN ?", tagIDList)
	}

	// 类型筛选
	if blogType != "" && (blogType == "audio" || blogType == "video") {
		query = query.Where("type = ?", blogType)
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
		"duration":     true,
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
	var blogs []models.Blog
	err := query.Offset(offset).Limit(limit).Find(&blogs).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询博客列表失败",
		})
		return
	}

	// 计算总页数
	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"blogs": blogs,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetBlog 获取单个博客
func GetBlog(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "博客ID无效",
		})
		return
	}

	var blog models.Blog
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		First(&blog, uint(id)).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "博客不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询博客失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    blog,
	})
}

// GetBlogBySlug 根据slug获取博客
func GetBlogBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "博客slug不能为空",
		})
		return
	}

	var blog models.Blog
	err := database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		Where("slug = ?", slug).
		First(&blog).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "博客不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询博客失败",
		})
		return
	}

	// 检查用户是否已点赞
	clientIP := c.ClientIP()
	var existingLike models.BlogLike
	isLiked := database.DB.Where("blog_id = ? AND ip = ?", blog.ID, clientIP).
		First(&existingLike).Error == nil

	// 创建响应数据，包含点赞状态
	responseData := gin.H{
		"id":               blog.ID,
		"title":            blog.Title,
		"slug":             blog.Slug,
		"description":      blog.Description,
		"content":          blog.Content,
		"type":             blog.Type,
		"media_url":        blog.MediaURL,
		"thumbnail":        blog.Thumbnail,
		"duration":         blog.Duration,
		"file_size":        blog.FileSize,
		"mime_type":        blog.MimeType,
		"is_published":     blog.IsPublished,
		"is_draft":         blog.IsDraft,
		"published_at":     blog.PublishedAt,
		"views_count":      blog.ViewsCount,
		"likes_count":      blog.LikesCount,
		"author_id":        blog.AuthorID,
		"category_id":      blog.CategoryID,
		"meta_title":       blog.MetaTitle,
		"meta_description": blog.MetaDescription,
		"meta_keywords":    blog.MetaKeywords,
		"created_at":       blog.CreatedAt,
		"updated_at":       blog.UpdatedAt,
		"author":           blog.Author,
		"category":         blog.Category,
		"tags":             blog.Tags,
		"is_liked":         isLiked,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responseData,
	})
}

// CreateBlog 创建博客
func CreateBlog(c *gin.Context) {
	var req CreateBlogRequest
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
	var existingBlog models.Blog
	err := database.DB.Where("slug = ?", slug).First(&existingBlog).Error
	if err == nil {
		// slug已存在，添加后缀
		slug = utils.GenerateUniqueSlug(slug)
	}

	// 创建博客
	blog := models.Blog{
		AuthorID:        authorID,
		Title:           req.Title,
		Slug:            slug,
		Description:     req.Description,
		Content:         req.Content,
		Type:            req.Type,
		MediaURL:        req.MediaURL,
		Thumbnail:       req.Thumbnail,
		Duration:        req.Duration,
		FileSize:        req.FileSize,
		MimeType:        req.MimeType,
		CategoryID:      req.CategoryID,
		IsPublished:     req.IsPublished,
		IsDraft:         !req.IsPublished,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		MetaKeywords:    req.MetaKeywords,
	}

	// 如果是发布状态，设置发布时间
	if req.IsPublished {
		now := time.Now()
		blog.PublishedAt = &now
	}

	// 开始事务
	tx := database.DB.Begin()

	// 创建博客
	err = tx.Create(&blog).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建博客失败",
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

		err = tx.Model(&blog).Association("Tags").Append(tags)
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

	// 重新查询博客（包含关联数据）
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		First(&blog, blog.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询创建的博客失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "博客创建成功",
		"data":    blog,
	})
}

// UpdateBlog 更新博客
func UpdateBlog(c *gin.Context) {
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
			"error":   "博客ID无效",
		})
		return
	}

	var req UpdateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 查找博客
	var blog models.Blog
	err = database.DB.First(&blog, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "博客不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询博客失败",
		})
		return
	}

	// 权限检查：只有作者或管理员可以编辑
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if blog.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "没有权限编辑此博客",
		})
		return
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Title != nil {
		updates["title"] = *req.Title
		// 如果标题改变，重新生成slug
		newSlug := utils.GenerateSlug(*req.Title)
		if newSlug != blog.Slug {
			// 检查新slug是否已存在
			var existingBlog models.Blog
			err := database.DB.Where("slug = ? AND id != ?", newSlug, blog.ID).First(&existingBlog).Error
			if err == nil {
				newSlug = utils.GenerateUniqueSlug(newSlug)
			}
			updates["slug"] = newSlug
		}
	}

	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if req.Content != nil {
		updates["content"] = *req.Content
	}

	if req.Type != nil {
		updates["type"] = *req.Type
	}

	if req.MediaURL != nil {
		updates["media_url"] = *req.MediaURL
	}

	if req.Thumbnail != nil {
		updates["thumbnail"] = *req.Thumbnail
	}

	if req.Duration != nil {
		updates["duration"] = *req.Duration
	}

	if req.FileSize != nil {
		updates["file_size"] = *req.FileSize
	}

	if req.MimeType != nil {
		updates["mime_type"] = *req.MimeType
	}

	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}

	if req.IsPublished != nil {
		updates["is_published"] = *req.IsPublished
		updates["is_draft"] = !(*req.IsPublished)

		// 如果从草稿变为发布，设置发布时间
		if *req.IsPublished && !blog.IsPublished {
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

	// 更新博客
	if len(updates) > 0 {
		err = tx.Model(&blog).Updates(updates).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新博客失败",
			})
			return
		}
	}

	// 更新标签关联
	if req.TagIDs != nil {
		// 清除现有标签关联
		err = tx.Model(&blog).Association("Tags").Clear()
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "清除博客标签关联失败",
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

			err = tx.Model(&blog).Association("Tags").Append(tags)
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

	// 重新查询博客（包含关联数据）
	err = database.DB.Preload("Author").
		Preload("Category").
		Preload("Tags").
		First(&blog, blog.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询更新后的博客失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "博客更新成功",
		"data":    blog,
	})
}

// DeleteBlog 删除博客
func DeleteBlog(c *gin.Context) {
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
			"error":   "博客ID无效",
		})
		return
	}

	// 查找博客
	var blog models.Blog
	err = database.DB.First(&blog, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "博客不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询博客失败",
		})
		return
	}

	// 权限检查：只有作者或管理员可以删除
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if blog.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "没有权限删除此博客",
		})
		return
	}

	// 软删除博客
	err = database.DB.Delete(&blog).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除博客失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "博客删除成功",
	})
}

// IncrementBlogViews 增加博客浏览量
func IncrementBlogViews(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "博客ID无效",
		})
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	blogID := uint(id)

	// 检查24小时内是否已有相同IP的浏览记录
	var existingView models.BlogView
	since := time.Now().Add(-24 * time.Hour)
	err = database.DB.Where("blog_id = ? AND ip = ? AND viewed_at > ?", blogID, clientIP, since).
		First(&existingView).Error

	if err == gorm.ErrRecordNotFound {
		// 没有找到24小时内的浏览记录，创建新记录并增加浏览量
		err = database.DB.Transaction(func(tx *gorm.DB) error {
			// 创建浏览记录
			view := models.BlogView{
				BlogID:    blogID,
				IP:        clientIP,
				UserAgent: userAgent,
			}
			if err := tx.Create(&view).Error; err != nil {
				return err
			}

			// 增加博客浏览量
			return tx.Model(&models.Blog{}).Where("id = ?", blogID).
				UpdateColumn("views_count", gorm.Expr("views_count + 1")).Error
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新浏览量失败",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "浏览量更新成功",
	})
}

// ToggleBlogLike 切换博客点赞状态
func ToggleBlogLike(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "博客ID无效",
		})
		return
	}

	clientIP := c.ClientIP()
	blogID := uint(id)

	// 检查是否已经点赞
	var existingLike models.BlogLike
	err = database.DB.Where("blog_id = ? AND ip = ?", blogID, clientIP).First(&existingLike).Error

	var isLiked bool
	var message string

	if err == gorm.ErrRecordNotFound {
		// 没有点赞记录，创建点赞
		err = database.DB.Transaction(func(tx *gorm.DB) error {
			// 创建点赞记录
			like := models.BlogLike{
				BlogID: blogID,
				IP:     clientIP,
			}
			if err := tx.Create(&like).Error; err != nil {
				return err
			}

			// 增加博客点赞数
			return tx.Model(&models.Blog{}).Where("id = ?", blogID).
				UpdateColumn("likes_count", gorm.Expr("likes_count + 1")).Error
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "点赞失败",
			})
			return
		}

		isLiked = true
		message = "点赞成功"
	} else if err == nil {
		// 已有点赞记录，取消点赞
		err = database.DB.Transaction(func(tx *gorm.DB) error {
			// 删除点赞记录
			if err := tx.Delete(&existingLike).Error; err != nil {
				return err
			}

			// 减少博客点赞数
			return tx.Model(&models.Blog{}).Where("id = ?", blogID).
				UpdateColumn("likes_count", gorm.Expr("likes_count - 1")).Error
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "取消点赞失败",
			})
			return
		}

		isLiked = false
		message = "取消点赞成功"
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询点赞状态失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  message,
		"is_liked": isLiked,
	})
}