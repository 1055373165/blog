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
	Email     string `json:"email" gorm:"uniqueIndex;not null;size:255"`
	Name      string `json:"name" gorm:"not null;size:255"`
	Password  string `json:"-" gorm:"not null;size:255"` // 不在JSON中显示密码
	Avatar    string `json:"avatar"`
	IsAdmin   bool   `json:"is_admin" gorm:"default:false"`
	GitHubURL string `json:"github_url" gorm:"size:500"`     // GitHub链接
	Bio       string `json:"bio" gorm:"type:text"`           // 个人简介
	IsActive  bool   `json:"is_active" gorm:"default:true"`  // 用户状态

	// 关联关系
	Articles    []Article    `json:"articles,omitempty" gorm:"foreignKey:AuthorID"`
	Blogs       []Blog       `json:"blogs,omitempty" gorm:"foreignKey:AuthorID"`
	Submissions []Submission `json:"submissions,omitempty" gorm:"foreignKey:AuthorID"`
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
	AuthorID     uint  `json:"author_id" gorm:"not null"`
	CategoryID   *uint `json:"category_id"`
	SeriesID     *uint `json:"series_id"`
	SeriesOrder  *int  `json:"series_order"`
	SubmissionID *uint `json:"submission_id"` // 关联的投稿ID（如果是从投稿发布的）

	// SEO字段
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	MetaKeywords    string `json:"meta_keywords"`

	// 关联关系
	Author     User        `json:"author" gorm:"foreignKey:AuthorID"`
	Category   *Category   `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Series     *Series     `json:"series,omitempty" gorm:"foreignKey:SeriesID"`
	Submission *Submission `json:"submission,omitempty" gorm:"foreignKey:SubmissionID"`
	Tags       []Tag       `json:"tags,omitempty" gorm:"many2many:article_tags;"`
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

// Submission 投稿模型
type Submission struct {
	BaseModel
	Title       string     `json:"title" gorm:"not null;size:255"`
	Content     string     `json:"content" gorm:"type:longtext"`
	Excerpt     string     `json:"excerpt"`
	CoverImage  string     `json:"cover_image"`
	Status      string     `json:"status" gorm:"not null;size:20;default:'draft'"` // draft, submitted, approved, rejected, published
	Type        string     `json:"type" gorm:"not null;size:20;default:'article'"` // article, blog
	SubmittedAt *time.Time `json:"submitted_at"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	ReviewNotes string     `json:"review_notes" gorm:"type:text"` // 审核备注
	ReadingTime int        `json:"reading_time" gorm:"default:0"` // 预估阅读时间（分钟）

	// 外键
	AuthorID   uint  `json:"author_id" gorm:"not null"`
	CategoryID *uint `json:"category_id"`
	SeriesID   *uint `json:"series_id"`
	ReviewerID *uint `json:"reviewer_id"` // 审核者ID

	// SEO字段
	MetaTitle       string `json:"meta_title"`
	MetaDescription string `json:"meta_description"`
	MetaKeywords    string `json:"meta_keywords"`

	// 关联关系
	Author   User      `json:"author" gorm:"foreignKey:AuthorID"`
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Series   *Series   `json:"series,omitempty" gorm:"foreignKey:SeriesID"`
	Reviewer *User     `json:"reviewer,omitempty" gorm:"foreignKey:ReviewerID"`
	Tags     []Tag     `json:"tags,omitempty" gorm:"many2many:submission_tags;"`
}

// Comment 评论模型
type Comment struct {
	BaseModel
	Content       string     `json:"content" gorm:"type:text;not null"`
	IsApproved    bool       `json:"is_approved" gorm:"default:false"`
	LikesCount    int        `json:"likes_count" gorm:"default:0"`
	RepliesCount  int        `json:"replies_count" gorm:"default:0"`
	IsReported    bool       `json:"is_reported" gorm:"default:false"`
	ReportReason  string     `json:"report_reason"`

	// 外键
	ArticleID uint  `json:"article_id" gorm:"not null;index"`
	AuthorID  uint  `json:"author_id" gorm:"not null;index"`
	ParentID  *uint `json:"parent_id" gorm:"index"` // 父评论ID，用于回复

	// 关联关系
	Article  Article    `json:"article" gorm:"foreignKey:ArticleID"`
	Author   User       `json:"author" gorm:"foreignKey:AuthorID"`
	Parent   *Comment   `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Replies  []Comment  `json:"replies,omitempty" gorm:"foreignKey:ParentID"`
	Likes    []CommentLike `json:"-" gorm:"foreignKey:CommentID"`
}

// CommentLike 评论点赞记录
type CommentLike struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CommentID uint      `json:"comment_id" gorm:"not null;index"`
	IP        string    `json:"ip" gorm:"not null;size:45"`
	UserID    *uint     `json:"user_id" gorm:"index"` // 可选，登录用户
	LikedAt   time.Time `json:"liked_at" gorm:"autoCreateTime"`

	// 关联关系
	Comment Comment `json:"comment" gorm:"foreignKey:CommentID"`
	User    *User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
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

// StudyPlan 学习计划模型
type StudyPlan struct {
	BaseModel
	Name        string `json:"name" gorm:"not null;size:255"`
	Description string `json:"description" gorm:"type:text"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`

	// 学习算法配置
	SpacingAlgorithm string `json:"spacing_algorithm" gorm:"default:'ebbinghaus';size:50"` // ebbinghaus, sm2, anki
	DifficultyLevel  int    `json:"difficulty_level" gorm:"default:3;check:difficulty_level >= 1 AND difficulty_level <= 5"`

	// 目标设置
	DailyGoal   int `json:"daily_goal" gorm:"default:5"`   // 每日学习目标数量
	WeeklyGoal  int `json:"weekly_goal" gorm:"default:30"` // 每周学习目标数量
	MonthlyGoal int `json:"monthly_goal" gorm:"default:120"` // 每月学习目标数量

	// 统计字段
	TotalItems     int `json:"total_items" gorm:"default:0"`
	CompletedItems int `json:"completed_items" gorm:"default:0"`
	MasteredItems  int `json:"mastered_items" gorm:"default:0"`

	// 外键
	CreatorID uint `json:"creator_id" gorm:"not null"`

	// 关联关系
	Creator    User        `json:"creator" gorm:"foreignKey:CreatorID"`
	StudyItems []StudyItem `json:"study_items,omitempty" gorm:"foreignKey:StudyPlanID"`
}

// StudyItem 学习项目模型
type StudyItem struct {
	BaseModel
	StudyPlanID uint `json:"study_plan_id" gorm:"not null;index"`
	ArticleID   uint `json:"article_id" gorm:"not null;index"`

	// 学习状态
	Status             string  `json:"status" gorm:"default:'new';size:20"` // new, learning, review, mastered, suspended
	CurrentInterval    int     `json:"current_interval" gorm:"default:1"`   // 当前间隔天数
	EaseFactor         float64 `json:"ease_factor" gorm:"default:2.5"`      // SM2算法的简易因子
	ConsecutiveCorrect int     `json:"consecutive_correct" gorm:"default:0"`
	ConsecutiveFailed  int     `json:"consecutive_failed" gorm:"default:0"`

	// 时间记录
	NextReviewAt   *time.Time `json:"next_review_at" gorm:"index"`
	LastReviewedAt *time.Time `json:"last_reviewed_at"`
	FirstStudiedAt *time.Time `json:"first_studied_at"`
	MasteredAt     *time.Time `json:"mastered_at"`

	// 学习统计
	TotalReviews   int     `json:"total_reviews" gorm:"default:0"`
	TotalStudyTime int     `json:"total_study_time" gorm:"default:0"` // 总学习时间（秒）
	AverageRating  float64 `json:"average_rating" gorm:"default:0"`   // 平均难度评分

	// 刻意练习数据
	WeakPoints       string `json:"weak_points" gorm:"type:text"`         // 薄弱知识点
	StudyNotes       string `json:"study_notes" gorm:"type:text"`         // 学习笔记
	PersonalRating   int    `json:"personal_rating" gorm:"default:0"`     // 个人掌握度评分 1-10
	ImportanceLevel  int    `json:"importance_level" gorm:"default:3"`    // 重要程度 1-5
	DifficultyLevel  int    `json:"difficulty_level" gorm:"default:3"`    // 难度等级 1-5

	// 关联关系
	StudyPlan StudyPlan  `json:"study_plan" gorm:"foreignKey:StudyPlanID"`
	Article   Article    `json:"article" gorm:"foreignKey:ArticleID"`
	StudyLogs []StudyLog `json:"study_logs,omitempty" gorm:"foreignKey:StudyItemID"`
}

// StudyLog 学习记录模型
type StudyLog struct {
	BaseModel
	StudyItemID uint `json:"study_item_id" gorm:"not null;index"`

	// 本次学习信息
	ReviewType  string `json:"review_type" gorm:"not null;size:20"` // initial, review, practice, test, summary
	Rating      int    `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"` // 1-5 难度评级
	StudyTime   int    `json:"study_time" gorm:"not null"` // 本次学习时间（秒）
	Completion  bool   `json:"completion" gorm:"default:true"` // 是否完成学习

	// 学习方式和内容
	StudyMethod    string `json:"study_method" gorm:"size:50"`  // read, quiz, summary, explanation, practice
	StudyMaterials string `json:"study_materials" gorm:"type:text"` // 学习材料记录
	Notes          string `json:"notes" gorm:"type:text"`       // 本次学习笔记
	KeyPoints      string `json:"key_points" gorm:"type:text"`  // 关键知识点

	// 学习效果评估
	Understanding   int    `json:"understanding" gorm:"default:0;check:understanding >= 0 AND understanding <= 10"`   // 理解程度 0-10
	Retention      int    `json:"retention" gorm:"default:0;check:retention >= 0 AND retention <= 10"`         // 记忆保持度 0-10
	Application    int    `json:"application" gorm:"default:0;check:application >= 0 AND application <= 10"`   // 应用能力 0-10
	Confidence     int    `json:"confidence" gorm:"default:0;check:confidence >= 0 AND confidence <= 10"`      // 信心程度 0-10

	// 间隔重复算法数据
	PreviousInterval int     `json:"previous_interval"`
	NewInterval      int     `json:"new_interval"`
	PreviousEase     float64 `json:"previous_ease"`
	NewEase          float64 `json:"new_ease"`

	// 环境和设备信息
	DeviceType  string `json:"device_type" gorm:"size:50"`   // desktop, mobile, tablet
	Location    string `json:"location" gorm:"size:100"`     // 学习地点
	TimeOfDay   string `json:"time_of_day" gorm:"size:20"`   // morning, afternoon, evening, night

	// 关联关系
	StudyItem StudyItem `json:"study_item" gorm:"foreignKey:StudyItemID"`
}

// StudyReminder 学习提醒模型
type StudyReminder struct {
	BaseModel
	StudyItemID uint      `json:"study_item_id" gorm:"not null;index"`
	ReminderAt  time.Time `json:"scheduled_at" gorm:"not null;index"`
	Status      string    `json:"status" gorm:"default:'pending';size:20"` // pending, read, completed

	// 提醒类型和内容
	ReminderType string `json:"type" gorm:"default:'review';size:20"` // review, goal, overdue, achievement, manual
	Priority     int    `json:"priority" gorm:"default:3;check:priority >= 1 AND priority <= 5"` // 提醒优先级
	Title        string `json:"title" gorm:"size:255"`
	Message      string `json:"message" gorm:"type:text"`

	// 提醒方式
	NotificationMethod string `json:"notification_method" gorm:"default:'system';size:50"` // system, email, sms, webhook
	IsRecurring       bool   `json:"is_recurring" gorm:"default:false"`
	RecurrencePattern string `json:"recurrence_pattern" gorm:"size:100"` // daily, weekly, custom

	// 执行信息
	SentAt       *time.Time `json:"sent_at"`
	CompletedAt  *time.Time `json:"completed_at"`
	SnoozeUntil  *time.Time `json:"snooze_until"`
	AttemptCount int        `json:"attempt_count" gorm:"default:0"`

	// 关联关系
	StudyItem StudyItem `json:"study_item" gorm:"foreignKey:StudyItemID"`
}

// StudyAnalytics 学习分析模型
type StudyAnalytics struct {
	BaseModel
	StudyPlanID uint   `json:"study_plan_id" gorm:"not null;index"`
	Date        string `json:"date" gorm:"not null;index;size:10"` // YYYY-MM-DD
	PeriodType  string `json:"period_type" gorm:"not null;size:10"` // daily, weekly, monthly

	// 基础学习统计
	ItemsReviewed  int     `json:"items_reviewed" gorm:"default:0"`
	StudyTime      int     `json:"study_time" gorm:"default:0"` // 总学习时间（秒）
	SessionCount   int     `json:"session_count" gorm:"default:0"` // 学习会话数
	AverageRating  float64 `json:"average_rating" gorm:"default:0"`
	CompletionRate float64 `json:"completion_rate" gorm:"default:0"` // 完成率

	// 学习进度统计
	NewItems      int `json:"new_items" gorm:"default:0"`      // 新学习项目
	ReviewedItems int `json:"reviewed_items" gorm:"default:0"` // 复习项目
	MasteredItems int `json:"mastered_items" gorm:"default:0"` // 掌握项目
	FailedItems   int `json:"failed_items" gorm:"default:0"`   // 失败项目

	// 效率和质量指标
	EfficiencyScore   float64 `json:"efficiency_score" gorm:"default:0"`   // 学习效率分数
	RetentionRate     float64 `json:"retention_rate" gorm:"default:0"`     // 知识保持率
	ProgressVelocity  float64 `json:"progress_velocity" gorm:"default:0"`  // 进步速度
	ConsistencyScore  float64 `json:"consistency_score" gorm:"default:0"`  // 学习一致性

	// 目标达成情况
	DailyGoalAchieved   bool    `json:"daily_goal_achieved" gorm:"default:false"`
	WeeklyGoalProgress  float64 `json:"weekly_goal_progress" gorm:"default:0"`  // 周目标进度百分比
	MonthlyGoalProgress float64 `json:"monthly_goal_progress" gorm:"default:0"` // 月目标进度百分比

	// 学习模式分析
	PreferredStudyTime string `json:"preferred_study_time" gorm:"size:20"` // 偏好学习时间
	AvgSessionDuration int    `json:"avg_session_duration" gorm:"default:0"` // 平均学习时长
	MostUsedMethod     string `json:"most_used_method" gorm:"size:50"`     // 最常用学习方法

	// 关联关系
	StudyPlan StudyPlan `json:"study_plan" gorm:"foreignKey:StudyPlanID"`
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
func (Comment) TableName() string          { return "comments" }
func (CommentLike) TableName() string      { return "comment_likes" }
func (Submission) TableName() string       { return "submissions" }
func (SearchIndex) TableName() string      { return "search_indexes" }
func (SearchStatistics) TableName() string { return "search_statistics" }
func (Config) TableName() string           { return "configs" }
func (StudyPlan) TableName() string        { return "study_plans" }
func (StudyItem) TableName() string        { return "study_items" }
func (StudyLog) TableName() string         { return "study_logs" }
func (StudyReminder) TableName() string    { return "study_reminders" }
func (StudyAnalytics) TableName() string   { return "study_analytics" }
