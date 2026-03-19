package handlers

import (
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

var allowedPromptStatuses = map[string]bool{
	"draft":    true,
	"active":   true,
	"archived": true,
}

// SavePromptRequest 提示词创建/更新请求
type SavePromptRequest struct {
	Name             string   `json:"name" binding:"required"`
	Slug             string   `json:"slug"`
	Description      string   `json:"description"`
	Content          string   `json:"content"`
	Notes            string   `json:"notes"`
	Status           string   `json:"status"`
	Tags             []string `json:"tags"`
	ApplicableModels []string `json:"applicable_models"`
	ParentID         *uint    `json:"parent_id"`
}

// GetPromptTree 获取提示词树
func GetPromptTree(c *gin.Context) {
	search := strings.TrimSpace(strings.ToLower(c.Query("search")))
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	selectedTags := normalizeStringList(strings.Split(c.Query("tags"), ","))
	selectedModels := normalizeStringList(strings.Split(c.Query("models"), ","))

	var prompts []models.Prompt
	err := database.DB.
		Model(&models.Prompt{}).
		Order("sort_order ASC, updated_at DESC, created_at DESC").
		Find(&prompts).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询提示词树失败",
		})
		return
	}

	tree := buildPromptTree(prompts)
	filteredTree := filterPromptTree(tree, search, status, selectedTags, selectedModels)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    filteredTree,
	})
}

// GetPrompt 获取单个提示词
func GetPrompt(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词ID无效",
		})
		return
	}

	var prompt models.Prompt
	err = database.DB.
		Preload("Parent").
		Preload("Author").
		First(&prompt, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "提示词不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询提示词失败",
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Prompt{}).Where("parent_id = ?", prompt.ID).Count(&childCount)
	prompt.ChildCount = int(childCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    prompt,
	})
}

// CreatePrompt 创建提示词
func CreatePrompt(c *gin.Context) {
	var req SavePromptRequest
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

	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词名称不能为空",
		})
		return
	}

	status := normalizePromptStatus(req.Status)
	if !allowedPromptStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词状态无效",
		})
		return
	}

	if err := ensurePromptParentExists(req.ParentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	slug := resolvePromptSlug(req.Slug, name, 0)
	prompt := models.Prompt{
		Name:             name,
		Slug:             slug,
		Description:      strings.TrimSpace(req.Description),
		Content:          req.Content,
		Notes:            strings.TrimSpace(req.Notes),
		Status:           status,
		Tags:             normalizeStringList(req.Tags),
		ApplicableModels: normalizeStringList(req.ApplicableModels),
		ParentID:         req.ParentID,
		AuthorID:         userID,
	}

	if err := database.DB.Create(&prompt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建提示词失败",
		})
		return
	}

	if err := database.DB.Preload("Parent").Preload("Author").First(&prompt, prompt.ID).Error; err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    prompt,
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    prompt,
	})
}

// UpdatePrompt 更新提示词
func UpdatePrompt(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词ID无效",
		})
		return
	}

	var prompt models.Prompt
	err = database.DB.First(&prompt, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "提示词不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询提示词失败",
		})
		return
	}

	var req SavePromptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词名称不能为空",
		})
		return
	}

	status := normalizePromptStatus(req.Status)
	if !allowedPromptStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词状态无效",
		})
		return
	}

	if err := validatePromptParent(prompt.ID, req.ParentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	prompt.Name = name
	prompt.Description = strings.TrimSpace(req.Description)
	prompt.Content = req.Content
	prompt.Notes = strings.TrimSpace(req.Notes)
	prompt.Status = status
	prompt.Tags = normalizeStringList(req.Tags)
	prompt.ApplicableModels = normalizeStringList(req.ApplicableModels)
	prompt.ParentID = req.ParentID
	prompt.Slug = resolvePromptSlug(req.Slug, name, prompt.ID)

	if err := database.DB.Save(&prompt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新提示词失败",
		})
		return
	}

	if err := database.DB.Preload("Parent").Preload("Author").First(&prompt, prompt.ID).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    prompt,
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Prompt{}).Where("parent_id = ?", prompt.ID).Count(&childCount)
	prompt.ChildCount = int(childCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    prompt,
	})
}

// DeletePrompt 删除提示词
func DeletePrompt(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "提示词ID无效",
		})
		return
	}

	var prompt models.Prompt
	err = database.DB.First(&prompt, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "提示词不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询提示词失败",
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Prompt{}).Where("parent_id = ?", prompt.ID).Count(&childCount)
	if childCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "当前提示词下仍有子提示词，请先调整层级后再删除",
		})
		return
	}

	if err := database.DB.Delete(&prompt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除提示词失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "提示词删除成功",
	})
}

func normalizePromptStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	if status == "" {
		return "draft"
	}
	return status
}

func normalizeStringList(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}

	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, trimmed)
	}
	return result
}

func resolvePromptSlug(rawSlug, fallbackName string, excludeID uint) string {
	source := strings.TrimSpace(rawSlug)
	if source == "" {
		source = fallbackName
	}

	baseSlug := utils.GenerateSlug(source)
	if excludeID == 0 {
		return utils.GenerateUniquePromptSlug(baseSlug)
	}
	return utils.GenerateUniquePromptSlug(baseSlug, excludeID)
}

func ensurePromptParentExists(parentID *uint) error {
	if parentID == nil {
		return nil
	}

	var count int64
	if err := database.DB.Model(&models.Prompt{}).Where("id = ?", *parentID).Count(&count).Error; err != nil {
		return errors.New("校验父提示词失败")
	}
	if count == 0 {
		return errors.New("父提示词不存在")
	}
	return nil
}

func validatePromptParent(promptID uint, parentID *uint) error {
	if err := ensurePromptParentExists(parentID); err != nil {
		return err
	}
	if parentID == nil {
		return nil
	}
	if *parentID == promptID {
		return errors.New("父提示词不能是自己")
	}

	currentParentID := parentID
	for currentParentID != nil {
		if *currentParentID == promptID {
			return errors.New("不能将提示词移动到自己的子节点下")
		}

		var parent models.Prompt
		err := database.DB.Select("id", "parent_id").First(&parent, *currentParentID).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父提示词不存在")
			}
			return errors.New("校验父提示词失败")
		}

		currentParentID = parent.ParentID
	}

	return nil
}

func buildPromptTree(prompts []models.Prompt) []models.Prompt {
	if len(prompts) == 0 {
		return []models.Prompt{}
	}

	nodes := make(map[uint]*models.Prompt, len(prompts))
	childIDsByParent := make(map[uint][]uint)
	rootIDs := make([]uint, 0)
	for _, prompt := range prompts {
		node := prompt
		node.Children = nil
		nodes[node.ID] = &node
		if prompt.ParentID != nil {
			childIDsByParent[*prompt.ParentID] = append(childIDsByParent[*prompt.ParentID], prompt.ID)
		} else {
			rootIDs = append(rootIDs, prompt.ID)
		}
	}

	roots := make([]models.Prompt, 0, len(rootIDs))
	for _, id := range rootIDs {
		roots = append(roots, buildPromptNode(id, nodes, childIDsByParent))
	}
	return roots
}

func buildPromptNode(id uint, nodes map[uint]*models.Prompt, childIDsByParent map[uint][]uint) models.Prompt {
	node := *nodes[id]
	childIDs := childIDsByParent[id]
	if len(childIDs) > 0 {
		node.Children = make([]models.Prompt, 0, len(childIDs))
		for _, childID := range childIDs {
			node.Children = append(node.Children, buildPromptNode(childID, nodes, childIDsByParent))
		}
	} else {
		node.Children = []models.Prompt{}
	}
	node.ChildCount = len(node.Children)
	return node
}

func filterPromptTree(prompts []models.Prompt, search, status string, selectedTags, selectedModels []string) []models.Prompt {
	if search == "" && status == "" && len(selectedTags) == 0 && len(selectedModels) == 0 {
		return prompts
	}

	filtered := make([]models.Prompt, 0)
	for _, prompt := range prompts {
		children := filterPromptTree(prompt.Children, search, status, selectedTags, selectedModels)
		matches := promptMatchesFilters(prompt, search, status, selectedTags, selectedModels)
		if matches || len(children) > 0 {
			prompt.Children = children
			prompt.ChildCount = len(children)
			filtered = append(filtered, prompt)
		}
	}
	return filtered
}

func promptMatchesFilters(prompt models.Prompt, search, status string, selectedTags, selectedModels []string) bool {
	if status != "" && strings.ToLower(prompt.Status) != status {
		return false
	}

	if len(selectedTags) > 0 {
		promptTags := normalizeStringList(prompt.Tags)
		if !hasAnyCaseInsensitive(promptTags, selectedTags) {
			return false
		}
	}

	if len(selectedModels) > 0 {
		promptModels := normalizeStringList(prompt.ApplicableModels)
		if !hasAnyCaseInsensitive(promptModels, selectedModels) {
			return false
		}
	}

	if search == "" {
		return true
	}

	haystacks := []string{
		prompt.Name,
		prompt.Slug,
		prompt.Description,
		prompt.Content,
		prompt.Notes,
		strings.Join(prompt.Tags, " "),
		strings.Join(prompt.ApplicableModels, " "),
	}

	for _, haystack := range haystacks {
		if strings.Contains(strings.ToLower(haystack), search) {
			return true
		}
	}

	return false
}

func hasAnyCaseInsensitive(values, selected []string) bool {
	lowered := make([]string, 0, len(values))
	for _, value := range values {
		lowered = append(lowered, strings.ToLower(value))
	}
	for _, selectedValue := range selected {
		if slices.Contains(lowered, strings.ToLower(selectedValue)) {
			return true
		}
	}
	return false
}
