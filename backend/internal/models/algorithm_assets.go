package models

import "time"

const (
	AlgorithmAssetStatusDraft    = "draft"
	AlgorithmAssetStatusReady    = "ready"
	AlgorithmAssetStatusArchived = "archived"

	AlgorithmReviewStatusNew          = "new"
	AlgorithmReviewStatusRead         = "read"
	AlgorithmReviewStatusFailedRecall = "failed_recall"
	AlgorithmReviewStatusPassedRecall = "passed_recall"
	AlgorithmReviewStatusNeedsReview  = "needs_review"

	AlgorithmAssetFileKindMarkdown = "markdown"
	AlgorithmAssetFileKindVideo    = "video"

	AlgorithmAssetFileRolePrimaryAnalysis = "primary_analysis"
	AlgorithmAssetFileRoleSupplement      = "supplement"
	AlgorithmAssetFileRoleAnimation       = "animation"
	AlgorithmAssetFileRoleAlternateVideo  = "alternate_animation"
)

// AlgorithmAsset 算法资产模型，一个本地目录对应一个资产。
type AlgorithmAsset struct {
	BaseModel
	Title                 string     `json:"title" gorm:"not null;size:255;index"`
	Slug                  string     `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	LeetCodeID            *uint      `json:"leetcode_id" gorm:"index"`
	SourceURL             string     `json:"source_url" gorm:"size:500"`
	SourceDirName         string     `json:"source_dir_name" gorm:"size:255;index"`
	Description           string     `json:"description" gorm:"type:text"`
	Difficulty            string     `json:"difficulty" gorm:"size:20;index"`
	Tags                  []string   `json:"tags" gorm:"serializer:json;type:longtext"`
	Status                string     `json:"status" gorm:"not null;size:20;default:'draft';index"`
	SummaryNote           string     `json:"summary_note" gorm:"type:text"`
	WeakPoints            string     `json:"weak_points" gorm:"type:text"`
	ReviewStatus          string     `json:"review_status" gorm:"not null;size:20;default:'new';index"`
	NextReviewAt          *time.Time `json:"next_review_at" gorm:"index"`
	PrimaryMarkdownFileID *uint      `json:"primary_markdown_file_id" gorm:"index"`
	PrimaryVideoFileID    *uint      `json:"primary_video_file_id" gorm:"index"`
	AuthorID              uint       `json:"author_id" gorm:"not null;index"`
	MarkdownCount         int        `json:"markdown_count" gorm:"-"`
	VideoCount            int        `json:"video_count" gorm:"-"`

	Author              User                 `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	Files               []AlgorithmAssetFile `json:"files,omitempty" gorm:"foreignKey:AssetID"`
	PrimaryMarkdownFile *AlgorithmAssetFile  `json:"primary_markdown_file,omitempty" gorm:"-"`
	PrimaryVideoFile    *AlgorithmAssetFile  `json:"primary_video_file,omitempty" gorm:"-"`
}

// AlgorithmAssetFile 算法资产文件模型，支持 markdown 和 video 两类文件。
type AlgorithmAssetFile struct {
	BaseModel
	AssetID         uint   `json:"asset_id" gorm:"not null;index"`
	FileKind        string `json:"file_kind" gorm:"not null;size:20;index"`
	Role            string `json:"role" gorm:"size:40;index"`
	DisplayName     string `json:"display_name" gorm:"not null;size:255"`
	OriginalName    string `json:"original_name" gorm:"not null;size:255"`
	SortOrder       int    `json:"sort_order" gorm:"default:0;index"`
	IsPrimary       bool   `json:"is_primary" gorm:"default:false;index"`
	MarkdownContent string `json:"markdown_content" gorm:"type:longtext"`
	StorageURL      string `json:"storage_url" gorm:"size:500"`
	MimeType        string `json:"mime_type" gorm:"size:100"`
	SizeBytes       int64  `json:"size_bytes" gorm:"default:0"`

	Asset AlgorithmAsset `json:"-" gorm:"foreignKey:AssetID"`
}
