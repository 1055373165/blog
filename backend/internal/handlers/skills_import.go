package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"blog-backend/internal/config"
	"blog-backend/internal/middleware"
	"blog-backend/internal/services"
)

type ImportGithubRequest struct {
	URL string `json:"url" binding:"required"`
}

func ImportSkillsFromGithub(c *gin.Context) {
	var req ImportGithubRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	urlStr := strings.TrimSpace(req.URL)
	if urlStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "GitHub URL 不能为空",
		})
		return
	}

	importerService := services.NewGitHubImporterService(config.GlobalConfig)

	importedSkills, err := importerService.ImportSkills(c.Request.Context(), urlStr, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "导入失败",
			"details": err.Error(),
		})
		return
	}

	if len(importedSkills) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "在目标路径下未发现有效的 Skill 数据",
			"count":   0,
		})
		return
	}

	syncService := services.NewGitHubAssetSyncService(config.GlobalConfig)
	syncErr := syncService.BulkSyncSkills(c.Request.Context(), importedSkills)

	if syncErr != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "成功导入到数据库，但同步至 GitHub 仓库失败：" + syncErr.Error(),
			"count":   len(importedSkills),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "成功从 GitHub 导入并已自动推送到配置仓库",
		"count":   len(importedSkills),
	})
}
