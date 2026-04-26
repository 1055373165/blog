package models

import "time"

// ArticleVersion 文章版本快照
//
// 触发场景:
//  1. 用户在编辑器点「保存」，且 content 与库里现值不同 → 系统自动 snapshot（is_autosave=1）
//  2. 用户主动点「设为稳定版本」按钮 → snapshot 后 is_stable=1, is_autosave=0
//  3. 调用「恢复到指定版本」时，会先把当前主表内容存为新 snapshot（防误操作再丢一次）
//
// 数据保留策略（在 service 层实现）:
//  - is_stable=1 的永不自动清理
//  - is_autosave=1 的，每篇文章最多保留最近 N 条（默认 N=20）
type ArticleVersion struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	ArticleID  uint   `json:"article_id" gorm:"not null;index"`
	VersionNo  int    `json:"version_no" gorm:"not null"`
	Label      string `json:"label" gorm:"size:100;default:''"`
	IsStable   bool   `json:"is_stable" gorm:"default:false"`
	IsAutosave bool   `json:"is_autosave" gorm:"default:true"`

	// 文章主体快照
	Title           string `json:"title" gorm:"size:255;not null"`
	Slug            string `json:"slug" gorm:"size:255;not null"`
	Excerpt         string `json:"excerpt" gorm:"type:longtext"`
	Content         string `json:"content" gorm:"type:longtext;not null"`
	CoverImage      string `json:"cover_image" gorm:"type:longtext"`
	MetaTitle       string `json:"meta_title" gorm:"type:longtext"`
	MetaDescription string `json:"meta_description" gorm:"type:longtext"`
	MetaKeywords    string `json:"meta_keywords" gorm:"type:longtext"`

	CreatedBy uint      `json:"created_by" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName 显式表名（GORM 默认会复数化，与我们 migration 文件名保持一致）
func (ArticleVersion) TableName() string { return "article_versions" }
