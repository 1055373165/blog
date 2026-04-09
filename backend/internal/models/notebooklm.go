package models

import "time"

const (
	NotebookLMNotebookStatusDraft    = "draft"
	NotebookLMNotebookStatusReady    = "ready"
	NotebookLMNotebookStatusArchived = "archived"

	NotebookLMSourceTypeWebURL        = "web_url"
	NotebookLMSourceTypeLocalFile     = "local_file"
	NotebookLMSourceTypeLocalFolder   = "local_folder"
	NotebookLMSourceTypeWechatChannel = "wechat_channel"

	NotebookLMCaptureModeNone                      = "none"
	NotebookLMCaptureModeDesktopWatch              = "desktop_watch"
	NotebookLMCaptureModeDesktopWatchNetworkAssist = "desktop_watch_with_network_assist"

	NotebookLMImportJobStatusCreated                  = "created"
	NotebookLMImportJobStatusAwaitingCapture          = "awaiting_capture"
	NotebookLMImportJobStatusCapturing                = "capturing"
	NotebookLMImportJobStatusArtifactReceived         = "artifact_received"
	NotebookLMImportJobStatusProcessing               = "processing"
	NotebookLMImportJobStatusSyncing                  = "syncing_to_notebooklm"
	NotebookLMImportJobStatusCompleted                = "completed"
	NotebookLMImportJobStatusCompletedWithDegradation = "completed_with_degradation"
	NotebookLMImportJobStatusFailed                   = "failed"
	NotebookLMImportJobStatusCancelled                = "cancelled"

	NotebookLMArtifactKindSourceFile = "source_file"
	NotebookLMArtifactKindTranscript = "transcript"
	NotebookLMArtifactKindText       = "text"
	NotebookLMArtifactKindMetadata   = "metadata"

	NotebookLMArtifactStorageTypeLocalFile  = "local_file"
	NotebookLMArtifactStorageTypeInlineText = "inline_text"
	NotebookLMArtifactStorageTypePublicURL  = "public_url"

	NotebookLMArtifactOriginAdminUI      = "admin_ui"
	NotebookLMArtifactOriginDesktopAgent = "desktop_agent"
	NotebookLMArtifactOriginSystem       = "system"

	NotebookLMCaptureEventKindDirectoryHints  = "directory_hints"
	NotebookLMCaptureEventKindScanPreview     = "scan_preview"
	NotebookLMCaptureEventKindCandidateFound  = "candidate_found"
	NotebookLMCaptureEventKindUploadCompleted = "upload_completed"
	NotebookLMCaptureEventKindError           = "error"
)

type NotebookLMNotebook struct {
	BaseModel
	UserID             uint       `json:"user_id" gorm:"not null;index"`
	Title              string     `json:"title" gorm:"not null;size:255;index"`
	Description        string     `json:"description" gorm:"type:text"`
	ProviderNotebookID string     `json:"provider_notebook_id" gorm:"size:255;index"`
	Status             string     `json:"status" gorm:"not null;size:20;default:'draft';index"`
	LastSyncedAt       *time.Time `json:"last_synced_at"`

	User User                  `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Jobs []NotebookLMImportJob `json:"jobs,omitempty" gorm:"foreignKey:NotebookID"`
}

func (NotebookLMNotebook) TableName() string {
	return "notebooklm_notebooks"
}

type NotebookLMImportJob struct {
	BaseModel
	UserID         uint                   `json:"user_id" gorm:"not null;index"`
	NotebookID     uint                   `json:"notebook_id" gorm:"not null;index"`
	SourceType     string                 `json:"source_type" gorm:"not null;size:40;index"`
	SourceLabel    string                 `json:"source_label" gorm:"not null;size:255"`
	SourceInput    map[string]interface{} `json:"source_input" gorm:"serializer:json;type:longtext"`
	CaptureMode    string                 `json:"capture_mode" gorm:"not null;size:50;default:'none';index"`
	Status         string                 `json:"status" gorm:"not null;size:40;default:'created';index"`
	Stage          string                 `json:"stage" gorm:"size:255"`
	Progress       int                    `json:"progress" gorm:"default:0"`
	ErrorCode      string                 `json:"error_code" gorm:"size:80"`
	ErrorMessage   string                 `json:"error_message" gorm:"type:text"`
	Degraded       bool                   `json:"degraded" gorm:"default:false"`
	DegradedReason string                 `json:"degraded_reason" gorm:"type:text"`
	StartedAt      *time.Time             `json:"started_at"`
	FinishedAt     *time.Time             `json:"finished_at"`

	User          User                       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Notebook      NotebookLMNotebook         `json:"notebook,omitempty" gorm:"foreignKey:NotebookID"`
	Artifacts     []NotebookLMImportArtifact `json:"artifacts,omitempty" gorm:"foreignKey:JobID"`
	CaptureEvents []NotebookLMCaptureEvent   `json:"capture_events,omitempty" gorm:"foreignKey:JobID"`
}

func (NotebookLMImportJob) TableName() string {
	return "notebooklm_import_jobs"
}

type NotebookLMImportArtifact struct {
	BaseModel
	JobID        uint                   `json:"job_id" gorm:"not null;index"`
	ArtifactKind string                 `json:"artifact_kind" gorm:"not null;size:40;index"`
	StorageType  string                 `json:"storage_type" gorm:"not null;size:40"`
	StoragePath  string                 `json:"storage_path" gorm:"size:500"`
	MimeType     string                 `json:"mime_type" gorm:"size:120"`
	FileSize     int64                  `json:"file_size" gorm:"default:0"`
	Checksum     string                 `json:"checksum" gorm:"size:128"`
	Origin       string                 `json:"origin" gorm:"size:40"`
	IsPrimary    bool                   `json:"is_primary" gorm:"default:false"`
	Metadata     map[string]interface{} `json:"metadata" gorm:"serializer:json;type:longtext"`

	Job NotebookLMImportJob `json:"-" gorm:"foreignKey:JobID"`
}

func (NotebookLMImportArtifact) TableName() string {
	return "notebooklm_import_artifacts"
}

type NotebookLMCaptureEvent struct {
	BaseModel
	JobID     uint                   `json:"job_id" gorm:"not null;index"`
	EventKind string                 `json:"event_kind" gorm:"not null;size:40;index"`
	Summary   string                 `json:"summary" gorm:"size:255"`
	Origin    string                 `json:"origin" gorm:"size:40;index"`
	Payload   map[string]interface{} `json:"payload" gorm:"serializer:json;type:longtext"`

	Job NotebookLMImportJob `json:"-" gorm:"foreignKey:JobID"`
}

func (NotebookLMCaptureEvent) TableName() string {
	return "notebooklm_capture_events"
}
