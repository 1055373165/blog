package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
)

// DeleteArticle 删除文章
func DeleteArticle(c *gin.Context) {
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

	// 权限检查：只有作者或管理员可以删除
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if article.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "没有权限删除此文章",
		})
		return
	}

	// 开始事务
	tx := database.DB.Begin()

	// 删除文章标签关联
	err = tx.Model(&article).Association("Tags").Clear()
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除文章标签关联失败",
		})
		return
	}

	// 删除文章浏览记录
	err = tx.Where("article_id = ?", article.ID).Delete(&models.ArticleView{}).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除文章浏览记录失败",
		})
		return
	}

	// 删除文章点赞记录
	err = tx.Where("article_id = ?", article.ID).Delete(&models.ArticleLike{}).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除文章点赞记录失败",
		})
		return
	}

	// 删除搜索索引
	err = tx.Where("article_id = ?", article.ID).Delete(&models.SearchIndex{}).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除搜索索引失败",
		})
		return
	}

	// 删除文章
	err = tx.Delete(&article).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除文章失败",
		})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "文章删除成功",
	})
}

// IncrementArticleViews 增加文章浏览量
func IncrementArticleViews(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章ID无效",
		})
		return
	}

	// 获取客户端IP
	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// 检查文章是否存在
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

	// 检查是否在短时间内重复访问（防止刷量）
	var lastView models.ArticleView
	err = database.DB.Where("article_id = ? AND ip = ?", article.ID, clientIP).
		Order("viewed_at DESC").
		First(&lastView).Error

	// 如果同一IP在5分钟内访问过，不增加浏览量
	if err == nil && time.Since(lastView.ViewedAt) < 5*time.Minute {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "浏览记录已存在",
			"data": gin.H{
				"viewsCount": article.ViewsCount,
			},
		})
		return
	}

	// 开始事务
	tx := database.DB.Begin()

	// 增加浏览量
	err = tx.Model(&article).Update("views_count", gorm.Expr("views_count + 1")).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新浏览量失败",
		})
		return
	}

	// 记录浏览日志
	view := models.ArticleView{
		ArticleID: article.ID,
		IP:        clientIP,
		UserAgent: userAgent,
		ViewedAt:  time.Now(),
	}
	err = tx.Create(&view).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "记录浏览日志失败",
		})
		return
	}

	tx.Commit()

	// 返回更新后的浏览量
	article.ViewsCount++
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "浏览量更新成功",
		"data": gin.H{
			"viewsCount": article.ViewsCount,
		},
	})
}

// ToggleArticleLike 切换文章点赞状态
func ToggleArticleLike(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章ID无效",
		})
		return
	}

	// 获取客户端IP
	clientIP := c.ClientIP()

	// 检查文章是否存在
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

	// 检查是否已经点赞
	var existingLike models.ArticleLike
	err = database.DB.Where("article_id = ? AND ip = ?", article.ID, clientIP).First(&existingLike).Error

	// 开始事务
	tx := database.DB.Begin()

	var liked bool
	var newLikesCount int

	if err == gorm.ErrRecordNotFound {
		// 未点赞，添加点赞记录
		like := models.ArticleLike{
			ArticleID: article.ID,
			IP:        clientIP,
			LikedAt:   time.Now(),
		}
		err = tx.Create(&like).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "添加点赞记录失败",
			})
			return
		}

		// 增加点赞数
		err = tx.Model(&article).Update("likes_count", gorm.Expr("likes_count + 1")).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新点赞数失败",
			})
			return
		}

		liked = true
		newLikesCount = article.LikesCount + 1
	} else if err == nil {
		// 已点赞，删除点赞记录
		err = tx.Delete(&existingLike).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "删除点赞记录失败",
			})
			return
		}

		// 减少点赞数
		err = tx.Model(&article).Update("likes_count", gorm.Expr("likes_count - 1")).Error
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新点赞数失败",
			})
			return
		}

		liked = false
		newLikesCount = article.LikesCount - 1
		if newLikesCount < 0 {
			newLikesCount = 0
		}
	} else {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询点赞记录失败",
		})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "点赞状态更新成功",
		"data": gin.H{
			"liked":       liked,
			"likes_count": newLikesCount,
		},
	})
}

// GetRelatedArticles 获取相关文章
func GetRelatedArticles(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文章ID无效",
		})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	if limit < 1 || limit > 20 {
		limit = 5
	}

	// 获取当前文章信息
	var article models.Article
	err = database.DB.Preload("Tags").Preload("Category").First(&article, uint(id)).Error
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

	// 构建相关文章查询
	query := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Where("id != ? AND is_published = ?", article.ID, true)

	// 优先级1: 同系列文章
	var relatedArticles []models.Article
	if article.SeriesID != nil {
		seriesQuery := query.Where("series_id = ?", *article.SeriesID).
			Order("series_order ASC").
			Limit(limit)
		seriesQuery.Find(&relatedArticles)
	}

	// 如果同系列文章不够，查找同分类文章
	if len(relatedArticles) < limit && article.CategoryID != nil {
		remaining := limit - len(relatedArticles)
		var categoryArticles []models.Article
		categoryQuery := query.Where("category_id = ?", *article.CategoryID).
			Order("created_at DESC").
			Limit(remaining)
		categoryQuery.Find(&categoryArticles)
		relatedArticles = append(relatedArticles, categoryArticles...)
	}

	// 如果还不够，查找有共同标签的文章
	if len(relatedArticles) < limit && len(article.Tags) > 0 {
		remaining := limit - len(relatedArticles)
		var tagIDs []uint
		for _, tag := range article.Tags {
			tagIDs = append(tagIDs, tag.ID)
		}

		var tagArticles []models.Article
		tagQuery := database.DB.Model(&models.Article{}).
			Preload("Author").
			Preload("Category").
			Preload("Tags").
			Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("articles.id != ? AND articles.is_published = ? AND article_tags.tag_id IN ?", 
				article.ID, true, tagIDs).
			Group("articles.id").
			Order("COUNT(article_tags.tag_id) DESC, articles.created_at DESC").
			Limit(remaining)
		tagQuery.Find(&tagArticles)
		relatedArticles = append(relatedArticles, tagArticles...)
	}

	// 如果还是不够，查找最新文章
	if len(relatedArticles) < limit {
		remaining := limit - len(relatedArticles)
		var latestArticles []models.Article
		latestQuery := query.Order("created_at DESC").Limit(remaining)
		latestQuery.Find(&latestArticles)
		relatedArticles = append(relatedArticles, latestArticles...)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    relatedArticles,
	})
}

// GetPopularArticles 获取热门文章
func GetPopularArticles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	if limit < 1 || limit > 50 {
		limit = 10
	}
	if days < 1 || days > 365 {
		days = 30
	}

	// 计算时间范围
	since := time.Now().AddDate(0, 0, -days)

	var articles []models.Article
	err := database.DB.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags").
		Where("is_published = ? AND published_at >= ?", true, since).
		Order("views_count DESC, likes_count DESC, created_at DESC").
		Limit(limit).
		Find(&articles).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询热门文章失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    articles,
	})
}