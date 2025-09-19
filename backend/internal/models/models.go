package models

import (
	"time"

	"gorm.io/gorm"
)

// BaseModel 基础模型，包含所有表共有的字段
type BaseModel struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// User 用户模型
type User struct {
	BaseModel
	Email    string `json:"email" gorm:"uniqueIndex;not null;size:255"`
	Name     string `json:"name" gorm:"not null;size:255"`
	Password string `json:"-" gorm:"not null;size:255"` // 不在JSON中显示密码
	Avatar   string `json:"avatar"`
	IsAdmin  bool   `json:"is_admin" gorm:"default:false"`

	// 关联关系
	Articles []Article `json:"articles,omitempty" gorm:"foreignKey:AuthorID"`
	Blogs    []Blog    `json:"blogs,omitempty" gorm:"foreignKey:AuthorID"`
}

// Category 分类模型
type Category struct {
	BaseModel
	Name          string `json:"name" gorm:"not null;size:255"`
	Slug          string `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Description   string `json:"description"`
	ParentID      *uint  `json:"parent_id"`
	ArticlesCount int    `json:"articles_count" gorm:"-"` // 不存储到数据库，仅用于API响应
	BlogsCount    int    `json:"blogs_count" gorm:"-"`    // 博客数量统计

	// 关联关系
	Parent   *Category  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []Category `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Articles []Article  `json:"articles,omitempty" gorm:"foreignKey:CategoryID"`
	Blogs    []Blog     `json:"blogs,omitempty" gorm:"foreignKey:CategoryID"`
}

// Tag 标签模型
type Tag struct {
	BaseModel
	Name          string `json:"name" gorm:"not null;size:255"`
	Slug          string `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Color         string `json:"color"`
	ArticlesCount int    `json:"articles_count" gorm:"-"` // 不存储到数据库
	BlogsCount    int    `json:"blogs_count" gorm:"-"`    // 博客数量统计

	// 关联关系
	Articles []Article `json:"articles,omitempty" gorm:"many2many:article_tags;"`
	Blogs    []Blog    `json:"blogs,omitempty" gorm:"many2many:blog_tags;"`
}

// Series 系列模型
type Series struct {
	BaseModel
	Name          string `json:"name" gorm:"not null;size:255"`
	Slug          string `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Description   string `json:"description"`
	ArticlesCount int    `json:"articles_count" gorm:"-"`

	// 关联关系
	Articles []Article `json:"articles,omitempty" gorm:"foreignKey:SeriesID"`
}

// Blog 博客模型（音频/视频内容）
type Blog struct {
	BaseModel
	Title       string `json:"title" gorm:"not null;size:255"`
	Slug        string `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Description string `json:"description" gorm:"type:text"`
	Content     string `json:"content" gorm:"type:longtext"`
	Type        string `json:"type" gorm:"not null;size:20;check:type IN ('audio','video')"` // audio 或 video

	// 媒体文件信息
	MediaURL  string  `json:"media_url" gorm:"not null;size:500"`
	Thumbnail string  `json:"thumbnail" gorm:"size:500"`
	Duration  float64 `json:"duration" gorm:"default:0"`  // 时长（秒）
	FileSize  int64   `json:"file_size" gorm:"default:0"` // 文件大小（字节）
	MimeType  string  `json:"mime_type" gorm:"size:100"`

	// 音频文件信息（新增）
	AudioURL      string  `json:"audio_url" gorm:"size:500"`        // 音频文件URL
	AudioDuration float64 `json:"audio_duration" gorm:"default:0"` // 音频时长（秒）
	AudioFileSize int64   `json:"audio_file_size" gorm:"default:0"` // 音频文件大小（字节）
	AudioMimeType string  `json:"audio_mime_type" gorm:"size:100"`  // 音频MIME类型

	// 状态字段
	IsPublished bool       `json:"is_published" gorm:"default:false"`
	IsDraft     bool       `json:"is_draft" gorm:"default:true"`
	PublishedAt *time.Time `json:"published_at"`

	// 统计字段
	ViewsCount int `json:"views_count" gorm:"default:0"`
	LikesCount int `json:"likes_count" gorm:"default:0"`

	// 外键
	AuthorID   uint  `json:"author_id" gorm:"not null"`
	CategoryID *uint `json:"category_id"`

	// SEO字段
	MetaTitle       string `json:"meta_title" gorm:"size:255"`
	MetaDescription string `json:"meta_description" gorm:"size:500"`
	MetaKeywords    string `json:"meta_keywords" gorm:"size:500"`

	// 关联关系
	Author   User      `json:"author" gorm:"foreignKey:AuthorID"`
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Tags     []Tag     `json:"tags,omitempty" gorm:"many2many:blog_tags;"`
}

// BlogView 博客浏览记录
type BlogView struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	BlogID    uint      `json:"blog_id" gorm:"not null;index"`
	IP        string    `json:"ip" gorm:"not null;size:45"`
	UserAgent string    `json:"user_agent"`
	ViewedAt  time.Time `json:"viewed_at" gorm:"autoCreateTime"`

	// 关联关系
	Blog Blog `json:"blog" gorm:"foreignKey:BlogID"`
}

// BlogLike 博客点赞记录
type BlogLike struct {
	ID      uint      `json:"id" gorm:"primaryKey"`
	BlogID  uint      `json:"blog_id" gorm:"not null;index"`
	IP      string    `json:"ip" gorm:"not null;size:45"`
	LikedAt time.Time `json:"liked_at" gorm:"autoCreateTime"`

	// 关联关系
	Blog Blog `json:"blog" gorm:"foreignKey:BlogID"`

	// 复合唯一索引，防止重复点赞
	// gorm:"uniqueIndex:idx_blog_ip"
}

// Article 文章模型
type Article struct {
	BaseModel
	Title       string     `json:"title" gorm:"not null;size:255"`
	Slug        string     `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Excerpt     string     `json:"excerpt"`
	Content     string     `json:"content" gorm:"type:longtext"`
	CoverImage  string     `json:"cover_image"`
	IsPublished bool       `json:"is_published" gorm:"default:false"`
	IsDraft     bool       `json:"is_draft" gorm:"default:true"`
	PublishedAt *time.Time `json:"published_at"`
	ReadingTime int        `json:"reading_time" gorm:"default:0"` // 分钟
	ViewsCount  int        `json:"views_count" gorm:"default:0"`
	LikesCount  int        `json:"likes_count" gorm:"default:0"`

	// 外键
	AuthorID    uint  `json:"author_id" gorm:"not null"`
	CategoryID  *uint `json:"category_id"`
	SeriesID    *uint `json:"series_id"`
	SeriesOrder *int  `json:"series_order"`

	// SEO字段
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	MetaKeywords    string `json:"meta_keywords"`

	// 关联关系
	Author   User      `json:"author" gorm:"foreignKey:AuthorID"`
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Series   *Series   `json:"series,omitempty" gorm:"foreignKey:SeriesID"`
	Tags     []Tag     `json:"tags,omitempty" gorm:"many2many:article_tags;"`
}

// ArticleView 文章浏览记录
type ArticleView struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ArticleID uint      `json:"article_id" gorm:"not null;index"`
	IP        string    `json:"ip" gorm:"not null;size:45"`
	UserAgent string    `json:"user_agent"`
	ViewedAt  time.Time `json:"viewed_at" gorm:"autoCreateTime"`

	// 关联关系
	Article Article `json:"article" gorm:"foreignKey:ArticleID"`
}

// ArticleLike 文章点赞记录
type ArticleLike struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ArticleID uint      `json:"article_id" gorm:"not null;index"`
	IP        string    `json:"ip" gorm:"not null;size:45"`
	LikedAt   time.Time `json:"liked_at" gorm:"autoCreateTime"`

	// 关联关系
	Article Article `json:"article" gorm:"foreignKey:ArticleID"`

	// 复合唯一索引，防止重复点赞
	// gorm:"uniqueIndex:idx_article_ip"
}

// SearchIndex 搜索索引模型
type SearchIndex struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ArticleID uint      `json:"article_id" gorm:"not null;uniqueIndex"`
	Title     string    `json:"title" gorm:"not null"`
	Content   string    `json:"content" gorm:"type:text"`
	Keywords  string    `json:"keywords"`
	IndexedAt time.Time `json:"indexed_at" gorm:"autoUpdateTime"`

	// 关联关系
	Article Article `json:"article" gorm:"foreignKey:ArticleID"`
}

// SearchStatistics 搜索统计模型
type SearchStatistics struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Query       string    `json:"query" gorm:"not null;index"`
	IP          string    `json:"ip" gorm:"size:45"`
	UserAgent   string    `json:"user_agent"`
	ResultCount int       `json:"result_count" gorm:"default:0"`
	SearchedAt  time.Time `json:"searched_at" gorm:"autoCreateTime"`
}

// Config 系统配置模型
type Config struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Key         string    `json:"key" gorm:"uniqueIndex;not null;size:255"`
	Value       string    `json:"value" gorm:"type:text"`
	Type        string    `json:"type" gorm:"default:'string'"` // string, int, bool, json
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// 定义表名
func (User) TableName() string             { return "users" }
func (Category) TableName() string         { return "categories" }
func (Tag) TableName() string              { return "tags" }
func (Series) TableName() string           { return "series" }
func (Blog) TableName() string             { return "blogs" }
func (BlogView) TableName() string         { return "blog_views" }
func (BlogLike) TableName() string         { return "blog_likes" }
func (Article) TableName() string          { return "articles" }
func (ArticleView) TableName() string      { return "article_views" }
func (ArticleLike) TableName() string      { return "article_likes" }
func (SearchIndex) TableName() string      { return "search_indexes" }
func (SearchStatistics) TableName() string { return "search_statistics" }
func (Config) TableName() string           { return "configs" }
