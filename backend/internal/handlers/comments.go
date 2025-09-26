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

// CreateCommentRequest 创建评论请求结构
type CreateCommentRequest struct {
	Content   string `json:"content" binding:"required"`
	ArticleID uint   `json:"article_id" binding:"required"`
	ParentID  *uint  `json:"parent_id"`
}

// CommentResponse 评论响应结构
type CommentResponse struct {
	ID            uint              `json:"id"`
	Content       string            `json:"content"`
	IsApproved    bool              `json:"is_approved"`
	LikesCount    int               `json:"likes_count"`
	RepliesCount  int               `json:"replies_count"`
	IsLiked       bool              `json:"is_liked,omitempty"`
	ArticleID     uint              `json:"article_id"`
	AuthorID      uint              `json:"author_id"`
	ParentID      *uint             `json:"parent_id"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
	Author        models.User       `json:"author"`
	Replies       []CommentResponse `json:"replies,omitempty"`
	Depth         int               `json:"depth,omitempty"`
}

// CommentsResponse 评论列表响应结构
type CommentsResponse struct {
	Comments   []CommentResponse `json:"comments"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	PageSize   int               `json:"page_size"`
	HasMore    bool              `json:"has_more"`
	TotalPages int               `json:"total_pages"`
}

// GetComments 获取文章评论列表
func GetComments(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	// 查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	sortBy := c.DefaultQuery("sort_by", "newest")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	// 验证文章是否存在
	var article models.Article
	if err := database.DB.First(&article, articleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find article"})
		}
		return
	}

	// 获取客户端IP用于检查点赞状态
	clientIP := utils.GetClientIP(c)

	// 构建查询
	db := database.DB.Where("article_id = ? AND parent_id IS NULL", articleID)

	// 排序
	switch sortBy {
	case "oldest":
		db = db.Order("created_at ASC")
	case "most_liked":
		db = db.Order("likes_count DESC, created_at DESC")
	default: // newest
		db = db.Order("created_at DESC")
	}

	// 获取总数
	var total int64
	if err := db.Model(&models.Comment{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count comments"})
		return
	}

	// 分页查询
	offset := (page - 1) * pageSize
	var comments []models.Comment

	err = db.
		Preload("Author").
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC").Preload("Author")
		}).
		Preload("Replies.Replies", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC").Preload("Author")
		}).
		Offset(offset).
		Limit(pageSize).
		Find(&comments).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	// 构建响应数据
	responseComments := make([]CommentResponse, 0, len(comments))
	for _, comment := range comments {
		// 检查用户是否已点赞
		var isLiked bool
		var likeCount int64
		database.DB.Model(&models.CommentLike{}).
			Where("comment_id = ? AND ip = ?", comment.ID, clientIP).
			Count(&likeCount)
		isLiked = likeCount > 0

		commentResp := buildCommentResponse(comment, clientIP, 0)
		commentResp.IsLiked = isLiked
		responseComments = append(responseComments, commentResp)
	}

	// 计算总页数
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	hasMore := page < totalPages

	response := CommentsResponse{
		Comments:   responseComments,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		HasMore:    hasMore,
		TotalPages: totalPages,
	}

	c.JSON(http.StatusOK, response)
}

// buildCommentResponse 构建评论响应数据（递归处理回复）
func buildCommentResponse(comment models.Comment, clientIP string, depth int) CommentResponse {
	// 检查点赞状态
	var likeCount int64
	database.DB.Model(&models.CommentLike{}).
		Where("comment_id = ? AND ip = ?", comment.ID, clientIP).
		Count(&likeCount)
	isLiked := likeCount > 0

	// 处理回复（限制深度）
	replies := make([]CommentResponse, 0)
	if depth < 3 && len(comment.Replies) > 0 {
		for _, reply := range comment.Replies {
			replyResp := buildCommentResponse(reply, clientIP, depth+1)
			replies = append(replies, replyResp)
		}
	}

	return CommentResponse{
		ID:           comment.ID,
		Content:      comment.Content,
		IsApproved:   comment.IsApproved,
		LikesCount:   comment.LikesCount,
		RepliesCount: comment.RepliesCount,
		IsLiked:      isLiked,
		ArticleID:    comment.ArticleID,
		AuthorID:     comment.AuthorID,
		ParentID:     comment.ParentID,
		CreatedAt:    comment.CreatedAt,
		UpdatedAt:    comment.UpdatedAt,
		Author:       comment.Author,
		Replies:      replies,
		Depth:        depth,
	}
}

// CreateComment 创建评论
func CreateComment(c *gin.Context) {
	articleIDStr := c.Param("id")
	articleID, err := strconv.ParseUint(articleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid article ID"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证文章存在
	var article models.Article
	if err := database.DB.First(&article, articleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Article not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find article"})
		}
		return
	}

	// 验证父评论（如果是回复）
	if req.ParentID != nil {
		var parentComment models.Comment
		if err := database.DB.First(&parentComment, *req.ParentID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent comment not found"})
			return
		}
		// 确保父评论属于同一篇文章
		if parentComment.ArticleID != uint(articleID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Parent comment does not belong to this article"})
			return
		}
	}

	// 内容验证
	content := strings.TrimSpace(req.Content)
	if len(content) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment content too short"})
		return
	}
	if len(content) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Comment content too long"})
		return
	}

	// 获取用户信息 - 优先使用认证用户，否则创建匿名用户
	var user models.User
	
	// 尝试获取当前认证用户（支持可选认证）
	if userID, exists := middleware.TryGetCurrentUserID(c); exists {
		// 使用认证用户
		if err := database.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find authenticated user"})
			return
		}
	} else {
		// 创建或查找匿名用户
		clientIP := utils.GetClientIP(c)
		if err := database.DB.Where("email = ?", "anonymous@"+clientIP).First(&user).Error; err == gorm.ErrRecordNotFound {
			// 创建匿名用户
			user = models.User{
				Email: "anonymous@" + clientIP,
				Name:  "匿名用户",
				Bio:   "匿名评论者",
			}
			if err := database.DB.Create(&user).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create anonymous user"})
				return
			}
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find anonymous user"})
			return
		}
	}

	// 创建评论
	comment := models.Comment{
		Content:    content,
		ArticleID:  uint(articleID),
		AuthorID:   user.ID,
		ParentID:   req.ParentID,
		IsApproved: true, // 暂时自动审核通过
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// 更新父评论的回复计数
	if req.ParentID != nil {
		database.DB.Model(&models.Comment{}).
			Where("id = ?", *req.ParentID).
			UpdateColumn("replies_count", gorm.Expr("replies_count + 1"))
	}

	// 重新查询评论获取完整信息
	if err := database.DB.Preload("Author").First(&comment, comment.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch created comment"})
		return
	}

	// 构建响应
	response := CommentResponse{
		ID:           comment.ID,
		Content:      comment.Content,
		IsApproved:   comment.IsApproved,
		LikesCount:   comment.LikesCount,
		RepliesCount: comment.RepliesCount,
		IsLiked:      false,
		ArticleID:    comment.ArticleID,
		AuthorID:     comment.AuthorID,
		ParentID:     comment.ParentID,
		CreatedAt:    comment.CreatedAt,
		UpdatedAt:    comment.UpdatedAt,
		Author:       comment.Author,
		Replies:      []CommentResponse{},
	}

	c.JSON(http.StatusCreated, response)
}

// ToggleCommentLike 切换评论点赞状态
func ToggleCommentLike(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.ParseUint(commentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	// 验证评论存在
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find comment"})
		}
		return
	}

	clientIP := utils.GetClientIP(c)

	// 检查是否已点赞
	var existingLike models.CommentLike
	err = database.DB.Where("comment_id = ? AND ip = ?", commentID, clientIP).First(&existingLike).Error

	var liked bool
	if err == gorm.ErrRecordNotFound {
		// 创建点赞记录
		like := models.CommentLike{
			CommentID: uint(commentID),
			IP:        clientIP,
		}
		if err := database.DB.Create(&like).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create like"})
			return
		}
		// 增加点赞数
		database.DB.Model(&comment).UpdateColumn("likes_count", gorm.Expr("likes_count + 1"))
		liked = true
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check like status"})
		return
	} else {
		// 删除点赞记录
		if err := database.DB.Delete(&existingLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove like"})
			return
		}
		// 减少点赞数
		database.DB.Model(&comment).Where("likes_count > 0").UpdateColumn("likes_count", gorm.Expr("likes_count - 1"))
		liked = false
	}

	// 获取最新点赞数
	database.DB.First(&comment, commentID)

	c.JSON(http.StatusOK, gin.H{
		"liked":       liked,
		"likes_count": comment.LikesCount,
	})
}

// ReportComment 举报评论
func ReportComment(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.ParseUint(commentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证评论存在
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find comment"})
		}
		return
	}

	// 更新评论举报状态
	updates := map[string]interface{}{
		"is_reported":   true,
		"report_reason": req.Reason,
	}

	if err := database.DB.Model(&comment).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to report comment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Comment reported successfully",
	})
}