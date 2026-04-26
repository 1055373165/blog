package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
)

const maxAutosaveVersionsPerArticle = 20

// snapshotArticleVersion 为一篇文章创建一个版本快照。
// 在事务内调用：UpdateArticle 的 hook 用它做"改动前自动 snapshot"，
// 主动 SetStable / Restore 也用它生成新版本。
//
// 调用方负责传入正确的 article 实例（已包含最新字段值）。
// 返回创建好的 version 记录。
func snapshotArticleVersion(tx *gorm.DB, article *models.Article, userID uint, label string, isStable, isAutosave bool) (*models.ArticleVersion, error) {
	// 计算下一个 version_no（同篇文章内单调递增）
	var maxNo int
	if err := tx.Model(&models.ArticleVersion{}).
		Where("article_id = ?", article.ID).
		Select("COALESCE(MAX(version_no), 0)").
		Scan(&maxNo).Error; err != nil {
		return nil, err
	}

	v := &models.ArticleVersion{
		ArticleID:       article.ID,
		VersionNo:       maxNo + 1,
		Label:           label,
		IsStable:        isStable,
		IsAutosave:      isAutosave,
		Title:           article.Title,
		Slug:            article.Slug,
		Excerpt:         article.Excerpt,
		Content:         article.Content,
		CoverImage:      article.CoverImage,
		MetaTitle:       article.MetaTitle,
		MetaDescription: article.MetaDescription,
		MetaKeywords:    article.MetaKeywords,
		CreatedBy:       userID,
		CreatedAt:       time.Now(),
	}
	if err := tx.Create(v).Error; err != nil {
		return nil, err
	}

	// 自动版本清理：每篇最多保留 N 条 is_autosave=1 且 is_stable=0 的版本
	if isAutosave {
		var ids []uint
		if err := tx.Model(&models.ArticleVersion{}).
			Where("article_id = ? AND is_autosave = ? AND is_stable = ?", article.ID, true, false).
			Order("version_no DESC").
			Offset(maxAutosaveVersionsPerArticle).
			Pluck("id", &ids).Error; err == nil && len(ids) > 0 {
			tx.Where("id IN ?", ids).Delete(&models.ArticleVersion{})
		}
	}

	return v, nil
}

// loadArticleForVersion 加载文章并校验当前用户有编辑权限。
func loadArticleForVersion(c *gin.Context) (*models.Article, uint, bool) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "用户未认证"})
		return nil, 0, false
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "文章ID无效"})
		return nil, 0, false
	}
	var article models.Article
	if err := database.DB.First(&article, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "文章不存在"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "查询文章失败"})
		}
		return nil, 0, false
	}
	isAdmin, _ := middleware.GetCurrentUserIsAdmin(c)
	if article.AuthorID != userID && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": "没有权限操作此文章"})
		return nil, 0, false
	}
	return &article, userID, true
}

// ListArticleVersions GET /api/articles/:id/versions
// 仅返回 metadata（不带 content），列表加载快。
func ListArticleVersions(c *gin.Context) {
	article, _, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	type row struct {
		ID         uint      `json:"id"`
		VersionNo  int       `json:"version_no"`
		Label      string    `json:"label"`
		IsStable   bool      `json:"is_stable"`
		IsAutosave bool      `json:"is_autosave"`
		Title      string    `json:"title"`
		ContentLen int       `json:"content_length"`
		CreatedBy  uint      `json:"created_by"`
		CreatedAt  time.Time `json:"created_at"`
	}
	var versions []row
	if err := database.DB.Model(&models.ArticleVersion{}).
		Where("article_id = ?", article.ID).
		Select("id, version_no, label, is_stable, is_autosave, title, CHAR_LENGTH(content) AS content_len, created_by, created_at").
		Order("version_no DESC").
		Scan(&versions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "查询版本失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"versions": versions}})
}

// GetArticleVersion GET /api/articles/:id/versions/:vid
// 返回完整内容（含 content），用于编辑器预览。
func GetArticleVersion(c *gin.Context) {
	article, _, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	vid, err := strconv.ParseUint(c.Param("vid"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "版本ID无效"})
		return
	}
	var v models.ArticleVersion
	if err := database.DB.Where("id = ? AND article_id = ?", uint(vid), article.ID).First(&v).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "版本不存在"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": v})
}

// CreateArticleVersionRequest "设为稳定版本"按钮的请求体
type CreateArticleVersionRequest struct {
	Label string `json:"label"` // 用户自定义标签，可选
}

// CreateArticleVersion POST /api/articles/:id/versions
// 主动从当前主表状态生成一个 is_stable=1 的版本（"设为稳定版本"按钮）。
func CreateArticleVersion(c *gin.Context) {
	article, userID, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	var req CreateArticleVersionRequest
	_ = c.ShouldBindJSON(&req)
	label := req.Label
	if label == "" {
		label = "稳定版"
	}

	tx := database.DB.Begin()
	v, err := snapshotArticleVersion(tx, article, userID, label, true, false)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "保存版本失败"})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"success": true, "data": v})
}

// RestoreArticleVersion POST /api/articles/:id/versions/:vid/restore
// 把指定版本写回主表。在写回前会先把当前主表内容自动 snapshot 一份（防止误操作再丢）。
func RestoreArticleVersion(c *gin.Context) {
	article, userID, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	vid, err := strconv.ParseUint(c.Param("vid"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "版本ID无效"})
		return
	}
	var v models.ArticleVersion
	if err := database.DB.Where("id = ? AND article_id = ?", uint(vid), article.ID).First(&v).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "版本不存在"})
		return
	}

	tx := database.DB.Begin()

	// 还原前先把当前主表状态存档（恢复前快照），label 写明白
	if _, err := snapshotArticleVersion(tx, article, userID, "恢复前自动备份", false, true); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "恢复前备份失败"})
		return
	}

	// 写回主表
	updates := map[string]interface{}{
		"title":            v.Title,
		"excerpt":          v.Excerpt,
		"content":          v.Content,
		"cover_image":      v.CoverImage,
		"meta_title":       v.MetaTitle,
		"meta_description": v.MetaDescription,
		"meta_keywords":    v.MetaKeywords,
	}
	if err := tx.Model(article).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "恢复主文章失败"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "提交事务失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"restored_from_version_no": v.VersionNo}})
}

// DeleteArticleVersion DELETE /api/articles/:id/versions/:vid
func DeleteArticleVersion(c *gin.Context) {
	article, _, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	vid, err := strconv.ParseUint(c.Param("vid"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "版本ID无效"})
		return
	}
	if err := database.DB.Where("id = ? AND article_id = ?", uint(vid), article.ID).
		Delete(&models.ArticleVersion{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "删除版本失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateVersionLabelRequest PATCH 重命名版本标签
type UpdateVersionLabelRequest struct {
	Label string `json:"label"`
}

// UpdateArticleVersionLabel PATCH /api/articles/:id/versions/:vid
func UpdateArticleVersionLabel(c *gin.Context) {
	article, _, ok := loadArticleForVersion(c)
	if !ok {
		return
	}
	vid, err := strconv.ParseUint(c.Param("vid"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "版本ID无效"})
		return
	}
	var req UpdateVersionLabelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "请求参数无效"})
		return
	}
	if err := database.DB.Model(&models.ArticleVersion{}).
		Where("id = ? AND article_id = ?", uint(vid), article.ID).
		Update("label", req.Label).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "更新失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
