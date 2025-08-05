package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

// CreateTagRequest 创建标签请求结构
type CreateTagRequest struct {
	Name  string `json:"name" binding:"required"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

// UpdateTagRequest 更新标签请求结构
type UpdateTagRequest struct {
	Name  *string `json:"name"`
	Slug  *string `json:"slug"`
	Color *string `json:"color"`
}

// GetTags 获取标签列表
func GetTags(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// 构建查询
	query := database.DB.Model(&models.Tag{})

	// 搜索条件
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	// 排序
	allowedSortFields := map[string]bool{
		"name":           true,
		"created_at":     true,
		"updated_at":     true,
		"articles_count": false, // 这个字段不在数据库中，需要特殊处理
	}

	if sortBy == "articles_count" {
		// 按文章数量排序需要特殊处理
		query = query.Select("tags.*, COUNT(article_tags.article_id) as articles_count").
			Joins("LEFT JOIN article_tags ON article_tags.tag_id = tags.id").
			Joins("LEFT JOIN articles ON articles.id = article_tags.article_id AND articles.is_published = true").
			Group("tags.id")
		
		if sortOrder == "desc" {
			query = query.Order("articles_count DESC, tags.created_at DESC")
		} else {
			query = query.Order("articles_count ASC, tags.created_at ASC")
		}
	} else {
		if !allowedSortFields[sortBy] {
			sortBy = "created_at"
		}
		if sortOrder != "asc" && sortOrder != "desc" {
			sortOrder = "desc"
		}
		orderBy := sortBy + " " + sortOrder
		query = query.Order(orderBy)
	}

	// 计算总数
	var total int64
	countQuery := database.DB.Model(&models.Tag{})
	if search != "" {
		countQuery = countQuery.Where("name ILIKE ?", "%"+search+"%")
	}
	countQuery.Count(&total)

	// 分页
	offset := (page - 1) * limit
	var tags []models.Tag
	err := query.Offset(offset).Limit(limit).Find(&tags).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签列表失败",
		})
		return
	}

	// 为每个标签计算文章数量
	for i := range tags {
		var articleCount int64
		database.DB.Model(&models.Article{}).
			Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ? AND articles.is_published = ?", tags[i].ID, true).
			Count(&articleCount)
		tags[i].ArticlesCount = int(articleCount)
	}

	// 计算总页数
	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tags": tags,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetPopularTags 获取热门标签
func GetPopularTags(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 50 {
		limit = 20
	}

	var tags []models.Tag
	err := database.DB.Select("tags.*, COUNT(article_tags.article_id) as articles_count").
		Joins("LEFT JOIN article_tags ON article_tags.tag_id = tags.id").
		Joins("LEFT JOIN articles ON articles.id = article_tags.article_id AND articles.is_published = true").
		Group("tags.id").
		Having("COUNT(article_tags.article_id) > 0").
		Order("articles_count DESC, tags.created_at DESC").
		Limit(limit).
		Find(&tags).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询热门标签失败",
		})
		return
	}

	// 手动计算文章数量（确保准确性）
	for i := range tags {
		var articleCount int64
		database.DB.Model(&models.Article{}).
			Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ? AND articles.is_published = ?", tags[i].ID, true).
			Count(&articleCount)
		tags[i].ArticlesCount = int(articleCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tags,
	})
}

// GetTag 获取单个标签
func GetTag(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "标签ID无效",
		})
		return
	}

	var tag models.Tag
	err = database.DB.First(&tag, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签失败",
		})
		return
	}

	// 计算文章数量
	var articleCount int64
	database.DB.Model(&models.Article{}).
		Joins("JOIN article_tags ON article_tags.article_id = articles.id").
		Where("article_tags.tag_id = ? AND articles.is_published = ?", tag.ID, true).
		Count(&articleCount)
	tag.ArticlesCount = int(articleCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tag,
	})
}

// GetTagBySlug 根据slug获取标签
func GetTagBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "标签slug不能为空",
		})
		return
	}

	var tag models.Tag
	err := database.DB.Where("slug = ?", slug).First(&tag).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签失败",
		})
		return
	}

	// 计算文章数量
	var articleCount int64
	database.DB.Model(&models.Article{}).
		Joins("JOIN article_tags ON article_tags.article_id = articles.id").
		Where("article_tags.tag_id = ? AND articles.is_published = ?", tag.ID, true).
		Count(&articleCount)
	tag.ArticlesCount = int(articleCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tag,
	})
}

// CreateTag 创建标签
func CreateTag(c *gin.Context) {
	// 权限检查：只有管理员可以创建标签
	isAdmin, exists := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	var req CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 生成slug（如果没有提供）
	slug := req.Slug
	if slug == "" {
		slug = utils.GenerateSlug(req.Name)
	}

	// 验证slug格式
	if !utils.ValidateSlug(slug) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "slug格式无效，只能包含小写字母、数字和连字符",
		})
		return
	}

	// 检查名称是否已存在
	var existingTag models.Tag
	err := database.DB.Where("name = ?", req.Name).First(&existingTag).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "标签名称已存在",
		})
		return
	}

	// 检查slug是否已存在
	err = database.DB.Where("slug = ?", slug).First(&existingTag).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "标签slug已存在",
		})
		return
	}

	// 验证颜色格式（如果提供）
	color := req.Color
	if color != "" {
		if !isValidHexColor(color) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "颜色格式无效，请使用十六进制格式（如 #FF0000）",
			})
			return
		}
	}

	// 创建标签
	tag := models.Tag{
		Name:  req.Name,
		Slug:  slug,
		Color: color,
	}

	err = database.DB.Create(&tag).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建标签失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "标签创建成功",
		"data":    tag,
	})
}

// UpdateTag 更新标签
func UpdateTag(c *gin.Context) {
	// 权限检查：只有管理员可以更新标签
	isAdmin, exists := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "标签ID无效",
		})
		return
	}

	var req UpdateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 查找标签
	var tag models.Tag
	err = database.DB.First(&tag, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签失败",
		})
		return
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Name != nil {
		// 检查名称是否已被其他标签使用
		var existingTag models.Tag
		err = database.DB.Where("name = ? AND id != ?", *req.Name, tag.ID).First(&existingTag).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "标签名称已存在",
			})
			return
		}
		updates["name"] = *req.Name
	}

	if req.Slug != nil {
		// 验证slug格式
		if !utils.ValidateSlug(*req.Slug) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "slug格式无效，只能包含小写字母、数字和连字符",
			})
			return
		}

		// 检查slug是否已被其他标签使用
		var existingTag models.Tag
		err = database.DB.Where("slug = ? AND id != ?", *req.Slug, tag.ID).First(&existingTag).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "标签slug已存在",
			})
			return
		}
		updates["slug"] = *req.Slug
	}

	if req.Color != nil {
		// 验证颜色格式
		if *req.Color != "" && !isValidHexColor(*req.Color) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "颜色格式无效，请使用十六进制格式（如 #FF0000）",
			})
			return
		}
		updates["color"] = *req.Color
	}

	// 执行更新
	if len(updates) > 0 {
		err = database.DB.Model(&tag).Updates(updates).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新标签失败",
			})
			return
		}
	}

	// 重新查询标签
	err = database.DB.First(&tag, tag.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询更新后的标签失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "标签更新成功",
		"data":    tag,
	})
}

// DeleteTag 删除标签
func DeleteTag(c *gin.Context) {
	// 权限检查：只有管理员可以删除标签
	isAdmin, exists := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "标签ID无效",
		})
		return
	}

	// 查找标签
	var tag models.Tag
	err = database.DB.First(&tag, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签失败",
		})
		return
	}

	// 检查是否有文章使用此标签
	var articleCount int64
	database.DB.Model(&models.Article{}).
		Joins("JOIN article_tags ON article_tags.article_id = articles.id").
		Where("article_tags.tag_id = ?", tag.ID).
		Count(&articleCount)

	if articleCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "该标签下还有文章，请先移除相关文章的标签关联",
		})
		return
	}

	// 开始事务
	tx := database.DB.Begin()

	// 删除标签关联（虽然上面检查了没有文章，但为了保险）
	err = tx.Exec("DELETE FROM article_tags WHERE tag_id = ?", tag.ID).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除标签关联失败",
		})
		return
	}

	// 删除标签
	err = tx.Delete(&tag).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除标签失败",
		})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "标签删除成功",
	})
}

// GetArticlesByTag 获取标签下的文章
func GetArticlesByTag(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "标签ID无效",
		})
		return
	}

	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// 检查标签是否存在
	var tag models.Tag
	err = database.DB.First(&tag, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "标签不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询标签失败",
		})
		return
	}

	// 构建查询
	query := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Joins("JOIN article_tags ON article_tags.article_id = articles.id").
		Where("article_tags.tag_id = ? AND articles.is_published = ?", tag.ID, true)

	// 排序
	allowedSortFields := map[string]bool{
		"created_at":    true,
		"updated_at":    true,
		"published_at":  true,
		"title":         true,
		"views_count":   true,
		"likes_count":   true,
		"reading_time":  true,
	}
	if !allowedSortFields[sortBy] {
		sortBy = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	orderBy := "articles." + sortBy + " " + sortOrder
	query = query.Order(orderBy)

	// 计算总数
	var total int64
	query.Count(&total)

	// 分页
	offset := (page - 1) * limit
	var articles []models.Article
	err = query.Offset(offset).Limit(limit).Find(&articles).Error
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
			"tag":      tag,
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

// SearchTags 搜索标签
func SearchTags(c *gin.Context) {
	query := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if limit < 1 || limit > 50 {
		limit = 10
	}

	var tags []models.Tag
	dbQuery := database.DB.Model(&models.Tag{})

	if query != "" {
		dbQuery = dbQuery.Where("name ILIKE ?", "%"+query+"%")
	}

	err := dbQuery.Order("name ASC").Limit(limit).Find(&tags).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "搜索标签失败",
		})
		return
	}

	// 为每个标签计算文章数量
	for i := range tags {
		var articleCount int64
		database.DB.Model(&models.Article{}).
			Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ? AND articles.is_published = ?", tags[i].ID, true).
			Count(&articleCount)
		tags[i].ArticlesCount = int(articleCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tags,
	})
}

// isValidHexColor 验证十六进制颜色格式
func isValidHexColor(color string) bool {
	if len(color) != 7 {
		return false
	}
	if color[0] != '#' {
		return false
	}
	for i := 1; i < 7; i++ {
		c := color[i]
		if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f')) {
			return false
		}
	}
	return true
}