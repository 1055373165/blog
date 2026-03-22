package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

type SaveSkillRequest struct {
	Name            string                       `json:"name" binding:"required"`
	Slug            string                       `json:"slug"`
	Description     string                       `json:"description"`
	Content         string                       `json:"content"`
	Notes           string                       `json:"notes"`
	Status          string                       `json:"status"`
	Tags            []string                     `json:"tags"`
	AnthropicConfig map[string]interface{}       `json:"anthropic_config"`
	SupportingFiles []models.SkillSupportingFile `json:"supporting_files"`
	ParentID        *uint                        `json:"parent_id"`
}

func GetSkillTree(c *gin.Context) {
	search := strings.TrimSpace(strings.ToLower(c.Query("search")))
	status := strings.TrimSpace(strings.ToLower(c.Query("status")))
	selectedTags := normalizeStringList(strings.Split(c.Query("tags"), ","))

	var skills []models.Skill
	err := database.DB.
		Model(&models.Skill{}).
		Order("sort_order ASC, updated_at DESC, created_at DESC").
		Find(&skills).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询技能树失败",
		})
		return
	}

	tree := buildSkillTree(skills)
	filteredTree := filterSkillTree(tree, search, status, selectedTags)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    filteredTree,
	})
}

func GetSkill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "技能ID无效",
		})
		return
	}

	var skill models.Skill
	err = database.DB.
		Preload("Parent").
		Preload("Author").
		First(&skill, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "技能不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询技能失败",
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Skill{}).Where("parent_id = ?", skill.ID).Count(&childCount)
	skill.ChildCount = int(childCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    skill,
	})
}

func CreateSkill(c *gin.Context) {
	var req SaveSkillRequest
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
			"error":   "技能名称不能为空",
		})
		return
	}

	status := normalizePromptStatus(req.Status)
	if !allowedPromptStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "技能状态无效",
		})
		return
	}

	if err := ensureSkillParentExists(req.ParentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	skill := models.Skill{
		Name:            name,
		Slug:            resolveSkillSlug(req.Slug, name, 0),
		Description:     strings.TrimSpace(req.Description),
		Content:         req.Content,
		Notes:           strings.TrimSpace(req.Notes),
		Status:          status,
		Tags:            normalizeStringList(req.Tags),
		AnthropicConfig: normalizeSkillConfig(req.AnthropicConfig),
		SupportingFiles: normalizeSkillSupportingFiles(req.SupportingFiles),
		ParentID:        req.ParentID,
		AuthorID:        userID,
	}

	if err := database.DB.Create(&skill).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建技能失败",
		})
		return
	}

	if err := database.DB.Preload("Parent").Preload("Author").First(&skill, skill.ID).Error; err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    skill,
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    skill,
	})
}

func UpdateSkill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "技能ID无效",
		})
		return
	}

	var skill models.Skill
	err = database.DB.First(&skill, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "技能不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询技能失败",
		})
		return
	}

	var req SaveSkillRequest
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
			"error":   "技能名称不能为空",
		})
		return
	}

	status := normalizePromptStatus(req.Status)
	if !allowedPromptStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "技能状态无效",
		})
		return
	}

	if err := validateSkillParent(skill.ID, req.ParentID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	skill.Name = name
	skill.Description = strings.TrimSpace(req.Description)
	skill.Content = req.Content
	skill.Notes = strings.TrimSpace(req.Notes)
	skill.Status = status
	skill.Tags = normalizeStringList(req.Tags)
	skill.AnthropicConfig = normalizeSkillConfig(req.AnthropicConfig)
	skill.SupportingFiles = normalizeSkillSupportingFiles(req.SupportingFiles)
	skill.ParentID = req.ParentID
	skill.Slug = resolveSkillSlug(req.Slug, name, skill.ID)

	if err := database.DB.Save(&skill).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新技能失败",
		})
		return
	}

	if err := database.DB.Preload("Parent").Preload("Author").First(&skill, skill.ID).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    skill,
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Skill{}).Where("parent_id = ?", skill.ID).Count(&childCount)
	skill.ChildCount = int(childCount)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    skill,
	})
}

func DeleteSkill(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "技能ID无效",
		})
		return
	}

	var skill models.Skill
	err = database.DB.First(&skill, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "技能不存在",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询技能失败",
		})
		return
	}

	var childCount int64
	database.DB.Model(&models.Skill{}).Where("parent_id = ?", skill.ID).Count(&childCount)
	if childCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "当前技能下仍有子技能，请先调整层级后再删除",
		})
		return
	}

	if err := database.DB.Delete(&skill).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除技能失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "技能删除成功",
	})
}

func resolveSkillSlug(rawSlug, fallbackName string, excludeID uint) string {
	source := strings.TrimSpace(rawSlug)
	if source == "" {
		source = fallbackName
	}

	baseSlug := utils.GenerateSlug(source)
	if excludeID == 0 {
		return utils.GenerateUniqueSkillSlug(baseSlug)
	}
	return utils.GenerateUniqueSkillSlug(baseSlug, excludeID)
}

func ensureSkillParentExists(parentID *uint) error {
	if parentID == nil {
		return nil
	}

	var count int64
	if err := database.DB.Model(&models.Skill{}).Where("id = ?", *parentID).Count(&count).Error; err != nil {
		return errors.New("校验父技能失败")
	}
	if count == 0 {
		return errors.New("父技能不存在")
	}
	return nil
}

func validateSkillParent(skillID uint, parentID *uint) error {
	if err := ensureSkillParentExists(parentID); err != nil {
		return err
	}
	if parentID == nil {
		return nil
	}
	if *parentID == skillID {
		return errors.New("父技能不能是自己")
	}

	currentParentID := parentID
	for currentParentID != nil {
		if *currentParentID == skillID {
			return errors.New("不能将技能移动到自己的子节点下")
		}

		var parent models.Skill
		err := database.DB.Select("id", "parent_id").First(&parent, *currentParentID).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("父技能不存在")
			}
			return errors.New("校验父技能失败")
		}

		currentParentID = parent.ParentID
	}

	return nil
}

func buildSkillTree(skills []models.Skill) []models.Skill {
	if len(skills) == 0 {
		return []models.Skill{}
	}

	nodes := make(map[uint]*models.Skill, len(skills))
	childIDsByParent := make(map[uint][]uint)
	rootIDs := make([]uint, 0)
	for _, skill := range skills {
		node := skill
		node.Children = nil
		nodes[node.ID] = &node
		if skill.ParentID != nil {
			childIDsByParent[*skill.ParentID] = append(childIDsByParent[*skill.ParentID], skill.ID)
		} else {
			rootIDs = append(rootIDs, skill.ID)
		}
	}

	roots := make([]models.Skill, 0, len(rootIDs))
	for _, id := range rootIDs {
		roots = append(roots, buildSkillNode(id, nodes, childIDsByParent))
	}
	return roots
}

func buildSkillNode(id uint, nodes map[uint]*models.Skill, childIDsByParent map[uint][]uint) models.Skill {
	node := *nodes[id]
	childIDs := childIDsByParent[id]
	if len(childIDs) > 0 {
		node.Children = make([]models.Skill, 0, len(childIDs))
		for _, childID := range childIDs {
			node.Children = append(node.Children, buildSkillNode(childID, nodes, childIDsByParent))
		}
	} else {
		node.Children = []models.Skill{}
	}
	node.ChildCount = len(node.Children)
	return node
}

func filterSkillTree(skills []models.Skill, search, status string, selectedTags []string) []models.Skill {
	if search == "" && status == "" && len(selectedTags) == 0 {
		return skills
	}

	filtered := make([]models.Skill, 0)
	for _, skill := range skills {
		children := filterSkillTree(skill.Children, search, status, selectedTags)
		matches := skillMatchesFilters(skill, search, status, selectedTags)
		if matches || len(children) > 0 {
			skill.Children = children
			skill.ChildCount = len(children)
			filtered = append(filtered, skill)
		}
	}
	return filtered
}

func skillMatchesFilters(skill models.Skill, search, status string, selectedTags []string) bool {
	if status != "" && strings.ToLower(skill.Status) != status {
		return false
	}

	if len(selectedTags) > 0 {
		skillTags := normalizeStringList(skill.Tags)
		if !hasAnyCaseInsensitive(skillTags, selectedTags) {
			return false
		}
	}

	if search == "" {
		return true
	}

	haystacks := []string{
		skill.Name,
		skill.Slug,
		skill.Description,
		skill.Content,
		skill.Notes,
		strings.Join(skill.Tags, " "),
	}

	for _, haystack := range haystacks {
		if strings.Contains(strings.ToLower(haystack), search) {
			return true
		}
	}

	return false
}

func normalizeSkillConfig(config map[string]interface{}) map[string]interface{} {
	if len(config) == 0 {
		return map[string]interface{}{}
	}

	normalized := make(map[string]interface{}, len(config))
	for key, value := range config {
		trimmedKey := strings.TrimSpace(key)
		loweredKey := strings.ToLower(trimmedKey)
		if trimmedKey == "" || loweredKey == "name" || loweredKey == "description" {
			continue
		}
		normalized[trimmedKey] = value
	}
	return normalized
}

func normalizeSkillSupportingFiles(files []models.SkillSupportingFile) []models.SkillSupportingFile {
	if len(files) == 0 {
		return []models.SkillSupportingFile{}
	}

	seen := make(map[string]bool, len(files))
	normalized := make([]models.SkillSupportingFile, 0, len(files))
	for _, file := range files {
		path := normalizeSkillFilePath(file.Path)
		if path == "" || seen[strings.ToLower(path)] {
			continue
		}
		seen[strings.ToLower(path)] = true
		normalized = append(normalized, models.SkillSupportingFile{
			Path:    path,
			Content: file.Content,
		})
	}

	return normalized
}

func normalizeSkillFilePath(path string) string {
	path = strings.TrimSpace(path)
	path = strings.ReplaceAll(path, "\\", "/")
	path = strings.TrimPrefix(path, "./")
	path = strings.Trim(path, "/")

	parts := strings.Split(path, "/")
	normalizedParts := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" || part == "." {
			continue
		}
		if part == ".." {
			return ""
		}
		normalizedParts = append(normalizedParts, part)
	}

	return strings.Join(normalizedParts, "/")
}
