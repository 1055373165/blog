package handlers

import (
	"errors"
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

var allowedAlgorithmAssetStatuses = map[string]bool{
	models.AlgorithmAssetStatusDraft:    true,
	models.AlgorithmAssetStatusReady:    true,
	models.AlgorithmAssetStatusArchived: true,
}

var allowedAlgorithmReviewStatuses = map[string]bool{
	models.AlgorithmReviewStatusNew:          true,
	models.AlgorithmReviewStatusRead:         true,
	models.AlgorithmReviewStatusFailedRecall: true,
	models.AlgorithmReviewStatusPassedRecall: true,
	models.AlgorithmReviewStatusNeedsReview:  true,
}

var allowedAlgorithmDifficulties = map[string]bool{
	"":       true,
	"easy":   true,
	"medium": true,
	"hard":   true,
}

var allowedAlgorithmAssetFileRoles = map[string][]string{
	models.AlgorithmAssetFileKindMarkdown: {
		models.AlgorithmAssetFileRolePrimaryAnalysis,
		models.AlgorithmAssetFileRoleSupplement,
	},
	models.AlgorithmAssetFileKindVideo: {
		models.AlgorithmAssetFileRoleAnimation,
		models.AlgorithmAssetFileRoleAlternateVideo,
		models.AlgorithmAssetFileRoleSupplement,
	},
}

type SaveAlgorithmAssetRequest struct {
	Title                 string     `json:"title" binding:"required"`
	Slug                  string     `json:"slug"`
	LeetCodeID            *uint      `json:"leetcode_id"`
	SourceURL             string     `json:"source_url"`
	SourceDirName         string     `json:"source_dir_name" binding:"required"`
	Description           string     `json:"description"`
	Difficulty            string     `json:"difficulty"`
	Tags                  []string   `json:"tags"`
	Status                string     `json:"status"`
	SummaryNote           string     `json:"summary_note"`
	WeakPoints            string     `json:"weak_points"`
	ReviewStatus          string     `json:"review_status"`
	NextReviewAt          *time.Time `json:"next_review_at"`
	PrimaryMarkdownFileID *uint      `json:"primary_markdown_file_id"`
	PrimaryVideoFileID    *uint      `json:"primary_video_file_id"`
}

type SaveAlgorithmAssetMarkdownFileRequest struct {
	DisplayName     string `json:"display_name" binding:"required"`
	OriginalName    string `json:"original_name"`
	Role            string `json:"role"`
	SortOrder       int    `json:"sort_order"`
	IsPrimary       bool   `json:"is_primary"`
	MarkdownContent string `json:"markdown_content"`
}

type SaveAlgorithmAssetVideoFileRequest struct {
	DisplayName  string `json:"display_name" binding:"required"`
	OriginalName string `json:"original_name"`
	Role         string `json:"role"`
	SortOrder    int    `json:"sort_order"`
	IsPrimary    bool   `json:"is_primary"`
	StorageURL   string `json:"storage_url" binding:"required"`
	MimeType     string `json:"mime_type"`
	SizeBytes    int64  `json:"size_bytes"`
}

type UpdateAlgorithmAssetFileRequest struct {
	DisplayName     string `json:"display_name" binding:"required"`
	OriginalName    string `json:"original_name"`
	Role            string `json:"role"`
	SortOrder       int    `json:"sort_order"`
	IsPrimary       bool   `json:"is_primary"`
	MarkdownContent string `json:"markdown_content"`
	StorageURL      string `json:"storage_url"`
	MimeType        string `json:"mime_type"`
	SizeBytes       int64  `json:"size_bytes"`
}

type UpdateAlgorithmAssetPrimaryFilesRequest struct {
	PrimaryMarkdownFileID *uint `json:"primary_markdown_file_id"`
	PrimaryVideoFileID    *uint `json:"primary_video_file_id"`
}

type UpdateAlgorithmAssetLearningRequest struct {
	SummaryNote  string     `json:"summary_note"`
	WeakPoints   string     `json:"weak_points"`
	ReviewStatus string     `json:"review_status"`
	NextReviewAt *time.Time `json:"next_review_at"`
}

func ListAlgorithmAssets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := strings.TrimSpace(c.Query("search"))
	status := normalizeAlgorithmAssetStatus(c.Query("status"))
	reviewStatus := normalizeAlgorithmReviewStatus(c.Query("review_status"))
	difficulty := normalizeAlgorithmDifficulty(c.Query("difficulty"))
	tag := strings.TrimSpace(c.Query("tag"))
	hasVideo, hasVideoProvided, hasVideoErr := parseOptionalBooleanQuery(c.Query("has_video"))
	sortBy := strings.TrimSpace(c.DefaultQuery("sort_by", "updated_at"))
	sortOrder := strings.TrimSpace(strings.ToLower(c.DefaultQuery("sort_order", "desc")))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	if c.Query("status") != "" && !allowedAlgorithmAssetStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "算法资产状态无效",
		})
		return
	}

	if c.Query("review_status") != "" && !allowedAlgorithmReviewStatuses[reviewStatus] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "复习状态无效",
		})
		return
	}

	if c.Query("difficulty") != "" && !allowedAlgorithmDifficulties[difficulty] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "题目难度无效",
		})
		return
	}

	if hasVideoErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "has_video 参数无效，只支持 true 或 false",
		})
		return
	}

	orderBy, err := resolveAlgorithmAssetOrder(sortBy, sortOrder)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	query := database.DB.Model(&models.AlgorithmAsset{}).
		Preload("Author").
		Preload("Files", preloadAlgorithmAssetListFiles)

	if search != "" {
		query = applyAlgorithmAssetSearch(query, search)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if reviewStatus != "" {
		query = query.Where("review_status = ?", reviewStatus)
	}
	if difficulty != "" {
		query = query.Where("difficulty = ?", difficulty)
	}
	if tag != "" {
		query = query.Where("LOWER(tags) LIKE ?", "%"+strings.ToLower(strings.TrimSpace(tag))+"%")
	}
	if hasVideoProvided {
		query = applyAlgorithmAssetHasVideoFilter(query, hasVideo)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询算法资产数量失败",
		})
		return
	}

	var assets []models.AlgorithmAsset
	offset := (page - 1) * limit
	if err := query.Order(orderBy).Offset(offset).Limit(limit).Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询算法资产列表失败",
		})
		return
	}

	for i := range assets {
		populateAlgorithmAssetDerivedFields(&assets[i])
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"assets": assets,
			"pagination": gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

func GetAlgorithmAsset(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetByID(assetID, true)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    asset,
	})
}

func CreateAlgorithmAsset(c *gin.Context) {
	var req SaveAlgorithmAssetRequest
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

	normalizedReq, err := normalizeAndValidateAlgorithmAssetRequest(req, 0)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if normalizedReq.PrimaryMarkdownFileID != nil || normalizedReq.PrimaryVideoFileID != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "创建资产时不能直接指定主文件，请先创建资产后再上传并管理文件",
		})
		return
	}

	asset := models.AlgorithmAsset{
		AuthorID: userID,
	}
	applyAlgorithmAssetRequest(&asset, normalizedReq, 0)

	if err := database.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建算法资产失败",
		})
		return
	}

	createdAsset, err := findAlgorithmAssetByID(asset.ID, true)
	if err != nil {
		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data":    asset,
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    createdAsset,
	})
}

func UpdateAlgorithmAsset(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	var asset models.AlgorithmAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	var req SaveAlgorithmAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	normalizedReq, err := normalizeAndValidateAlgorithmAssetRequest(req, asset.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := validateAlgorithmAssetPrimarySelection(asset.ID, normalizedReq.PrimaryMarkdownFileID, models.AlgorithmAssetFileKindMarkdown); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if err := validateAlgorithmAssetPrimarySelection(asset.ID, normalizedReq.PrimaryVideoFileID, models.AlgorithmAssetFileKindVideo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	applyAlgorithmAssetRequest(&asset, normalizedReq, asset.AuthorID)
	if err := database.DB.Save(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新算法资产失败",
		})
		return
	}

	updatedAsset, err := findAlgorithmAssetByID(asset.ID, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    asset,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedAsset,
	})
}

func CreateAlgorithmAssetMarkdownFile(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	var req SaveAlgorithmAssetMarkdownFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	normalizedReq, err := normalizeAlgorithmAssetMarkdownFileRequest(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	newFile := models.AlgorithmAssetFile{
		AssetID:         asset.ID,
		FileKind:        models.AlgorithmAssetFileKindMarkdown,
		Role:            normalizedReq.Role,
		DisplayName:     normalizedReq.DisplayName,
		OriginalName:    normalizedReq.OriginalName,
		SortOrder:       normalizedReq.SortOrder,
		IsPrimary:       false,
		MarkdownContent: normalizedReq.MarkdownContent,
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&newFile).Error; err != nil {
			return err
		}

		makePrimary := normalizedReq.IsPrimary
		if !makePrimary {
			var count int64
			if err := tx.Model(&models.AlgorithmAssetFile{}).
				Where("asset_id = ? AND file_kind = ?", asset.ID, models.AlgorithmAssetFileKindMarkdown).
				Count(&count).Error; err != nil {
				return err
			}
			makePrimary = count == 1
		}

		if makePrimary {
			return assignAlgorithmAssetPrimaryFile(tx, &asset, models.AlgorithmAssetFileKindMarkdown, &newFile.ID)
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建 Markdown 文件失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusCreated, asset.ID)
}

func CreateAlgorithmAssetVideoFile(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	var req SaveAlgorithmAssetVideoFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	normalizedReq, err := normalizeAlgorithmAssetVideoFileRequest(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	newFile := models.AlgorithmAssetFile{
		AssetID:      asset.ID,
		FileKind:     models.AlgorithmAssetFileKindVideo,
		Role:         normalizedReq.Role,
		DisplayName:  normalizedReq.DisplayName,
		OriginalName: normalizedReq.OriginalName,
		SortOrder:    normalizedReq.SortOrder,
		IsPrimary:    false,
		StorageURL:   normalizedReq.StorageURL,
		MimeType:     normalizedReq.MimeType,
		SizeBytes:    normalizedReq.SizeBytes,
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&newFile).Error; err != nil {
			return err
		}

		makePrimary := normalizedReq.IsPrimary
		if !makePrimary {
			var count int64
			if err := tx.Model(&models.AlgorithmAssetFile{}).
				Where("asset_id = ? AND file_kind = ?", asset.ID, models.AlgorithmAssetFileKindVideo).
				Count(&count).Error; err != nil {
				return err
			}
			makePrimary = count == 1
		}

		if makePrimary {
			return assignAlgorithmAssetPrimaryFile(tx, &asset, models.AlgorithmAssetFileKindVideo, &newFile.ID)
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建视频文件失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusCreated, asset.ID)
}

func UpdateAlgorithmAssetFile(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	fileID, ok := parseAlgorithmAssetFileID(c)
	if !ok {
		return
	}

	file, err := findAlgorithmAssetFileForMutation(asset.ID, fileID)
	if err != nil {
		handleAlgorithmAssetFileLookupError(c, err)
		return
	}

	var req UpdateAlgorithmAssetFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	normalizedReq, err := normalizeAlgorithmAssetFileUpdateRequest(req, file.FileKind)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		file.Role = normalizedReq.Role
		file.DisplayName = normalizedReq.DisplayName
		file.OriginalName = normalizedReq.OriginalName
		file.SortOrder = normalizedReq.SortOrder
		file.IsPrimary = normalizedReq.IsPrimary
		file.MarkdownContent = normalizedReq.MarkdownContent
		file.StorageURL = normalizedReq.StorageURL
		file.MimeType = normalizedReq.MimeType
		file.SizeBytes = normalizedReq.SizeBytes

		if err := tx.Save(&file).Error; err != nil {
			return err
		}

		if normalizedReq.IsPrimary {
			return assignAlgorithmAssetPrimaryFile(tx, &asset, file.FileKind, &file.ID)
		}

		if isAlgorithmAssetPrimaryFile(asset, file.ID, file.FileKind) {
			fallbackID, err := findFallbackAlgorithmAssetFileID(tx, asset.ID, file.FileKind, file.ID)
			if err != nil {
				return err
			}
			return assignAlgorithmAssetPrimaryFile(tx, &asset, file.FileKind, fallbackID)
		}

		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新算法文件失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusOK, asset.ID)
}

func DeleteAlgorithmAssetFile(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	fileID, ok := parseAlgorithmAssetFileID(c)
	if !ok {
		return
	}

	file, err := findAlgorithmAssetFileForMutation(asset.ID, fileID)
	if err != nil {
		handleAlgorithmAssetFileLookupError(c, err)
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&file).Error; err != nil {
			return err
		}

		if isAlgorithmAssetPrimaryFile(asset, file.ID, file.FileKind) {
			fallbackID, err := findFallbackAlgorithmAssetFileID(tx, asset.ID, file.FileKind, file.ID)
			if err != nil {
				return err
			}
			return assignAlgorithmAssetPrimaryFile(tx, &asset, file.FileKind, fallbackID)
		}

		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除算法文件失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusOK, asset.ID)
}

func UpdateAlgorithmAssetPrimaryFiles(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	var req UpdateAlgorithmAssetPrimaryFilesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	if req.PrimaryMarkdownFileID == nil {
		req.PrimaryMarkdownFileID = asset.PrimaryMarkdownFileID
	}
	if req.PrimaryVideoFileID == nil {
		req.PrimaryVideoFileID = asset.PrimaryVideoFileID
	}

	if err := validateAlgorithmAssetPrimarySelection(asset.ID, req.PrimaryMarkdownFileID, models.AlgorithmAssetFileKindMarkdown); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	if err := validateAlgorithmAssetPrimarySelection(asset.ID, req.PrimaryVideoFileID, models.AlgorithmAssetFileKindVideo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := assignAlgorithmAssetPrimaryFile(tx, &asset, models.AlgorithmAssetFileKindMarkdown, req.PrimaryMarkdownFileID); err != nil {
			return err
		}
		if err := assignAlgorithmAssetPrimaryFile(tx, &asset, models.AlgorithmAssetFileKindVideo, req.PrimaryVideoFileID); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新主文件失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusOK, asset.ID)
}

func UpdateAlgorithmAssetLearning(c *gin.Context) {
	assetID, ok := parseAlgorithmAssetID(c)
	if !ok {
		return
	}

	asset, err := findAlgorithmAssetForMutation(assetID)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	var req UpdateAlgorithmAssetLearningRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	req.SummaryNote = strings.TrimSpace(req.SummaryNote)
	req.WeakPoints = strings.TrimSpace(req.WeakPoints)
	if strings.TrimSpace(req.ReviewStatus) == "" {
		req.ReviewStatus = asset.ReviewStatus
	} else {
		req.ReviewStatus = normalizeAlgorithmReviewStatus(req.ReviewStatus)
	}
	if !allowedAlgorithmReviewStatuses[req.ReviewStatus] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "复习状态无效",
		})
		return
	}
	if req.NextReviewAt == nil {
		req.NextReviewAt = asset.NextReviewAt
	}

	asset.SummaryNote = req.SummaryNote
	asset.WeakPoints = req.WeakPoints
	asset.ReviewStatus = req.ReviewStatus
	asset.NextReviewAt = req.NextReviewAt

	if err := database.DB.Save(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新学习字段失败",
		})
		return
	}

	respondWithAlgorithmAsset(c, http.StatusOK, asset.ID)
}

func parseAlgorithmAssetID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "算法资产ID无效",
		})
		return 0, false
	}
	return uint(id), true
}

func parseAlgorithmAssetFileID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("fileId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "算法文件ID无效",
		})
		return 0, false
	}
	return uint(id), true
}

func handleAlgorithmAssetLookupError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "算法资产不存在",
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"error":   "查询算法资产失败",
	})
}

func handleAlgorithmAssetFileLookupError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "算法文件不存在",
		})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{
		"success": false,
		"error":   "查询算法文件失败",
	})
}

func respondWithAlgorithmAsset(c *gin.Context, statusCode int, assetID uint) {
	asset, err := findAlgorithmAssetByID(assetID, true)
	if err != nil {
		handleAlgorithmAssetLookupError(c, err)
		return
	}

	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    asset,
	})
}

func findAlgorithmAssetByID(assetID uint, includeMarkdownContent bool) (models.AlgorithmAsset, error) {
	query := database.DB.
		Preload("Author").
		Preload("Files", func(db *gorm.DB) *gorm.DB {
			if includeMarkdownContent {
				return db.Order("sort_order ASC, created_at ASC")
			}
			return preloadAlgorithmAssetListFiles(db)
		})

	var asset models.AlgorithmAsset
	if err := query.First(&asset, assetID).Error; err != nil {
		return models.AlgorithmAsset{}, err
	}

	populateAlgorithmAssetDerivedFields(&asset)
	return asset, nil
}

func findAlgorithmAssetForMutation(assetID uint) (models.AlgorithmAsset, error) {
	var asset models.AlgorithmAsset
	if err := database.DB.First(&asset, assetID).Error; err != nil {
		return models.AlgorithmAsset{}, err
	}
	return asset, nil
}

func findAlgorithmAssetFileForMutation(assetID, fileID uint) (models.AlgorithmAssetFile, error) {
	var file models.AlgorithmAssetFile
	if err := database.DB.First(&file, fileID).Error; err != nil {
		return models.AlgorithmAssetFile{}, err
	}
	if file.AssetID != assetID {
		return models.AlgorithmAssetFile{}, gorm.ErrRecordNotFound
	}
	return file, nil
}

func preloadAlgorithmAssetListFiles(db *gorm.DB) *gorm.DB {
	return db.Select(
		"id",
		"created_at",
		"updated_at",
		"asset_id",
		"file_kind",
		"role",
		"display_name",
		"original_name",
		"sort_order",
		"is_primary",
		"storage_url",
		"mime_type",
		"size_bytes",
	).Order("sort_order ASC, created_at ASC")
}

func applyAlgorithmAssetSearch(query *gorm.DB, search string) *gorm.DB {
	trimmedSearch := strings.TrimSpace(search)
	if trimmedSearch == "" {
		return query
	}

	searchLike := "%" + strings.ToLower(trimmedSearch) + "%"
	searchQuery := database.DB.Where(
		"LOWER(title) LIKE ? OR LOWER(slug) LIKE ? OR LOWER(source_dir_name) LIKE ? OR LOWER(source_url) LIKE ? OR LOWER(description) LIKE ?",
		searchLike,
		searchLike,
		searchLike,
		searchLike,
		searchLike,
	)

	if leetCodeID, err := strconv.Atoi(trimmedSearch); err == nil && leetCodeID > 0 {
		searchQuery = searchQuery.Or("leet_code_id = ?", leetCodeID)
	}

	return query.Where(searchQuery)
}

func applyAlgorithmAssetHasVideoFilter(query *gorm.DB, hasVideo bool) *gorm.DB {
	sql := "EXISTS (SELECT 1 FROM algorithm_asset_files WHERE algorithm_asset_files.asset_id = algorithm_assets.id AND algorithm_asset_files.file_kind = ?)"
	if hasVideo {
		return query.Where(sql, models.AlgorithmAssetFileKindVideo)
	}
	return query.Where("NOT "+sql, models.AlgorithmAssetFileKindVideo)
}

func normalizeAndValidateAlgorithmAssetRequest(req SaveAlgorithmAssetRequest, excludeID uint) (SaveAlgorithmAssetRequest, error) {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		return req, errors.New("算法资产标题不能为空")
	}

	req.SourceDirName = strings.TrimSpace(req.SourceDirName)
	if req.SourceDirName == "" {
		return req, errors.New("本地文件夹名称不能为空")
	}

	req.SourceURL = strings.TrimSpace(req.SourceURL)
	req.Description = strings.TrimSpace(req.Description)
	req.Difficulty = normalizeAlgorithmDifficulty(req.Difficulty)
	req.Status = normalizeAlgorithmAssetStatus(req.Status)
	req.SummaryNote = strings.TrimSpace(req.SummaryNote)
	req.WeakPoints = strings.TrimSpace(req.WeakPoints)
	req.ReviewStatus = normalizeAlgorithmReviewStatus(req.ReviewStatus)
	req.Tags = normalizeStringList(req.Tags)
	req.Slug = resolveAlgorithmAssetSlug(req.Slug, req.Title, req.SourceDirName, excludeID)

	if !allowedAlgorithmAssetStatuses[req.Status] {
		return req, errors.New("算法资产状态无效")
	}

	if !allowedAlgorithmReviewStatuses[req.ReviewStatus] {
		return req, errors.New("复习状态无效")
	}

	if !allowedAlgorithmDifficulties[req.Difficulty] {
		return req, errors.New("题目难度无效")
	}

	if err := ensureAlgorithmAssetSourceDirNameUnique(req.SourceDirName, excludeID); err != nil {
		return req, err
	}

	return req, nil
}

func applyAlgorithmAssetRequest(asset *models.AlgorithmAsset, req SaveAlgorithmAssetRequest, authorID uint) {
	asset.Title = req.Title
	asset.Slug = req.Slug
	asset.LeetCodeID = req.LeetCodeID
	asset.SourceURL = req.SourceURL
	asset.SourceDirName = req.SourceDirName
	asset.Description = req.Description
	asset.Difficulty = req.Difficulty
	asset.Tags = req.Tags
	asset.Status = req.Status
	asset.SummaryNote = req.SummaryNote
	asset.WeakPoints = req.WeakPoints
	asset.ReviewStatus = req.ReviewStatus
	asset.NextReviewAt = req.NextReviewAt
	asset.PrimaryMarkdownFileID = req.PrimaryMarkdownFileID
	asset.PrimaryVideoFileID = req.PrimaryVideoFileID
	if authorID != 0 {
		asset.AuthorID = authorID
	}
}

func normalizeAlgorithmAssetStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	if status == "" {
		return models.AlgorithmAssetStatusDraft
	}
	return status
}

func normalizeAlgorithmReviewStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	if status == "" {
		return models.AlgorithmReviewStatusNew
	}
	return status
}

func normalizeAlgorithmDifficulty(difficulty string) string {
	return strings.TrimSpace(strings.ToLower(difficulty))
}

func resolveAlgorithmAssetSlug(rawSlug, title, sourceDirName string, excludeID uint) string {
	source := strings.TrimSpace(rawSlug)
	if source == "" {
		source = title
	}
	if source == "" {
		source = sourceDirName
	}

	baseSlug := utils.GenerateSlug(source)
	slug := baseSlug
	counter := 1
	for {
		query := database.DB.Model(&models.AlgorithmAsset{}).Where("slug = ?", slug)
		if excludeID != 0 {
			query = query.Where("id != ?", excludeID)
		}

		var count int64
		if err := query.Count(&count).Error; err != nil || count == 0 {
			return slug
		}

		slug = baseSlug + "-" + strconv.Itoa(counter)
		counter++
		if counter > 1000 {
			return baseSlug + "-" + strconv.FormatInt(time.Now().Unix(), 10)
		}
	}
}

func ensureAlgorithmAssetSourceDirNameUnique(sourceDirName string, excludeID uint) error {
	var count int64
	query := database.DB.Model(&models.AlgorithmAsset{}).
		Where("LOWER(source_dir_name) = LOWER(?)", sourceDirName)
	if excludeID != 0 {
		query = query.Where("id != ?", excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return errors.New("校验本地文件夹名称失败")
	}
	if count > 0 {
		return errors.New("本地文件夹名称已存在，请保持一个目录只对应一个算法资产")
	}
	return nil
}

func validateAlgorithmAssetPrimarySelection(assetID uint, fileID *uint, expectedFileKind string) error {
	if fileID == nil {
		return nil
	}

	var assetFile models.AlgorithmAssetFile
	if err := database.DB.Select("id", "asset_id", "file_kind").First(&assetFile, *fileID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("主文件不存在")
		}
		return errors.New("校验主文件失败")
	}

	if assetFile.AssetID != assetID {
		return errors.New("主文件不属于当前算法资产")
	}
	if assetFile.FileKind != expectedFileKind {
		if expectedFileKind == models.AlgorithmAssetFileKindMarkdown {
			return errors.New("主 Markdown 文件类型无效")
		}
		return errors.New("主视频文件类型无效")
	}

	return nil
}

func normalizeAlgorithmAssetMarkdownFileRequest(req SaveAlgorithmAssetMarkdownFileRequest) (SaveAlgorithmAssetMarkdownFileRequest, error) {
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.OriginalName = strings.TrimSpace(req.OriginalName)
	if req.DisplayName == "" {
		return req, errors.New("Markdown 文件显示名称不能为空")
	}

	role, err := normalizeAlgorithmAssetFileRole(req.Role, models.AlgorithmAssetFileKindMarkdown)
	if err != nil {
		return req, err
	}
	req.Role = role
	return req, nil
}

func normalizeAlgorithmAssetVideoFileRequest(req SaveAlgorithmAssetVideoFileRequest) (SaveAlgorithmAssetVideoFileRequest, error) {
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.OriginalName = strings.TrimSpace(req.OriginalName)
	req.StorageURL = strings.TrimSpace(req.StorageURL)
	req.MimeType = strings.TrimSpace(req.MimeType)
	if req.DisplayName == "" {
		return req, errors.New("视频文件显示名称不能为空")
	}
	if req.StorageURL == "" {
		return req, errors.New("视频文件地址不能为空")
	}

	role, err := normalizeAlgorithmAssetFileRole(req.Role, models.AlgorithmAssetFileKindVideo)
	if err != nil {
		return req, err
	}
	req.Role = role
	return req, nil
}

func normalizeAlgorithmAssetFileUpdateRequest(req UpdateAlgorithmAssetFileRequest, fileKind string) (UpdateAlgorithmAssetFileRequest, error) {
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.OriginalName = strings.TrimSpace(req.OriginalName)
	req.StorageURL = strings.TrimSpace(req.StorageURL)
	req.MimeType = strings.TrimSpace(req.MimeType)
	if req.DisplayName == "" {
		return req, errors.New("文件显示名称不能为空")
	}

	role, err := normalizeAlgorithmAssetFileRole(req.Role, fileKind)
	if err != nil {
		return req, err
	}
	req.Role = role

	if fileKind == models.AlgorithmAssetFileKindVideo && req.StorageURL == "" {
		return req, errors.New("视频文件地址不能为空")
	}

	return req, nil
}

func normalizeAlgorithmAssetFileRole(role, fileKind string) (string, error) {
	role = strings.TrimSpace(strings.ToLower(role))
	if role == "" {
		if fileKind == models.AlgorithmAssetFileKindMarkdown {
			return models.AlgorithmAssetFileRolePrimaryAnalysis, nil
		}
		return models.AlgorithmAssetFileRoleAnimation, nil
	}

	for _, allowedRole := range allowedAlgorithmAssetFileRoles[fileKind] {
		if role == allowedRole {
			return role, nil
		}
	}
	return "", errors.New("文件角色无效")
}

func assignAlgorithmAssetPrimaryFile(tx *gorm.DB, asset *models.AlgorithmAsset, fileKind string, fileID *uint) error {
	if err := tx.Model(&models.AlgorithmAssetFile{}).
		Where("asset_id = ? AND file_kind = ?", asset.ID, fileKind).
		Update("is_primary", false).Error; err != nil {
		return err
	}

	if fileID != nil {
		if err := tx.Model(&models.AlgorithmAssetFile{}).
			Where("id = ? AND asset_id = ? AND file_kind = ?", *fileID, asset.ID, fileKind).
			Update("is_primary", true).Error; err != nil {
			return err
		}
	}

	switch fileKind {
	case models.AlgorithmAssetFileKindMarkdown:
		asset.PrimaryMarkdownFileID = fileID
		return tx.Model(&models.AlgorithmAsset{}).
			Where("id = ?", asset.ID).
			Update("primary_markdown_file_id", fileID).Error
	case models.AlgorithmAssetFileKindVideo:
		asset.PrimaryVideoFileID = fileID
		return tx.Model(&models.AlgorithmAsset{}).
			Where("id = ?", asset.ID).
			Update("primary_video_file_id", fileID).Error
	default:
		return errors.New("未知文件类型")
	}
}

func findFallbackAlgorithmAssetFileID(tx *gorm.DB, assetID uint, fileKind string, excludeFileID uint) (*uint, error) {
	var fallback models.AlgorithmAssetFile
	err := tx.
		Where("asset_id = ? AND file_kind = ? AND id != ?", assetID, fileKind, excludeFileID).
		Order("sort_order ASC, created_at ASC").
		First(&fallback).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &fallback.ID, nil
}

func isAlgorithmAssetPrimaryFile(asset models.AlgorithmAsset, fileID uint, fileKind string) bool {
	switch fileKind {
	case models.AlgorithmAssetFileKindMarkdown:
		return asset.PrimaryMarkdownFileID != nil && *asset.PrimaryMarkdownFileID == fileID
	case models.AlgorithmAssetFileKindVideo:
		return asset.PrimaryVideoFileID != nil && *asset.PrimaryVideoFileID == fileID
	default:
		return false
	}
}

func resolveAlgorithmAssetOrder(sortBy, sortOrder string) (string, error) {
	allowedSortFields := map[string]string{
		"created_at":      "created_at",
		"updated_at":      "updated_at",
		"title":           "title",
		"source_dir_name": "source_dir_name",
		"difficulty":      "difficulty",
		"status":          "status",
		"review_status":   "review_status",
		"next_review_at":  "next_review_at",
		"leetcode_id":     "leet_code_id",
	}

	column, ok := allowedSortFields[sortBy]
	if !ok {
		return "", errors.New("排序字段无效")
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		return "", errors.New("排序方向无效")
	}

	return column + " " + sortOrder, nil
}

func parseOptionalBooleanQuery(raw string) (bool, bool, error) {
	normalized := strings.TrimSpace(strings.ToLower(raw))
	if normalized == "" {
		return false, false, nil
	}
	if normalized == "true" {
		return true, true, nil
	}
	if normalized == "false" {
		return false, true, nil
	}
	return false, true, errors.New("invalid boolean")
}

func populateAlgorithmAssetDerivedFields(asset *models.AlgorithmAsset) {
	if asset == nil {
		return
	}

	asset.MarkdownCount = 0
	asset.VideoCount = 0
	asset.PrimaryMarkdownFile = nil
	asset.PrimaryVideoFile = nil

	for i := range asset.Files {
		file := &asset.Files[i]
		switch file.FileKind {
		case models.AlgorithmAssetFileKindMarkdown:
			asset.MarkdownCount++
			if asset.PrimaryMarkdownFileID != nil && file.ID == *asset.PrimaryMarkdownFileID {
				asset.PrimaryMarkdownFile = file
			} else if asset.PrimaryMarkdownFile == nil && file.IsPrimary {
				asset.PrimaryMarkdownFile = file
			}
		case models.AlgorithmAssetFileKindVideo:
			asset.VideoCount++
			if asset.PrimaryVideoFileID != nil && file.ID == *asset.PrimaryVideoFileID {
				asset.PrimaryVideoFile = file
			} else if asset.PrimaryVideoFile == nil && file.IsPrimary {
				asset.PrimaryVideoFile = file
			}
		}
	}

	if asset.PrimaryMarkdownFile == nil {
		for i := range asset.Files {
			if asset.Files[i].FileKind == models.AlgorithmAssetFileKindMarkdown {
				asset.PrimaryMarkdownFile = &asset.Files[i]
				break
			}
		}
	}

	if asset.PrimaryVideoFile == nil {
		for i := range asset.Files {
			if asset.Files[i].FileKind == models.AlgorithmAssetFileKindVideo {
				asset.PrimaryVideoFile = &asset.Files[i]
				break
			}
		}
	}
}
