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

// CreateCategoryRequest 创建分类请求结构
type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	ParentID    *uint  `json:"parent_id"`
}

// UpdateCategoryRequest 更新分类请求结构
type UpdateCategoryRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	ParentID    *uint   `json:"parent_id"`
}

// GetCategories 获取分类列表
func GetCategories(c *gin.Context) {
	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	parentID := c.Query("parent_id")
	includeChildren := c.DefaultQuery("include_children", "true") == "true"

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// 构建查询
	query := database.DB.Model(&models.Category{})

	// 父分类筛选
	if parentID != "" {
		if parentID == "null" || parentID == "0" {
			query = query.Where("parent_id IS NULL")
		} else {
			query = query.Where("parent_id = ?", parentID)
		}
	}

	// 预加载关联数据
	if includeChildren {
		query = query.Preload("Children").Preload("Parent")
	} else {
		query = query.Preload("Parent")
	}

	// 计算总数
	var total int64
	query.Count(&total)

	// 分页查询
	offset := (page - 1) * limit
	var categories []models.Category
	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&categories).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类列表失败",
		})
		return
	}

	// 为每个分类计算文章数量
	for i := range categories {
		var articleCount int64
		database.DB.Model(&models.Article{}).
			Where("category_id = ? AND is_published = ?", categories[i].ID, true).
			Count(&articleCount)
		categories[i].ArticlesCount = int(articleCount)
	}

	// 计算总页数
	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"categories": categories,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetCategoryTree 获取分类树结构
func GetCategoryTree(c *gin.Context) {
	// 获取所有顶级分类
	var categories []models.Category
	err := database.DB.Where("parent_id IS NULL").
		Preload("Children").
		Order("created_at ASC").
		Find(&categories).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类树失败",
		})
		return
	}

	// 递归加载子分类的子分类
	for i := range categories {
		loadChildrenRecursively(&categories[i])
		// 计算文章数量（包括子分类）
		categories[i].ArticlesCount = calculateCategoryArticleCount(categories[i].ID, true)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    categories,
	})
}

// loadChildrenRecursively 递归加载子分类
func loadChildrenRecursively(category *models.Category) {
	for i := range category.Children {
		// 加载孙分类
		database.DB.Where("parent_id = ?", category.Children[i].ID).
			Find(&category.Children[i].Children)
		
		// 递归处理
		if len(category.Children[i].Children) > 0 {
			loadChildrenRecursively(&category.Children[i])
		}
		
		// 计算文章数量
		category.Children[i].ArticlesCount = calculateCategoryArticleCount(category.Children[i].ID, false)
	}
}

// calculateCategoryArticleCount 计算分类文章数量
func calculateCategoryArticleCount(categoryID uint, includeChildren bool) int {
	var count int64
	
	if includeChildren {
		// 获取所有子分类ID
		var childIDs []uint
		getAllChildCategoryIDs(categoryID, &childIDs)
		childIDs = append(childIDs, categoryID)
		
		database.DB.Model(&models.Article{}).
			Where("category_id IN ? AND is_published = ?", childIDs, true).
			Count(&count)
	} else {
		database.DB.Model(&models.Article{}).
			Where("category_id = ? AND is_published = ?", categoryID, true).
			Count(&count)
	}
	
	return int(count)
}

// getAllChildCategoryIDs 递归获取所有子分类ID
func getAllChildCategoryIDs(parentID uint, childIDs *[]uint) {
	var children []models.Category
	database.DB.Where("parent_id = ?", parentID).Find(&children)
	
	for _, child := range children {
		*childIDs = append(*childIDs, child.ID)
		getAllChildCategoryIDs(child.ID, childIDs)
	}
}

// GetCategory 获取单个分类
func GetCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "分类ID无效",
		})
		return
	}

	var category models.Category
	err = database.DB.Preload("Parent").
		Preload("Children").
		First(&category, uint(id)).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "分类不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类失败",
		})
		return
	}

	// 计算文章数量
	category.ArticlesCount = calculateCategoryArticleCount(category.ID, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    category,
	})
}

// GetCategoryBySlug 根据slug获取分类
func GetCategoryBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "分类slug不能为空",
		})
		return
	}

	var category models.Category
	err := database.DB.Preload("Parent").
		Preload("Children").
		Where("slug = ?", slug).
		First(&category).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "分类不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类失败",
		})
		return
	}

	// 计算文章数量
	category.ArticlesCount = calculateCategoryArticleCount(category.ID, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    category,
	})
}

// CreateCategory 创建分类
func CreateCategory(c *gin.Context) {
	// 权限检查：只有管理员可以创建分类
	isAdmin, exists := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	var req CreateCategoryRequest
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

	// 检查slug是否已存在
	var existingCategory models.Category
	err := database.DB.Where("slug = ?", slug).First(&existingCategory).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "分类slug已存在",
		})
		return
	}

	// 如果指定了父分类，检查父分类是否存在
	if req.ParentID != nil {
		var parentCategory models.Category
		err = database.DB.First(&parentCategory, *req.ParentID).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"error":   "父分类不存在",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "查询父分类失败",
			})
			return
		}
	}

	// 创建分类
	category := models.Category{
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		ParentID:    req.ParentID,
	}

	err = database.DB.Create(&category).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建分类失败",
		})
		return
	}

	// 重新查询分类（包含关联数据）
	err = database.DB.Preload("Parent").
		Preload("Children").
		First(&category, category.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询创建的分类失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "分类创建成功",
		"data":    category,
	})
}

// UpdateCategory 更新分类
func UpdateCategory(c *gin.Context) {
	// 权限检查：只有管理员可以更新分类
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
			"error":   "分类ID无效",
		})
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 查找分类
	var category models.Category
	err = database.DB.First(&category, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "分类不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类失败",
		})
		return
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Name != nil {
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

		// 检查slug是否已被其他分类使用
		var existingCategory models.Category
		err = database.DB.Where("slug = ? AND id != ?", *req.Slug, category.ID).First(&existingCategory).Error
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "分类slug已存在",
			})
			return
		}

		updates["slug"] = *req.Slug
	}

	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if req.ParentID != nil {
		// 检查是否形成循环引用
		if *req.ParentID == category.ID {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "不能将分类设置为自己的父分类",
			})
			return
		}

		// 检查父分类是否存在
		var parentCategory models.Category
		err = database.DB.First(&parentCategory, *req.ParentID).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"error":   "父分类不存在",
				})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "查询父分类失败",
			})
			return
		}

		// 检查是否会形成循环引用（父分类不能是当前分类的子分类）
		if isDescendant(category.ID, *req.ParentID) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "不能将分类设置为其子分类的父分类",
			})
			return
		}

		updates["parent_id"] = *req.ParentID
	}

	// 执行更新
	if len(updates) > 0 {
		err = database.DB.Model(&category).Updates(updates).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新分类失败",
			})
			return
		}
	}

	// 重新查询分类（包含关联数据）
	err = database.DB.Preload("Parent").
		Preload("Children").
		First(&category, category.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询更新后的分类失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "分类更新成功",
		"data":    category,
	})
}

// isDescendant 检查targetID是否是ancestorID的子孙分类
func isDescendant(ancestorID, targetID uint) bool {
	var children []models.Category
	database.DB.Where("parent_id = ?", ancestorID).Find(&children)

	for _, child := range children {
		if child.ID == targetID {
			return true
		}
		if isDescendant(child.ID, targetID) {
			return true
		}
	}

	return false
}

// DeleteCategory 删除分类
func DeleteCategory(c *gin.Context) {
	// 权限检查：只有管理员可以删除分类
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
			"error":   "分类ID无效",
		})
		return
	}

	// 查找分类
	var category models.Category
	err = database.DB.First(&category, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "分类不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类失败",
		})
		return
	}

	// 检查是否有子分类
	var childCount int64
	database.DB.Model(&models.Category{}).Where("parent_id = ?", category.ID).Count(&childCount)
	if childCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "该分类下还有子分类，请先删除子分类",
		})
		return
	}

	// 检查是否有文章
	var articleCount int64
	database.DB.Model(&models.Article{}).Where("category_id = ?", category.ID).Count(&articleCount)
	if articleCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "该分类下还有文章，请先移动或删除相关文章",
		})
		return
	}

	// 删除分类
	err = database.DB.Delete(&category).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除分类失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "分类删除成功",
	})
}

// GetArticlesByCategory 获取分类下的文章
func GetArticlesByCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "分类ID无效",
		})
		return
	}

	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	includeChildren := c.DefaultQuery("include_children", "false") == "true"

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// 检查分类是否存在
	var category models.Category
	err = database.DB.First(&category, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "分类不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询分类失败",
		})
		return
	}

	// 构建查询
	query := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Preload("Series").
		Where("is_published = ?", true)

	// 分类筛选
	if includeChildren {
		// 获取所有子分类ID
		var categoryIDs []uint
		getAllChildCategoryIDs(category.ID, &categoryIDs)
		categoryIDs = append(categoryIDs, category.ID)
		query = query.Where("category_id IN ?", categoryIDs)
	} else {
		query = query.Where("category_id = ?", category.ID)
	}

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

	orderBy := sortBy + " " + sortOrder
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
			"category":   category,
			"articles":   articles,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}