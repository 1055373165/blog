package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"blog-backend/internal/config"
	"blog-backend/internal/models"
)

var (
	ErrNotebookLMProviderDisabled = errors.New("NotebookLM provider is disabled")
	ErrNotebookLMNotConfigured    = errors.New("NotebookLM provider is not fully configured")
	ErrNotebookLMJobNeedsArtifact = errors.New("the import job needs at least one artifact before syncing")
)

type NotebookLMService struct {
	client        *http.Client
	enabled       bool
	mockMode      bool
	apiBaseURL    string
	projectNumber string
	location      string
	accessToken   string
	agentToken    string
	uploadRoot    string
}

type NotebookLMArtifactUpload struct {
	ArtifactKind string
	Filename     string
	MimeType     string
	Origin       string
	IsPrimary    bool
	Metadata     map[string]interface{}
	TextContent  string
	Reader       io.Reader
	Size         int64
}

type NotebookLMCaptureFinalizeInput struct {
	Stage          string
	Progress       int
	ErrorCode      string
	ErrorMessage   string
	Degraded       bool
	DegradedReason string
	AutoSync       bool
}

type NotebookLMSyncSummary struct {
	SourceCount     int
	UsedDegradation bool
	DegradedReason  string
}

type notebookLMNotebookRequest struct {
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}

type notebookLMNotebookResponse struct {
	Name string `json:"name"`
}

type notebookLMTextContent struct {
	SourceName string `json:"sourceName,omitempty"`
	Content    string `json:"content"`
}

type notebookLMWebContent struct {
	URL        string `json:"url"`
	SourceName string `json:"sourceName,omitempty"`
}

type notebookLMVideoContent struct {
	YouTubeURL string `json:"youtubeUrl"`
}

type notebookLMUserContent struct {
	TextContent  *notebookLMTextContent  `json:"textContent,omitempty"`
	WebContent   *notebookLMWebContent   `json:"webContent,omitempty"`
	VideoContent *notebookLMVideoContent `json:"videoContent,omitempty"`
}

type notebookLMBatchCreateSourcesRequest struct {
	UserContents []notebookLMUserContent `json:"userContents"`
}

type notebookLMBatchCreateSourcesResponse struct {
	Sources []struct {
		Name     string `json:"name"`
		Title    string `json:"title"`
		SourceID struct {
			ID string `json:"id"`
		} `json:"sourceId"`
	} `json:"sources"`
}

func NewNotebookLMService(cfg *config.Config) *NotebookLMService {
	service := &NotebookLMService{
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
		apiBaseURL: "https://discoveryengine.googleapis.com",
		location:   "global",
	}

	if cfg == nil {
		return service
	}

	service.enabled = cfg.NotebookLM.Enabled
	service.mockMode = cfg.NotebookLM.MockMode
	service.apiBaseURL = strings.TrimRight(strings.TrimSpace(cfg.NotebookLM.APIBaseURL), "/")
	service.projectNumber = strings.TrimSpace(cfg.NotebookLM.ProjectNumber)
	service.location = strings.TrimSpace(cfg.NotebookLM.Location)
	service.accessToken = strings.TrimSpace(cfg.NotebookLM.AccessToken)
	service.agentToken = strings.TrimSpace(cfg.NotebookLM.AgentToken)
	service.uploadRoot = strings.TrimSpace(cfg.Upload.Path)

	if service.apiBaseURL == "" {
		service.apiBaseURL = "https://discoveryengine.googleapis.com"
	}
	if service.location == "" {
		service.location = "global"
	}
	if cfg.NotebookLM.Timeout > 0 {
		service.client.Timeout = cfg.NotebookLM.Timeout
	}

	return service
}

func (s *NotebookLMService) IsAgentEnabled() bool {
	return s.agentToken != ""
}

func (s *NotebookLMService) ValidateAgentToken(token string) bool {
	token = strings.TrimSpace(token)
	if token == "" || s.agentToken == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(token), []byte(s.agentToken)) == 1
}

func (s *NotebookLMService) StartCapture(ctx context.Context, db *gorm.DB, jobID uint, stage string, progress int) (*models.NotebookLMImportJob, error) {
	job, err := s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":     models.NotebookLMImportJobStatusCapturing,
		"stage":      defaultString(stage, "桌面代理正在采集内容"),
		"progress":   clampProgress(progress, 18, 45),
		"started_at": &now,
	}

	if err := db.Model(job).Updates(updates).Error; err != nil {
		return nil, err
	}

	return s.loadJob(ctx, db, jobID)
}

func (s *NotebookLMService) StoreArtifact(ctx context.Context, db *gorm.DB, jobID uint, input NotebookLMArtifactUpload) (*models.NotebookLMImportArtifact, *models.NotebookLMImportJob, error) {
	job, err := s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, nil, err
	}

	artifactKind := normalizeArtifactKind(input.ArtifactKind, input.TextContent != "")
	origin := strings.TrimSpace(input.Origin)
	if origin == "" {
		origin = models.NotebookLMArtifactOriginSystem
	}

	filename := strings.TrimSpace(input.Filename)
	if filename == "" {
		filename = defaultArtifactFilename(artifactKind, input.MimeType, input.TextContent != "")
	}

	metadata := cloneMetadata(input.Metadata)
	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	if metadata["display_name"] == nil {
		metadata["display_name"] = filename
	}

	reader := input.Reader
	if reader == nil {
		reader = strings.NewReader(input.TextContent)
	}

	relativePath, fileSize, checksum, err := s.persistArtifactFile(job.ID, filename, reader)
	if err != nil {
		return nil, nil, err
	}

	mimeType := strings.TrimSpace(input.MimeType)
	if mimeType == "" {
		mimeType = mime.TypeByExtension(strings.ToLower(filepath.Ext(filename)))
	}
	if mimeType == "" {
		if input.TextContent != "" {
			mimeType = "text/plain; charset=utf-8"
		} else {
			mimeType = "application/octet-stream"
		}
	}

	if input.IsPrimary {
		if err := db.Model(&models.NotebookLMImportArtifact{}).
			Where("job_id = ?", job.ID).
			Update("is_primary", false).Error; err != nil {
			return nil, nil, err
		}
	}

	artifact := &models.NotebookLMImportArtifact{
		JobID:        job.ID,
		ArtifactKind: artifactKind,
		StorageType:  models.NotebookLMArtifactStorageTypeLocalFile,
		StoragePath:  relativePath,
		MimeType:     mimeType,
		FileSize:     fileSize,
		Checksum:     checksum,
		Origin:       origin,
		IsPrimary:    input.IsPrimary,
		Metadata:     metadata,
	}

	if err := db.Create(artifact).Error; err != nil {
		return nil, nil, err
	}

	stage := "已接收导入材料，等待同步到 NotebookLM"
	if job.SourceType == models.NotebookLMSourceTypeWechatChannel {
		stage = "桌面代理已上传内容，等待同步到 NotebookLM"
	}

	if err := db.Model(job).Updates(map[string]interface{}{
		"status":        models.NotebookLMImportJobStatusArtifactReceived,
		"stage":         stage,
		"progress":      42,
		"error_code":    "",
		"error_message": "",
	}).Error; err != nil {
		return nil, nil, err
	}

	updatedJob, err := s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, nil, err
	}

	return artifact, updatedJob, nil
}

func (s *NotebookLMService) FinalizeCapture(ctx context.Context, db *gorm.DB, jobID uint, input NotebookLMCaptureFinalizeInput) (*models.NotebookLMImportJob, error) {
	job, err := s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(input.ErrorMessage) != "" {
		now := time.Now()
		if err := db.Model(job).Updates(map[string]interface{}{
			"status":          models.NotebookLMImportJobStatusFailed,
			"stage":           defaultString(input.Stage, "桌面采集失败"),
			"progress":        clampProgress(input.Progress, 10, 100),
			"error_code":      strings.TrimSpace(input.ErrorCode),
			"error_message":   strings.TrimSpace(input.ErrorMessage),
			"degraded":        input.Degraded,
			"degraded_reason": strings.TrimSpace(input.DegradedReason),
			"finished_at":     &now,
		}).Error; err != nil {
			return nil, err
		}
		return s.loadJob(ctx, db, jobID)
	}

	if err := db.Model(job).Updates(map[string]interface{}{
		"status":          models.NotebookLMImportJobStatusArtifactReceived,
		"stage":           defaultString(input.Stage, "桌面采集已结束，等待同步到 NotebookLM"),
		"progress":        clampProgress(input.Progress, 45, 60),
		"degraded":        input.Degraded,
		"degraded_reason": strings.TrimSpace(input.DegradedReason),
	}).Error; err != nil {
		return nil, err
	}

	if !input.AutoSync {
		return s.loadJob(ctx, db, jobID)
	}

	return s.SyncJob(ctx, db, jobID)
}

func (s *NotebookLMService) SyncJob(ctx context.Context, db *gorm.DB, jobID uint) (*models.NotebookLMImportJob, error) {
	job, err := s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, err
	}

	if err := db.Model(job).Updates(map[string]interface{}{
		"status":        models.NotebookLMImportJobStatusProcessing,
		"stage":         "正在整理导入材料",
		"progress":      56,
		"error_code":    "",
		"error_message": "",
	}).Error; err != nil {
		return nil, err
	}

	job, err = s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, err
	}

	if err := s.ensureSourceArtifacts(ctx, db, job); err != nil {
		return s.failJob(db, job, "artifact_prepare_failed", err)
	}

	job, err = s.loadJob(ctx, db, jobID)
	if err != nil {
		return nil, err
	}

	if err := s.ensureRemoteNotebook(ctx, db, &job.Notebook); err != nil {
		return s.failJob(db, job, "notebook_prepare_failed", err)
	}

	if err := db.Model(job).Updates(map[string]interface{}{
		"status":   models.NotebookLMImportJobStatusSyncing,
		"stage":    "正在把内容同步到 NotebookLM",
		"progress": 74,
	}).Error; err != nil {
		return nil, err
	}

	summary, err := s.syncJobSources(ctx, job)
	if err != nil {
		return s.failJob(db, job, "sync_failed", err)
	}

	now := time.Now()
	status := models.NotebookLMImportJobStatusCompleted
	stage := fmt.Sprintf("已同步 %d 个 source 到 NotebookLM", summary.SourceCount)
	degraded := summary.UsedDegradation || job.Degraded
	degradedReason := summary.DegradedReason
	if degradedReason == "" {
		degradedReason = job.DegradedReason
	}
	if degraded {
		status = models.NotebookLMImportJobStatusCompletedWithDegradation
		if degradedReason == "" {
			degradedReason = "未能拿到完整原始材料，已使用降级结果完成导入"
		}
	}

	if err := db.Model(job).Updates(map[string]interface{}{
		"status":          status,
		"stage":           stage,
		"progress":        100,
		"degraded":        degraded,
		"degraded_reason": degradedReason,
		"finished_at":     &now,
	}).Error; err != nil {
		return nil, err
	}

	if err := db.Model(&job.Notebook).Updates(map[string]interface{}{
		"last_synced_at": &now,
		"status":         models.NotebookLMNotebookStatusReady,
	}).Error; err != nil {
		return nil, err
	}

	return s.loadJob(ctx, db, jobID)
}

func (s *NotebookLMService) loadJob(ctx context.Context, db *gorm.DB, jobID uint) (*models.NotebookLMImportJob, error) {
	var job models.NotebookLMImportJob
	if err := db.WithContext(ctx).
		Preload("Notebook").
		Preload("Artifacts", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("is_primary DESC, created_at ASC")
		}).
		Preload("CaptureEvents", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("created_at DESC")
		}).
		First(&job, jobID).Error; err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *NotebookLMService) failJob(db *gorm.DB, job *models.NotebookLMImportJob, code string, cause error) (*models.NotebookLMImportJob, error) {
	now := time.Now()
	updateErr := db.Model(job).Updates(map[string]interface{}{
		"status":        models.NotebookLMImportJobStatusFailed,
		"stage":         "同步到 NotebookLM 失败",
		"progress":      clampProgress(job.Progress, 15, 100),
		"error_code":    code,
		"error_message": cause.Error(),
		"finished_at":   &now,
	}).Error
	if updateErr != nil {
		return nil, updateErr
	}
	return s.loadJob(context.Background(), db, job.ID)
}

func (s *NotebookLMService) ensureSourceArtifacts(ctx context.Context, db *gorm.DB, job *models.NotebookLMImportJob) error {
	if job.SourceType != models.NotebookLMSourceTypeLocalFile {
		return nil
	}
	if len(job.Artifacts) > 0 {
		return nil
	}

	uploadedURL := getStringValue(job.SourceInput, "uploaded_url")
	if uploadedURL == "" {
		return nil
	}

	relativePath, err := resolveRelativeUploadPathFromURL(uploadedURL)
	if err != nil {
		return err
	}

	filename := getStringValue(job.SourceInput, "original_name")
	if filename == "" {
		filename = getStringValue(job.SourceInput, "filename")
	}
	if filename == "" {
		filename = filepath.Base(relativePath)
	}

	mimeType := getStringValue(job.SourceInput, "mime_type")
	metadata := map[string]interface{}{
		"display_name":  filename,
		"uploaded_url":  uploadedURL,
		"original_name": getStringValue(job.SourceInput, "original_name"),
	}

	absolutePath := s.absoluteUploadPath(relativePath)
	stat, statErr := os.Stat(absolutePath)
	if statErr != nil {
		return fmt.Errorf("无法定位已上传文件: %w", statErr)
	}

	checksum, checksumErr := checksumFile(absolutePath)
	if checksumErr != nil {
		return checksumErr
	}

	artifact := models.NotebookLMImportArtifact{
		JobID:        job.ID,
		ArtifactKind: models.NotebookLMArtifactKindSourceFile,
		StorageType:  models.NotebookLMArtifactStorageTypeLocalFile,
		StoragePath:  filepath.ToSlash(relativePath),
		MimeType:     defaultString(mimeType, mime.TypeByExtension(strings.ToLower(filepath.Ext(filename)))),
		FileSize:     stat.Size(),
		Checksum:     checksum,
		Origin:       models.NotebookLMArtifactOriginAdminUI,
		IsPrimary:    true,
		Metadata:     metadata,
	}

	if err := db.WithContext(ctx).Create(&artifact).Error; err != nil {
		return err
	}

	return nil
}

func (s *NotebookLMService) syncJobSources(ctx context.Context, job *models.NotebookLMImportJob) (NotebookLMSyncSummary, error) {
	if job.SourceType == models.NotebookLMSourceTypeWebURL {
		urlValue := getStringValue(job.SourceInput, "public_url")
		if urlValue == "" {
			return NotebookLMSyncSummary{}, fmt.Errorf("缺少公开链接")
		}

		if isLikelyYouTubeURL(urlValue) {
			if _, err := s.batchCreateSources(ctx, job.Notebook.ProviderNotebookID, []notebookLMUserContent{{
				VideoContent: &notebookLMVideoContent{YouTubeURL: urlValue},
			}}); err != nil {
				return NotebookLMSyncSummary{}, err
			}
			return NotebookLMSyncSummary{SourceCount: 1}, nil
		}

		if _, err := s.batchCreateSources(ctx, job.Notebook.ProviderNotebookID, []notebookLMUserContent{{
			WebContent: &notebookLMWebContent{
				URL:        urlValue,
				SourceName: job.SourceLabel,
			},
		}}); err != nil {
			return NotebookLMSyncSummary{}, err
		}
		return NotebookLMSyncSummary{SourceCount: 1}, nil
	}

	if len(job.Artifacts) == 0 {
		return NotebookLMSyncSummary{}, ErrNotebookLMJobNeedsArtifact
	}

	var (
		sourceCount         int
		hasBinarySource     bool
		hasTranscriptSource bool
	)

	for _, artifact := range job.Artifacts {
		switch artifact.ArtifactKind {
		case models.NotebookLMArtifactKindTranscript, models.NotebookLMArtifactKindText:
			textContent, err := s.readArtifactText(artifact)
			if err != nil {
				return NotebookLMSyncSummary{}, err
			}
			if strings.TrimSpace(textContent) == "" {
				continue
			}
			if _, err := s.batchCreateSources(ctx, job.Notebook.ProviderNotebookID, []notebookLMUserContent{{
				TextContent: &notebookLMTextContent{
					SourceName: displayNameForArtifact(artifact),
					Content:    textContent,
				},
			}}); err != nil {
				return NotebookLMSyncSummary{}, err
			}
			sourceCount++
			hasTranscriptSource = true
		default:
			if !artifact.IsPrimary && job.SourceType != models.NotebookLMSourceTypeLocalFolder {
				continue
			}
			if err := s.uploadArtifactFile(ctx, job.Notebook.ProviderNotebookID, artifact); err != nil {
				return NotebookLMSyncSummary{}, err
			}
			sourceCount++
			hasBinarySource = true
		}
	}

	if sourceCount == 0 {
		return NotebookLMSyncSummary{}, ErrNotebookLMJobNeedsArtifact
	}

	if !hasBinarySource && hasTranscriptSource {
		return NotebookLMSyncSummary{
			SourceCount:     sourceCount,
			UsedDegradation: true,
			DegradedReason:  "未拿到原始文件，已降级为 transcript / 文本导入",
		}, nil
	}

	return NotebookLMSyncSummary{SourceCount: sourceCount}, nil
}

func (s *NotebookLMService) ensureRemoteNotebook(ctx context.Context, db *gorm.DB, notebook *models.NotebookLMNotebook) error {
	if notebook.ProviderNotebookID != "" {
		return nil
	}

	if s.mockMode {
		mockID := fmt.Sprintf("mock-notebook-%d", notebook.ID)
		now := time.Now()
		return db.Model(notebook).Updates(map[string]interface{}{
			"provider_notebook_id": mockID,
			"status":               models.NotebookLMNotebookStatusReady,
			"last_synced_at":       &now,
		}).Error
	}

	if !s.enabled {
		return ErrNotebookLMProviderDisabled
	}
	if s.projectNumber == "" || s.accessToken == "" {
		return ErrNotebookLMNotConfigured
	}

	endpoint := fmt.Sprintf("%s/v1alpha/projects/%s/locations/%s/notebooks", s.apiBaseURL, s.projectNumber, s.location)
	body := notebookLMNotebookRequest{
		Title:       notebook.Title,
		Description: notebook.Description,
	}

	var response notebookLMNotebookResponse
	if err := s.doJSONRequest(ctx, http.MethodPost, endpoint, body, &response); err != nil {
		return err
	}

	providerNotebookID := extractLastPathSegment(response.Name)
	if providerNotebookID == "" {
		return fmt.Errorf("NotebookLM 返回的 notebook 名称为空")
	}

	return db.Model(notebook).Updates(map[string]interface{}{
		"provider_notebook_id": providerNotebookID,
		"status":               models.NotebookLMNotebookStatusReady,
	}).Error
}

func (s *NotebookLMService) batchCreateSources(ctx context.Context, providerNotebookID string, userContents []notebookLMUserContent) (*notebookLMBatchCreateSourcesResponse, error) {
	if s.mockMode {
		return &notebookLMBatchCreateSourcesResponse{
			Sources: []struct {
				Name     string `json:"name"`
				Title    string `json:"title"`
				SourceID struct {
					ID string `json:"id"`
				} `json:"sourceId"`
			}{
				{
					Name:  fmt.Sprintf("mock-source/%d", time.Now().UnixNano()),
					Title: "mock-source",
				},
			},
		}, nil
	}

	if !s.enabled {
		return nil, ErrNotebookLMProviderDisabled
	}
	if s.projectNumber == "" || s.accessToken == "" || providerNotebookID == "" {
		return nil, ErrNotebookLMNotConfigured
	}

	endpoint := fmt.Sprintf("%s/v1alpha/projects/%s/locations/%s/notebooks/%s/sources:batchCreate", s.apiBaseURL, s.projectNumber, s.location, providerNotebookID)
	requestBody := notebookLMBatchCreateSourcesRequest{
		UserContents: userContents,
	}

	var response notebookLMBatchCreateSourcesResponse
	if err := s.doJSONRequest(ctx, http.MethodPost, endpoint, requestBody, &response); err != nil {
		return nil, err
	}

	return &response, nil
}

func (s *NotebookLMService) uploadArtifactFile(ctx context.Context, providerNotebookID string, artifact models.NotebookLMImportArtifact) error {
	if s.mockMode {
		return nil
	}
	if !s.enabled {
		return ErrNotebookLMProviderDisabled
	}
	if s.projectNumber == "" || s.accessToken == "" || providerNotebookID == "" {
		return ErrNotebookLMNotConfigured
	}

	absolutePath := s.absoluteUploadPath(artifact.StoragePath)
	file, err := os.Open(absolutePath)
	if err != nil {
		return err
	}
	defer file.Close()

	mimeType := strings.TrimSpace(artifact.MimeType)
	if mimeType == "" {
		mimeType = mime.TypeByExtension(strings.ToLower(filepath.Ext(absolutePath)))
	}
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	endpoint := fmt.Sprintf("%s/upload/v1alpha/projects/%s/locations/%s/notebooks/%s/sources:uploadFile", s.apiBaseURL, s.projectNumber, s.location, providerNotebookID)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, file)
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+s.accessToken)
	request.Header.Set("Content-Type", mimeType)
	request.Header.Set("X-Goog-Upload-Protocol", "raw")
	request.Header.Set("X-Goog-Upload-File-Name", displayNameForArtifact(artifact))

	response, err := s.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("NotebookLM 文件上传失败: %s", strings.TrimSpace(string(body)))
	}

	return nil
}

func (s *NotebookLMService) doJSONRequest(ctx context.Context, method, endpoint string, payload interface{}, out interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}

	request.Header.Set("Authorization", "Bearer "+s.accessToken)
	request.Header.Set("Content-Type", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("NotebookLM 请求失败: %s", strings.TrimSpace(string(bodyBytes)))
	}

	if out == nil {
		return nil
	}

	return json.NewDecoder(response.Body).Decode(out)
}

func (s *NotebookLMService) persistArtifactFile(jobID uint, filename string, reader io.Reader) (string, int64, string, error) {
	now := time.Now()
	safeFilename := sanitizeFilename(filename)
	relativePath := filepath.ToSlash(filepath.Join(
		"notebooklm",
		"jobs",
		fmt.Sprintf("%d", jobID),
		now.Format("2006"),
		now.Format("01"),
		now.Format("02"),
		safeFilename,
	))

	absolutePath := s.absoluteUploadPath(relativePath)
	if err := os.MkdirAll(filepath.Dir(absolutePath), 0755); err != nil {
		return "", 0, "", err
	}

	file, err := os.Create(absolutePath)
	if err != nil {
		return "", 0, "", err
	}
	defer file.Close()

	hasher := sha256.New()
	written, err := io.Copy(io.MultiWriter(file, hasher), reader)
	if err != nil {
		return "", 0, "", err
	}

	return relativePath, written, hex.EncodeToString(hasher.Sum(nil)), nil
}

func (s *NotebookLMService) readArtifactText(artifact models.NotebookLMImportArtifact) (string, error) {
	absolutePath := s.absoluteUploadPath(artifact.StoragePath)
	body, err := os.ReadFile(absolutePath)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func (s *NotebookLMService) absoluteUploadPath(relativePath string) string {
	trimmed := strings.TrimSpace(relativePath)
	trimmed = strings.TrimPrefix(trimmed, "/")
	if s.uploadRoot == "" {
		return trimmed
	}
	return filepath.Join(s.uploadRoot, filepath.FromSlash(trimmed))
}

func resolveRelativeUploadPathFromURL(rawURL string) (string, error) {
	value := strings.TrimSpace(rawURL)
	if value == "" {
		return "", fmt.Errorf("上传地址为空")
	}

	if parsed, err := url.Parse(value); err == nil && parsed.Path != "" {
		value = parsed.Path
	}

	value = strings.ReplaceAll(value, "\\", "/")

	switch {
	case strings.Contains(value, "/api/upload/file/"):
		return filepath.ToSlash(filepath.Join("files", strings.TrimPrefix(strings.SplitN(value, "/api/upload/file/", 2)[1], "/"))), nil
	case strings.Contains(value, "/uploads/files/"):
		return filepath.ToSlash(filepath.Join("files", strings.TrimPrefix(strings.SplitN(value, "/uploads/files/", 2)[1], "/"))), nil
	case strings.Contains(value, "/api/upload/media/"):
		return filepath.ToSlash(filepath.Join("media", strings.TrimPrefix(strings.SplitN(value, "/api/upload/media/", 2)[1], "/"))), nil
	case strings.Contains(value, "/uploads/media/"):
		return filepath.ToSlash(filepath.Join("media", strings.TrimPrefix(strings.SplitN(value, "/uploads/media/", 2)[1], "/"))), nil
	default:
		return "", fmt.Errorf("无法识别上传地址: %s", rawURL)
	}
}

func normalizeArtifactKind(kind string, hasInlineText bool) string {
	switch strings.TrimSpace(kind) {
	case models.NotebookLMArtifactKindTranscript:
		return models.NotebookLMArtifactKindTranscript
	case models.NotebookLMArtifactKindText:
		return models.NotebookLMArtifactKindText
	case models.NotebookLMArtifactKindMetadata:
		return models.NotebookLMArtifactKindMetadata
	case models.NotebookLMArtifactKindSourceFile:
		return models.NotebookLMArtifactKindSourceFile
	default:
		if hasInlineText {
			return models.NotebookLMArtifactKindText
		}
		return models.NotebookLMArtifactKindSourceFile
	}
}

func defaultArtifactFilename(artifactKind, mimeType string, hasInlineText bool) string {
	base := artifactKind
	if base == "" {
		base = "artifact"
	}
	ext := filepath.Ext(base)
	if ext != "" {
		return sanitizeFilename(base)
	}

	switch {
	case hasInlineText || strings.HasPrefix(strings.TrimSpace(mimeType), "text/"):
		return sanitizeFilename(base + ".txt")
	default:
		if guessed, err := mime.ExtensionsByType(mimeType); err == nil && len(guessed) > 0 {
			return sanitizeFilename(base + guessed[0])
		}
		return sanitizeFilename(base + ".bin")
	}
}

func sanitizeFilename(name string) string {
	name = filepath.Base(strings.TrimSpace(name))
	if name == "" || name == "." || name == string(filepath.Separator) {
		return fmt.Sprintf("artifact-%d.bin", time.Now().UnixNano())
	}
	replacer := strings.NewReplacer(" ", "-", "/", "-", "\\", "-", ":", "-", "\n", "-", "\r", "-")
	return replacer.Replace(name)
}

func extractLastPathSegment(value string) string {
	value = strings.TrimSpace(value)
	value = strings.TrimSuffix(value, "/")
	if value == "" {
		return ""
	}
	if strings.Contains(value, "/") {
		parts := strings.Split(value, "/")
		return parts[len(parts)-1]
	}
	return value
}

func getStringValue(values map[string]interface{}, key string) string {
	if values == nil {
		return ""
	}
	raw, ok := values[key]
	if !ok || raw == nil {
		return ""
	}
	switch typed := raw.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", typed))
	}
}

func displayNameForArtifact(artifact models.NotebookLMImportArtifact) string {
	if artifact.Metadata != nil {
		if value, ok := artifact.Metadata["display_name"].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
		if value, ok := artifact.Metadata["original_name"].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	if artifact.StoragePath != "" {
		return filepath.Base(artifact.StoragePath)
	}
	return fmt.Sprintf("artifact-%d", artifact.ID)
}

func checksumFile(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}

func clampProgress(progress, min, max int) int {
	if progress < min {
		return min
	}
	if progress > max {
		return max
	}
	return progress
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func cloneMetadata(input map[string]interface{}) map[string]interface{} {
	if input == nil {
		return nil
	}
	output := make(map[string]interface{}, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func isLikelyYouTubeURL(rawURL string) bool {
	value := strings.ToLower(strings.TrimSpace(rawURL))
	return strings.Contains(value, "youtube.com/") || strings.Contains(value, "youtu.be/")
}
