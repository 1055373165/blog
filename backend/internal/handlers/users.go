package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/models"
)

// UserResponse 用户响应结构体，包含统计信息
type UserResponse struct {
	models.User
	ArticlesCount    int `json:"articles_count"`
	SubmissionsCount int `json:"submissions_count"`
	LastLoginAt      *string `json:"last_login_at,omitempty"`
}

// GetUsers 获取用户列表（管理员接口）
func GetUsers(c *gin.Context) {
	// 检查是否为管理员
	currentUser, exists := c.Get("current_user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	user := currentUser.(*models.User)
	if !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// 获取查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	status := c.Query("status")
	role := c.Query("role")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// 构建查询
	db := database.DB
	query := db.Model(&models.User{})

	// 搜索条件
	if search != "" {
		search = "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(email) LIKE ?", search, search)
	}

	// 状态筛选
	switch status {
	case "active":
		query = query.Where("is_active = ?", true)
	case "inactive":
		query = query.Where("is_active = ?", false)
	}

	// 角色筛选
	switch role {
	case "admin":
		query = query.Where("is_admin = ?", true)
	case "user":
		query = query.Where("is_admin = ?", false)
	}

	// 计算总数
	var total int64
	query.Count(&total)

	// 获取用户列表
	var users []models.User
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户列表失败"})
		return
	}

	// 获取用户统计信息
	var userResponses []UserResponse
	for _, u := range users {
		response := UserResponse{
			User: u,
		}

		// 统计文章数量
		var articlesCount int64
		database.DB.Model(&models.Article{}).Where("author_id = ?", u.ID).Count(&articlesCount)
		response.ArticlesCount = int(articlesCount)

		// 统计投稿数量
		var submissionsCount int64
		database.DB.Model(&models.Submission{}).Where("author_id = ?", u.ID).Count(&submissionsCount)
		response.SubmissionsCount = int(submissionsCount)

		userResponses = append(userResponses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": userResponses,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// ToggleUserAdmin 切换用户管理员权限
func ToggleUserAdmin(c *gin.Context) {
	// 检查是否为管理员
	currentUser, exists := c.Get("current_user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	adminUser := currentUser.(*models.User)
	if !adminUser.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// 获取用户ID
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID"})
		return
	}

	// 不能修改自己的权限
	if uint(userID) == adminUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能修改自己的管理员权限"})
		return
	}

	// 获取请求体
	var req struct {
		IsAdmin bool `json:"is_admin"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	// 更新用户权限
	err = database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("is_admin", req.IsAdmin).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户权限失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户权限更新成功"})
}

// ToggleUserActive 切换用户状态
func ToggleUserActive(c *gin.Context) {
	// 检查是否为管理员
	currentUser, exists := c.Get("current_user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	adminUser := currentUser.(*models.User)
	if !adminUser.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// 获取用户ID
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID"})
		return
	}

	// 不能禁用自己
	if uint(userID) == adminUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能禁用自己的账户"})
		return
	}

	// 获取请求体
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	// 更新用户状态
	err = database.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("is_active", req.IsActive).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户状态更新成功"})
}

// DeleteUser 删除用户
func DeleteUser(c *gin.Context) {
	// 检查是否为管理员
	currentUser, exists := c.Get("current_user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	adminUser := currentUser.(*models.User)
	if !adminUser.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// 获取用户ID
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID"})
		return
	}

	// 不能删除自己
	if uint(userID) == adminUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能删除自己的账户"})
		return
	}

	// 检查用户是否存在
	var user models.User
	err = database.DB.First(&user, userID).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
		}
		return
	}

	// 检查用户是否有文章或投稿
	var articlesCount int64
	database.DB.Model(&models.Article{}).Where("author_id = ?", userID).Count(&articlesCount)

	var submissionsCount int64
	database.DB.Model(&models.Submission{}).Where("author_id = ?", userID).Count(&submissionsCount)

	if articlesCount > 0 || submissionsCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "该用户有关联的文章或投稿，无法删除",
			"details": gin.H{
				"articles_count":    articlesCount,
				"submissions_count": submissionsCount,
			},
		})
		return
	}

	// 删除用户
	err = database.DB.Delete(&user).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除用户失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "用户删除成功"})
}

// GetUserDetail 获取用户详情（管理员接口）
func GetUserDetail(c *gin.Context) {
	// 检查是否为管理员
	currentUser, exists := c.Get("current_user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未登录"})
		return
	}

	user := currentUser.(*models.User)
	if !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "权限不足"})
		return
	}

	// 获取用户ID
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID"})
		return
	}

	// 获取用户信息
	var targetUser models.User
	err = database.DB.First(&targetUser, userID).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
		}
		return
	}

	// 构建响应
	response := UserResponse{
		User: targetUser,
	}

	// 统计文章数量
	var articlesCount int64
	database.DB.Model(&models.Article{}).Where("author_id = ?", userID).Count(&articlesCount)
	response.ArticlesCount = int(articlesCount)

	// 统计投稿数量
	var submissionsCount int64
	database.DB.Model(&models.Submission{}).Where("author_id = ?", userID).Count(&submissionsCount)
	response.SubmissionsCount = int(submissionsCount)

	c.JSON(http.StatusOK, response)
}