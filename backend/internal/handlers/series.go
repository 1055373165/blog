package handlers

import (
	"net/http"
	"strconv"

	"blog-backend/internal/database"
	"blog-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSeries 获取所有系列
func GetSeries(c *gin.Context) {
	var series []models.Series
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	
	// 分页查询
	var total int64
	if err := database.DB.Model(&models.Series{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列总数失败: " + err.Error(),
		})
		return
	}
	
	offset := (page - 1) * limit
	if err := database.DB.Offset(offset).Limit(limit).Find(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列列表失败: " + err.Error(),
		})
		return
	}

	// 为每个系列计算文章数量
	for i := range series {
		var articleCount int64
		database.DB.Model(&models.Article{}).Where("series_id = ? AND is_published = ?", series[i].ID, true).Count(&articleCount)
		series[i].ArticlesCount = int(articleCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"series": series,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetSeries 根据ID获取系列
func GetSeriesById(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的系列ID",
		})
		return
	}

	var series models.Series
	if err := database.DB.Where("id = ?", id).First(&series).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "系列不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列失败",
		})
		return
	}

	// 计算文章数量
	var articleCount int64
	database.DB.Model(&models.Article{}).Where("series_id = ? AND is_published = ?", series.ID, true).Count(&articleCount)
	series.ArticlesCount = int(articleCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    series,
	})
}

// GetSeriesBySlug 根据slug获取系列
func GetSeriesBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var series models.Series
	if err := database.DB.Where("slug = ?", slug).First(&series).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "系列不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列失败",
		})
		return
	}

	// 计算文章数量
	var articleCount int64
	database.DB.Model(&models.Article{}).Where("series_id = ? AND is_published = ?", series.ID, true).Count(&articleCount)
	series.ArticlesCount = int(articleCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    series,
	})
}

// GetArticlesBySeries 获取系列下的文章
func GetArticlesBySeries(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的系列ID",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	var articles []models.Article
	
	query := database.DB.Where("series_id = ? AND is_published = ?", id, true).
		Preload("Author").
		Preload("Category").
		Preload("Series").
		Preload("Tags")

	// 按系列顺序排序，如果没有设置顺序则按创建时间排序
	query = query.Order("COALESCE(series_order, 999999), created_at ASC")

	// 分页查询
	var total int64
	database.DB.Model(&models.Article{}).Where("series_id = ? AND is_published = ?", id, true).Count(&total)
	
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列文章失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"articles": articles,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetArticlesBySeriesSlug 根据系列slug获取文章
func GetArticlesBySeriesSlug(c *gin.Context) {
	slug := c.Param("slug")

	// 先获取系列
	var series models.Series
	if err := database.DB.Where("slug = ?", slug).First(&series).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "系列不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列失败",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	var articles []models.Article
	
	query := database.DB.Where("series_id = ? AND is_published = ?", series.ID, true).
		Preload("Author").
		Preload("Category").
		Preload("Series").
		Preload("Tags")

	// 按系列顺序排序
	query = query.Order("COALESCE(series_order, 999999), created_at ASC")

	// 分页查询
	var total int64
	database.DB.Model(&models.Article{}).Where("series_id = ? AND is_published = ?", series.ID, true).Count(&total)
	
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&articles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列文章失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"series": series,
			"articles": articles,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// CreateSeries 创建系列 (需要管理员权限)
func CreateSeries(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Slug        string `json:"slug" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数无效",
		})
		return
	}

	series := models.Series{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
	}

	if err := database.DB.Create(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建系列失败",
		})
		return
	}

	c.JSON(http.StatusCreated, series)
}

// UpdateSeries 更新系列 (需要管理员权限)
func UpdateSeries(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的系列ID",
		})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数无效",
		})
		return
	}

	var series models.Series
	if err := database.DB.First(&series, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "系列不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列失败",
		})
		return
	}

	// 更新字段
	if req.Name != "" {
		series.Name = req.Name
	}
	if req.Slug != "" {
		series.Slug = req.Slug
	}
	if req.Description != "" {
		series.Description = req.Description
	}

	if err := database.DB.Save(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新系列失败",
		})
		return
	}

	c.JSON(http.StatusOK, series)
}

// DeleteSeries 删除系列 (需要管理员权限)
func DeleteSeries(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的系列ID",
		})
		return
	}

	// 检查系列是否存在
	var series models.Series
	if err := database.DB.First(&series, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "系列不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取系列失败",
		})
		return
	}

	// 删除系列 (文章的series_id会变为NULL)
	if err := database.DB.Delete(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "删除系列失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "系列删除成功",
	})
}