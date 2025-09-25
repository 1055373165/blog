package handlers

import (
	"fmt"
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

// CreateSubmissionRequest 创建投稿请求结构
type CreateSubmissionRequest struct {
	Title           string   `json:"title" binding:"required,min=1,max=255"`
	Content         string   `json:"content" binding:"required"`
	Excerpt         string   `json:"excerpt"`
	CoverImage      string   `json:"cover_image"`
	Type            string   `json:"type" binding:"required,oneof=article blog"`
	Status          string   `json:"status" binding:"omitempty,oneof=draft submitted"`
	CategoryID      *uint    `json:"category_id"`
	SeriesID        *uint    `json:"series_id"`
	TagIDs          []uint   `json:"tag_ids"`
	MetaTitle       string   `json:"meta_title"`
	MetaDescription string   `json:"meta_description"`
	MetaKeywords    string   `json:"meta_keywords"`
}

// UpdateSubmissionRequest 更新投稿请求结构
type UpdateSubmissionRequest struct {
	Title           string   `json:"title,omitempty"`
	Content         string   `json:"content,omitempty"`
	Excerpt         string   `json:"excerpt,omitempty"`
	CoverImage      string   `json:"cover_image,omitempty"`
	Status          string   `json:"status,omitempty" binding:"omitempty,oneof=draft submitted"`
	CategoryID      *uint    `json:"category_id,omitempty"`
	SeriesID        *uint    `json:"series_id,omitempty"`
	TagIDs          []uint   `json:"tag_ids,omitempty"`
	MetaTitle       string   `json:"meta_title,omitempty"`
	MetaDescription string   `json:"meta_description,omitempty"`
	MetaKeywords    string   `json:"meta_keywords,omitempty"`
}

// ReviewSubmissionRequest 审核投稿请求结构
type ReviewSubmissionRequest struct {
	Status      string `json:"status" binding:"required,oneof=approved rejected"`
	ReviewNotes string `json:"review_notes,omitempty"`
}

// CreateSubmission 创建投稿
func CreateSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	var req CreateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 计算阅读时间（基于内容长度估算）
	readingTime := utils.EstimateReadingTime(req.Content)

	// 确定投稿状态
	status := "draft" // 默认为草稿状态
	if req.Status != "" {
		status = req.Status
	}

	// 创建投稿
	submission := models.Submission{
		Title:           req.Title,
		Content:         req.Content,
		Excerpt:         req.Excerpt,
		CoverImage:      req.CoverImage,
		Type:            req.Type,
		Status:          status,
		AuthorID:        userID,
		CategoryID:      req.CategoryID,
		SeriesID:        req.SeriesID,
		ReadingTime:     readingTime,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		MetaKeywords:    req.MetaKeywords,
	}

	err := database.DB.Create(&submission).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "投稿创建失败",
		})
		return
	}

	// 关联标签
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		err = database.DB.Where("id IN ?", req.TagIDs).Find(&tags).Error
		if err == nil {
			database.DB.Model(&submission).Association("Tags").Replace(tags)
		}
	}

	// 重新查询完整数据
	err = database.DB.Preload("Author").Preload("Category").Preload("Series").Preload("Tags").First(&submission, submission.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿详情失败",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "投稿创建成功",
		"data":    submission,
	})
}

// GetMySubmissions 获取我的投稿列表
func GetMySubmissions(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	submissionType := c.Query("type")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// 构建查询
	query := database.DB.Model(&models.Submission{}).Where("author_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if submissionType != "" {
		query = query.Where("type = ?", submissionType)
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 获取投稿列表
	var submissions []models.Submission
	err := query.Preload("Category").Preload("Series").Preload("Tags").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&submissions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"submissions": submissions,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetSubmission 获取投稿详情
func GetSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var submission models.Submission
	err = database.DB.Preload("Author").Preload("Category").Preload("Series").Preload("Tags").Preload("Reviewer").
		First(&submission, uint(id)).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查权限：只有作者本人或管理员可以查看
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if submission.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "无权访问该投稿",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    submission,
	})
}

// UpdateSubmission 更新投稿
func UpdateSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var submission models.Submission
	err = database.DB.First(&submission, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查权限：只有作者本人可以更新
	if submission.AuthorID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "无权修改该投稿",
		})
		return
	}

	// 检查状态：只有草稿状态或被拒绝的投稿可以修改
	if submission.Status != "draft" && submission.Status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "该投稿当前状态不允许修改",
		})
		return
	}

	var req UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Content != "" {
		updates["content"] = req.Content
		updates["reading_time"] = utils.EstimateReadingTime(req.Content)
	}
	if req.Excerpt != "" {
		updates["excerpt"] = req.Excerpt
	}
	if req.CoverImage != "" {
		updates["cover_image"] = req.CoverImage
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.CategoryID != nil {
		updates["category_id"] = req.CategoryID
	}
	if req.SeriesID != nil {
		updates["series_id"] = req.SeriesID
	}
	if req.MetaTitle != "" {
		updates["meta_title"] = req.MetaTitle
	}
	if req.MetaDescription != "" {
		updates["meta_description"] = req.MetaDescription
	}
	if req.MetaKeywords != "" {
		updates["meta_keywords"] = req.MetaKeywords
	}

	// 如果被拒绝的投稿被修改，重置为草稿状态
	if submission.Status == "rejected" && len(updates) > 0 {
		updates["status"] = "draft"
		updates["reviewed_at"] = nil
		updates["review_notes"] = ""
		updates["reviewer_id"] = nil
	}

	// 执行更新
	if len(updates) > 0 {
		err = database.DB.Model(&submission).Updates(updates).Error
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "更新投稿失败",
			})
			return
		}
	}

	// 更新标签关联
	if req.TagIDs != nil {
		var tags []models.Tag
		err = database.DB.Where("id IN ?", req.TagIDs).Find(&tags).Error
		if err == nil {
			database.DB.Model(&submission).Association("Tags").Replace(tags)
		}
	}

	// 重新查询完整数据
	err = database.DB.Preload("Author").Preload("Category").Preload("Series").Preload("Tags").First(&submission, submission.ID).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿详情失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "投稿更新成功",
		"data":    submission,
	})
}

// SubmitSubmission 提交投稿（从草稿变为待审核）
func SubmitSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var submission models.Submission
	err = database.DB.First(&submission, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查权限
	if submission.AuthorID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "无权操作该投稿",
		})
		return
	}

	// 检查状态
	if submission.Status != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "只有草稿状态的投稿可以提交审核",
		})
		return
	}

	// 更新状态
	now := time.Now()
	err = database.DB.Model(&submission).Updates(map[string]interface{}{
		"status":       "submitted",
		"submitted_at": &now,
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "提交投稿失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "投稿提交成功，等待管理员审核",
	})
}

// DeleteSubmission 删除投稿
func DeleteSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var submission models.Submission
	err = database.DB.First(&submission, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查权限
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if submission.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "无权删除该投稿",
		})
		return
	}

	// 检查状态：已发布的投稿不能删除
	if submission.Status == "published" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "已发布的投稿不能删除",
		})
		return
	}

	// 软删除
	err = database.DB.Delete(&submission).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除投稿失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "投稿删除成功",
	})
}

// 管理员相关API

// GetAllSubmissions 获取所有投稿（管理员）
func GetAllSubmissions(c *gin.Context) {
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.Query("status")
	submissionType := c.Query("type")
	search := strings.TrimSpace(c.Query("search"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// 构建查询
	query := database.DB.Model(&models.Submission{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if submissionType != "" {
		query = query.Where("type = ?", submissionType)
	}

	if search != "" {
		query = query.Where("title LIKE ? OR content LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 获取投稿列表
	var submissions []models.Submission
	err := query.Preload("Author").Preload("Category").Preload("Series").Preload("Tags").Preload("Reviewer").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&submissions).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿列表失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"submissions": submissions,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// ReviewSubmission 审核投稿（管理员）
func ReviewSubmission(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var req ReviewSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	// Debug logging
	fmt.Printf("Review request: Status=%s, ReviewNotes=%s\n", req.Status, req.ReviewNotes)

	var submission models.Submission
	err = database.DB.First(&submission, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查状态
	if submission.Status != "submitted" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("只有已提交的投稿可以审核，当前状态: %s", submission.Status),
		})
		return
	}

	// 更新审核状态
	now := time.Now()
	err = database.DB.Model(&submission).Updates(map[string]interface{}{
		"status":       req.Status,
		"review_notes": req.ReviewNotes,
		"reviewer_id":  userID,
		"reviewed_at":  &now,
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "审核投稿失败",
		})
		return
	}

	message := "投稿审核完成"
	if req.Status == "approved" {
		message = "投稿审核通过"
	} else if req.Status == "rejected" {
		message = "投稿已拒绝"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
	})
}

// PublishSubmission 发布投稿为正式文章（管理员）
func PublishSubmission(c *gin.Context) {
	_, exists := middleware.GetCurrentUserID(c)
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if !exists || !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "需要管理员权限",
		})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "无效的投稿ID",
		})
		return
	}

	var submission models.Submission
	err = database.DB.Preload("Tags").First(&submission, uint(id)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "投稿不存在",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询投稿失败",
		})
		return
	}

	// 检查状态
	if submission.Status != "approved" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "只有已审核通过的投稿可以发布",
		})
		return
	}

	// 生成slug
	slug := utils.GenerateSlug(submission.Title)

	// 开始事务
	tx := database.DB.Begin()

	// 创建文章
	now := time.Now()
	article := models.Article{
		Title:           submission.Title,
		Slug:            slug,
		Content:         submission.Content,
		Excerpt:         submission.Excerpt,
		CoverImage:      submission.CoverImage,
		IsPublished:     true,
		IsDraft:         false,
		PublishedAt:     &now,
		ReadingTime:     submission.ReadingTime,
		AuthorID:        submission.AuthorID,
		CategoryID:      submission.CategoryID,
		SeriesID:        submission.SeriesID,
		SubmissionID:    &submission.ID,
		MetaTitle:       submission.MetaTitle,
		MetaDescription: submission.MetaDescription,
		MetaKeywords:    submission.MetaKeywords,
	}

	err = tx.Create(&article).Error
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建文章失败",
		})
		return
	}

	// 复制标签关联
	if len(submission.Tags) > 0 {
		err = tx.Model(&article).Association("Tags").Replace(submission.Tags)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "关联标签失败",
			})
			return
		}
	}

	// 更新投稿状态为已发布
	err = tx.Model(&submission).Updates(map[string]interface{}{
		"status": "published",
	}).Error

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新投稿状态失败",
		})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "投稿发布成功",
		"data": gin.H{
			"article_id": article.ID,
			"article_slug": article.Slug,
		},
	})
}