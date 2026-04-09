package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/middleware"
	"blog-backend/internal/models"
	"blog-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type createNotebookLMNotebookRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

type createNotebookLMImportJobRequest struct {
	NotebookID  uint                   `json:"notebook_id" binding:"required"`
	SourceType  string                 `json:"source_type" binding:"required"`
	SourceLabel string                 `json:"source_label" binding:"required"`
	SourceInput map[string]interface{} `json:"source_input"`
	CaptureMode string                 `json:"capture_mode"`
}

type finalizeNotebookLMCaptureRequest struct {
	Stage          string `json:"stage"`
	Progress       int    `json:"progress"`
	ErrorCode      string `json:"error_code"`
	ErrorMessage   string `json:"error_message"`
	Degraded       bool   `json:"degraded"`
	DegradedReason string `json:"degraded_reason"`
	AutoSync       bool   `json:"auto_sync"`
}

type reportNotebookLMCaptureEventRequest struct {
	EventKind string                 `json:"event_kind" binding:"required"`
	Summary   string                 `json:"summary"`
	Payload   map[string]interface{} `json:"payload"`
	Origin    string                 `json:"origin"`
}

type notebookLMImportJobsResponse struct {
	Jobs       []models.NotebookLMImportJob `json:"jobs"`
	Pagination gin.H                        `json:"pagination"`
}

func ListNotebookLMNotebooks(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	var notebooks []models.NotebookLMNotebook
	if err := database.DB.
		Where("user_id = ?", userID).
		Order("updated_at DESC").
		Find(&notebooks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "加载 Notebook 列表失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    notebooks,
	})
}

func CreateNotebookLMNotebook(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	var req createNotebookLMNotebookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	notebook := models.NotebookLMNotebook{
		UserID:      userID,
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Status:      models.NotebookLMNotebookStatusReady,
	}

	if notebook.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Notebook 标题不能为空",
		})
		return
	}

	if err := database.DB.Create(&notebook).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建 Notebook 失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Notebook 已登记，后续可直接接入 NotebookLM 同步",
		"data":    notebook,
	})
}

func ListNotebookLMImportJobs(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	page := parsePositiveInt(c.Query("page"), 1)
	limit := parsePositiveInt(c.Query("limit"), 10)
	if limit > 50 {
		limit = 50
	}

	query := database.DB.Model(&models.NotebookLMImportJob{}).Where("user_id = ?", userID)

	if notebookID := strings.TrimSpace(c.Query("notebook_id")); notebookID != "" {
		query = query.Where("notebook_id = ?", notebookID)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if sourceType := strings.TrimSpace(c.Query("source_type")); sourceType != "" {
		query = query.Where("source_type = ?", sourceType)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "统计导入任务失败",
			"details": err.Error(),
		})
		return
	}

	var jobs []models.NotebookLMImportJob
	offset := (page - 1) * limit
	if err := query.
		Preload("Notebook").
		Preload("Artifacts", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("is_primary DESC, created_at ASC")
		}).
		Preload("CaptureEvents", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("created_at DESC")
		}).
		Order("updated_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "加载导入任务失败",
			"details": err.Error(),
		})
		return
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages == 0 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": notebookLMImportJobsResponse{
			Jobs: jobs,
			Pagination: gin.H{
				"page":        page,
				"limit":       limit,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

func GetNotebookLMImportJob(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	job, err := findNotebookLMJobByUser(c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    job,
	})
}

func CreateNotebookLMImportJob(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	var req createNotebookLMImportJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	if !isValidNotebookLMSourceType(req.SourceType) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "不支持的资源类型",
		})
		return
	}

	var notebook models.NotebookLMNotebook
	if err := database.DB.Where("id = ? AND user_id = ?", req.NotebookID, userID).First(&notebook).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "目标 Notebook 不存在",
		})
		return
	}

	sourceLabel := strings.TrimSpace(req.SourceLabel)
	if sourceLabel == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "资源标题不能为空",
		})
		return
	}

	captureMode := strings.TrimSpace(req.CaptureMode)
	if captureMode == "" {
		captureMode = defaultCaptureModeForSourceType(req.SourceType)
	}

	status, stage, progress := defaultStateForSourceType(req.SourceType)
	now := time.Now()
	job := models.NotebookLMImportJob{
		UserID:      userID,
		NotebookID:  notebook.ID,
		SourceType:  req.SourceType,
		SourceLabel: sourceLabel,
		SourceInput: req.SourceInput,
		CaptureMode: captureMode,
		Status:      status,
		Stage:       stage,
		Progress:    progress,
		StartedAt:   &now,
	}

	if err := database.DB.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "创建导入任务失败",
			"details": err.Error(),
		})
		return
	}

	if err := database.DB.Preload("Notebook").Preload("Artifacts").Preload("CaptureEvents").First(&job, job.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "加载导入任务失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": defaultCreateMessageForSourceType(req.SourceType),
		"data":    job,
	})
}

func RetryNotebookLMImportJob(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	job, err := findNotebookLMJobByUser(c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	status, stage, progress := defaultStateForSourceType(job.SourceType)
	now := time.Now()
	updates := map[string]interface{}{
		"status":          status,
		"stage":           stage,
		"progress":        progress,
		"error_code":      "",
		"error_message":   "",
		"degraded":        false,
		"degraded_reason": "",
		"started_at":      &now,
		"finished_at":     nil,
	}

	if err := database.DB.Model(job).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "重试导入任务失败",
			"details": err.Error(),
		})
		return
	}

	job, err = findNotebookLMJobByUser(c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "加载导入任务失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "导入任务已重置，可以重新执行",
		"data":    job,
	})
}

func SyncNotebookLMImportJob(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	job, err := findNotebookLMJobByUser(c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	syncedJob, err := notebookLMService().SyncJob(c.Request.Context(), database.DB, job.ID)
	if err != nil {
		c.JSON(statusForNotebookLMError(err), gin.H{
			"success": false,
			"error":   "同步到 NotebookLM 失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "导入任务已同步到 NotebookLM",
		"data":    syncedJob,
	})
}

func UploadNotebookLMImportArtifact(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "无法获取用户信息，请重新登录",
		})
		return
	}

	job, err := findNotebookLMJobByUser(c.Param("id"), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	input, err := parseNotebookLMArtifactUpload(c, models.NotebookLMArtifactOriginAdminUI)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	if closer, ok := input.Reader.(io.Closer); ok {
		defer closer.Close()
	}

	artifact, updatedJob, err := notebookLMService().StoreArtifact(c.Request.Context(), database.DB, job.ID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "上传导入材料失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "导入材料已接收",
		"data": gin.H{
			"artifact": artifact,
			"job":      updatedJob,
		},
	})
}

func GetNotebookLMImportJobForAgent(c *gin.Context) {
	if !authorizeNotebookLMAgent(c) {
		return
	}

	job, err := findNotebookLMJob(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    job,
	})
}

func StartNotebookLMCapture(c *gin.Context) {
	if !authorizeNotebookLMAgent(c) {
		return
	}

	job, err := findNotebookLMJob(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	stage := strings.TrimSpace(c.PostForm("stage"))
	progress := parsePositiveInt(c.PostForm("progress"), 20)
	updatedJob, err := notebookLMService().StartCapture(c.Request.Context(), database.DB, job.ID, stage, progress)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新采集状态失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "采集状态已更新",
		"data":    updatedJob,
	})
}

func UploadNotebookLMArtifactFromAgent(c *gin.Context) {
	if !authorizeNotebookLMAgent(c) {
		return
	}

	job, err := findNotebookLMJob(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	input, err := parseNotebookLMArtifactUpload(c, models.NotebookLMArtifactOriginDesktopAgent)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
	if closer, ok := input.Reader.(io.Closer); ok {
		defer closer.Close()
	}

	artifact, updatedJob, err := notebookLMService().StoreArtifact(c.Request.Context(), database.DB, job.ID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "上传采集结果失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "采集结果已上传",
		"data": gin.H{
			"artifact": artifact,
			"job":      updatedJob,
		},
	})
}

func FinalizeNotebookLMCapture(c *gin.Context) {
	if !authorizeNotebookLMAgent(c) {
		return
	}

	job, err := findNotebookLMJob(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	var req finalizeNotebookLMCaptureRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	updatedJob, err := notebookLMService().FinalizeCapture(c.Request.Context(), database.DB, job.ID, services.NotebookLMCaptureFinalizeInput{
		Stage:          req.Stage,
		Progress:       req.Progress,
		ErrorCode:      req.ErrorCode,
		ErrorMessage:   req.ErrorMessage,
		Degraded:       req.Degraded,
		DegradedReason: req.DegradedReason,
		AutoSync:       req.AutoSync,
	})
	if err != nil {
		c.JSON(statusForNotebookLMError(err), gin.H{
			"success": false,
			"error":   "结束采集失败",
			"details": err.Error(),
		})
		return
	}

	message := "采集阶段已结束"
	if req.AutoSync {
		message = "采集结果已提交并尝试同步到 NotebookLM"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data":    updatedJob,
	})
}

func ReportNotebookLMCaptureEvent(c *gin.Context) {
	if !authorizeNotebookLMAgent(c) {
		return
	}

	job, err := findNotebookLMJob(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "导入任务不存在",
		})
		return
	}

	var req reportNotebookLMCaptureEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数无效",
			"details": err.Error(),
		})
		return
	}

	event, err := createNotebookLMCaptureEvent(job.ID, req.EventKind, req.Summary, defaultStringValue(req.Origin, models.NotebookLMArtifactOriginDesktopAgent), req.Payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "记录采集事件失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "采集事件已记录",
		"data":    event,
	})
}

func notebookLMService() *services.NotebookLMService {
	return services.NewNotebookLMService(config.GlobalConfig)
}

func authorizeNotebookLMAgent(c *gin.Context) bool {
	token := getNotebookLMAgentToken(c)
	if !notebookLMService().ValidateAgentToken(token) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "桌面代理 token 无效",
		})
		return false
	}
	return true
}

func getNotebookLMAgentToken(c *gin.Context) string {
	if token := strings.TrimSpace(c.GetHeader("X-NotebookLM-Agent-Token")); token != "" {
		return token
	}

	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}

	return ""
}

func parseNotebookLMArtifactUpload(c *gin.Context, defaultOrigin string) (services.NotebookLMArtifactUpload, error) {
	input := services.NotebookLMArtifactUpload{
		ArtifactKind: strings.TrimSpace(c.PostForm("artifact_kind")),
		Filename:     strings.TrimSpace(c.PostForm("filename")),
		MimeType:     strings.TrimSpace(c.PostForm("mime_type")),
		Origin:       strings.TrimSpace(c.PostForm("origin")),
		TextContent:  c.PostForm("text_content"),
	}

	if input.Origin == "" {
		input.Origin = defaultOrigin
	}

	if rawPrimary := strings.TrimSpace(c.PostForm("is_primary")); rawPrimary != "" {
		input.IsPrimary = rawPrimary == "true" || rawPrimary == "1"
	} else {
		input.IsPrimary = true
	}

	if metadata := strings.TrimSpace(c.PostForm("metadata")); metadata != "" {
		parsed := make(map[string]interface{})
		if err := json.Unmarshal([]byte(metadata), &parsed); err != nil {
			return services.NotebookLMArtifactUpload{}, errors.New("metadata 不是合法 JSON")
		}
		input.Metadata = parsed
	}

	file, header, err := c.Request.FormFile("file")
	if err == nil {
		input.Reader = file
		input.Size = header.Size
		if input.Filename == "" {
			input.Filename = header.Filename
		}
		if input.MimeType == "" {
			input.MimeType = header.Header.Get("Content-Type")
		}
		if input.Metadata == nil {
			input.Metadata = map[string]interface{}{}
		}
		if _, exists := input.Metadata["original_name"]; !exists {
			input.Metadata["original_name"] = header.Filename
		}
		return input, nil
	}

	if strings.TrimSpace(input.TextContent) == "" {
		return services.NotebookLMArtifactUpload{}, errors.New("请上传文件，或提供 text_content")
	}

	if input.Metadata == nil {
		input.Metadata = map[string]interface{}{}
	}

	return input, nil
}

func findNotebookLMJobByUser(rawID string, userID uint) (*models.NotebookLMImportJob, error) {
	var job models.NotebookLMImportJob
	if err := database.DB.
		Preload("Notebook").
		Preload("Artifacts", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("is_primary DESC, created_at ASC")
		}).
		Preload("CaptureEvents", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("created_at DESC")
		}).
		Where("id = ? AND user_id = ?", rawID, userID).
		First(&job).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

func findNotebookLMJob(rawID string) (*models.NotebookLMImportJob, error) {
	var job models.NotebookLMImportJob
	if err := database.DB.
		Preload("Notebook").
		Preload("Artifacts", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("is_primary DESC, created_at ASC")
		}).
		Preload("CaptureEvents", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("created_at DESC")
		}).
		Where("id = ?", rawID).
		First(&job).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

func statusForNotebookLMError(err error) int {
	switch {
	case errors.Is(err, services.ErrNotebookLMProviderDisabled):
		return http.StatusFailedDependency
	case errors.Is(err, services.ErrNotebookLMNotConfigured):
		return http.StatusFailedDependency
	case errors.Is(err, services.ErrNotebookLMJobNeedsArtifact):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

func parsePositiveInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func isValidNotebookLMSourceType(sourceType string) bool {
	switch sourceType {
	case models.NotebookLMSourceTypeWebURL,
		models.NotebookLMSourceTypeLocalFile,
		models.NotebookLMSourceTypeLocalFolder,
		models.NotebookLMSourceTypeWechatChannel:
		return true
	default:
		return false
	}
}

func defaultCaptureModeForSourceType(sourceType string) string {
	switch sourceType {
	case models.NotebookLMSourceTypeWechatChannel:
		return models.NotebookLMCaptureModeDesktopWatch
	default:
		return models.NotebookLMCaptureModeNone
	}
}

func defaultStateForSourceType(sourceType string) (string, string, int) {
	switch sourceType {
	case models.NotebookLMSourceTypeWechatChannel:
		return models.NotebookLMImportJobStatusAwaitingCapture, "等待桌面侧开始采集", 5
	case models.NotebookLMSourceTypeLocalFile:
		return models.NotebookLMImportJobStatusArtifactReceived, "已记录本地文件，准备同步到 NotebookLM", 30
	case models.NotebookLMSourceTypeLocalFolder:
		return models.NotebookLMImportJobStatusCreated, "已记录本地文件夹，等待批量上传接入", 15
	case models.NotebookLMSourceTypeWebURL:
		return models.NotebookLMImportJobStatusCreated, "已记录公开链接，准备同步到 NotebookLM", 15
	default:
		return models.NotebookLMImportJobStatusCreated, "任务已创建", 0
	}
}

func defaultCreateMessageForSourceType(sourceType string) string {
	switch sourceType {
	case models.NotebookLMSourceTypeWechatChannel:
		return "微信视频号导入任务已创建，请在桌面微信中打开目标视频"
	case models.NotebookLMSourceTypeLocalFile:
		return "本地文件导入任务已创建，可以立即同步到 NotebookLM"
	case models.NotebookLMSourceTypeLocalFolder:
		return "本地文件夹导入任务已创建，下一步可继续接入批量上传"
	case models.NotebookLMSourceTypeWebURL:
		return "链接导入任务已创建，可以立即同步到 NotebookLM"
	default:
		return "导入任务已创建"
	}
}

func createNotebookLMCaptureEvent(jobID uint, eventKind, summary, origin string, payload map[string]interface{}) (*models.NotebookLMCaptureEvent, error) {
	event := &models.NotebookLMCaptureEvent{
		JobID:     jobID,
		EventKind: strings.TrimSpace(eventKind),
		Summary:   strings.TrimSpace(summary),
		Origin:    strings.TrimSpace(origin),
		Payload:   payload,
	}
	if event.EventKind == "" {
		event.EventKind = models.NotebookLMCaptureEventKindScanPreview
	}
	if event.Origin == "" {
		event.Origin = models.NotebookLMArtifactOriginSystem
	}
	if event.Payload == nil {
		event.Payload = map[string]interface{}{}
	}
	if err := database.DB.Create(event).Error; err != nil {
		return nil, err
	}
	return event, nil
}

func defaultStringValue(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}
