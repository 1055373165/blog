package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"blog-backend/internal/config"
	"blog-backend/internal/models"
	"blog-backend/pkg/auth"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() error {
	if config.GlobalConfig == nil {
		return fmt.Errorf("配置未初始化，请先调用 config.LoadConfig()")
	}

	cfg := config.GlobalConfig

	// 构建数据库连接字符串
	dsn := cfg.GetDSN()

	// 配置GORM日志级别
	logLevel := logger.Info
	if cfg.IsProduction() || cfg.Server.Mode == "release" {
		logLevel = logger.Error
	}
	if cfg.App.Debug {
		logLevel = logger.Info
	}

	// 创建数据库连接
	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
		// 禁用外键约束检查（可选，根据需要调整）
		DisableForeignKeyConstraintWhenMigrating: false,
	})

	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 获取底层sql.DB对象来配置连接池
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("获取数据库实例失败: %v", err)
	}

	// 设置连接池参数
	sqlDB.SetMaxOpenConns(cfg.Database.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.Database.MaxLifetime)

	// 测试连接
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("数据库连接测试失败: %v", err)
	}

	log.Printf("数据库连接成功 (Host: %s, DB: %s)", cfg.Database.Host, cfg.Database.Name)
	return nil
}

// AutoMigrate 自动迁移数据库表
func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Tag{},
		&models.Series{},
		&models.Article{},
		&models.ArticleView{},
		&models.ArticleLike{},
		&models.Blog{},
		&models.BlogView{},
		&models.BlogLike{},
		&models.Comment{},
		&models.CommentLike{},
		&models.Submission{},
		&models.SearchIndex{},
		&models.SearchStatistics{},
		&models.Config{},
		// 学习系统模型
		&models.StudyPlan{},
		&models.StudyItem{},
		&models.StudyLog{},
		&models.StudyReminder{},
		&models.StudyAnalytics{},
	)

	if err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	// 创建复合索引
	if err := createIndexes(); err != nil {
		return fmt.Errorf("创建索引失败: %v", err)
	}

	// 创建默认数据
	if err := createDefaultData(); err != nil {
		return fmt.Errorf("创建默认数据失败: %v", err)
	}

	log.Println("数据库迁移完成")
	return nil
}

// createIndexes 创建数据库索引 (MySQL兼容)
func createIndexes() error {
	// MySQL不支持CREATE INDEX IF NOT EXISTS，需要先检查索引是否存在
	
	// 检查并创建文章表复合索引
	createIndexIfNotExists("idx_articles_published", "articles", "is_published, published_at DESC")
	createIndexIfNotExists("idx_articles_category", "articles", "category_id, is_published, published_at DESC")
	createIndexIfNotExists("idx_articles_series", "articles", "series_id, series_order")
	
	// 检查并创建文章点赞表唯一复合索引
	createUniqueIndexIfNotExists("idx_article_likes_unique", "article_likes", "article_id, ip")
	
	// 检查并创建文章浏览表索引
	createIndexIfNotExists("idx_article_views_article_date", "article_views", "article_id, viewed_at")
	
	// 检查并创建博客表复合索引
	createIndexIfNotExists("idx_blogs_published", "blogs", "is_published, published_at DESC")
	createIndexIfNotExists("idx_blogs_category", "blogs", "category_id, is_published, published_at DESC")
	createIndexIfNotExists("idx_blogs_type", "blogs", "type, is_published, published_at DESC")
	
	// 检查并创建博客点赞表唯一复合索引
	createUniqueIndexIfNotExists("idx_blog_likes_unique", "blog_likes", "blog_id, ip")
	
	// 检查并创建博客浏览表索引
	createIndexIfNotExists("idx_blog_views_blog_date", "blog_views", "blog_id, viewed_at")
	
	// 检查并创建全文搜索索引
	createFulltextIndexIfNotExists("idx_articles_search", "articles", "title, content")
	
	// 检查并创建搜索统计表索引
	createIndexIfNotExists("idx_search_statistics_query", "search_statistics", "query")
	createIndexIfNotExists("idx_search_statistics_searched_at", "search_statistics", "searched_at")

	return nil
}

// createIndexIfNotExists 检查索引是否存在，不存在则创建
func createIndexIfNotExists(indexName, tableName, columns string) {
	var count int64
	DB.Raw("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", tableName, indexName).Scan(&count)
	
	if count == 0 {
		sql := fmt.Sprintf("CREATE INDEX %s ON %s(%s)", indexName, tableName, columns)
		if err := DB.Exec(sql).Error; err != nil {
			log.Printf("创建索引失败 %s: %v", indexName, err)
		}
	}
}

// createUniqueIndexIfNotExists 检查唯一索引是否存在，不存在则创建
func createUniqueIndexIfNotExists(indexName, tableName, columns string) {
	var count int64
	DB.Raw("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", tableName, indexName).Scan(&count)
	
	if count == 0 {
		sql := fmt.Sprintf("CREATE UNIQUE INDEX %s ON %s(%s)", indexName, tableName, columns)
		if err := DB.Exec(sql).Error; err != nil {
			log.Printf("创建唯一索引失败 %s: %v", indexName, err)
		}
	}
}

// createFulltextIndexIfNotExists 检查全文索引是否存在，不存在则创建
func createFulltextIndexIfNotExists(indexName, tableName, columns string) {
	var count int64
	DB.Raw("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?", tableName, indexName).Scan(&count)
	
	if count == 0 {
		sql := fmt.Sprintf("CREATE FULLTEXT INDEX %s ON %s(%s)", indexName, tableName, columns)
		if err := DB.Exec(sql).Error; err != nil {
			log.Printf("创建全文索引失败 %s: %v", indexName, err)
		}
	}
}

// createDefaultData 创建默认数据
func createDefaultData() error {
	// 创建默认管理员用户
	var adminCount int64
	DB.Model(&models.User{}).Where("is_admin = ?", true).Count(&adminCount)

	if adminCount == 0 {
		// 加密默认密码
		hashedPassword, err := auth.HashPassword("password")
		if err != nil {
			log.Printf("默认管理员密码加密失败: %v", err)
			return nil
		}

		admin := models.User{
			Email:    "admin@blog.com",
			Name:     "管理员",
			Password: hashedPassword,
			IsAdmin:  true,
		}
		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("创建默认管理员失败: %v", err)
		} else {
			log.Println("默认管理员创建成功 (admin@blog.com / password)")
		}
	}

	// 创建默认分类
	var categoryCount int64
	DB.Model(&models.Category{}).Count(&categoryCount)

	if categoryCount == 0 {
		defaultCategories := []models.Category{
			{Name: "技术分享", Slug: "tech", Description: "技术相关文章"},
			{Name: "生活随笔", Slug: "life", Description: "生活感悟和随笔"},
			{Name: "学习笔记", Slug: "notes", Description: "学习过程中的笔记"},
		}

		for _, category := range defaultCategories {
			if err := DB.Create(&category).Error; err != nil {
				log.Printf("创建默认分类失败: %v", err)
			}
		}
		log.Println("默认分类创建成功")
	}

	// 创建默认标签
	var tagCount int64
	DB.Model(&models.Tag{}).Count(&tagCount)

	if tagCount == 0 {
		defaultTags := []models.Tag{
			{Name: "Go", Slug: "go", Color: "#00ADD8"},
			{Name: "React", Slug: "react", Color: "#61DAFB"},
			{Name: "TypeScript", Slug: "typescript", Color: "#3178C6"},
			{Name: "数据库", Slug: "database", Color: "#336791"},
			{Name: "前端", Slug: "frontend", Color: "#FF6B6B"},
			{Name: "后端", Slug: "backend", Color: "#4ECDC4"},
		}

		for _, tag := range defaultTags {
			if err := DB.Create(&tag).Error; err != nil {
				log.Printf("创建默认标签失败: %v", err)
			}
		}
		log.Println("默认标签创建成功")
	}

	return nil
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// HealthCheck 数据库健康检查
func HealthCheck() error {
	if DB == nil {
		return fmt.Errorf("数据库连接未初始化")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("获取数据库实例失败: %v", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("数据库连接检查失败: %v", err)
	}

	return nil
}

// GetStats 获取数据库连接统计信息
func GetStats() map[string]interface{} {
	if DB == nil {
		return map[string]interface{}{"error": "数据库连接未初始化"}
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	stats := sqlDB.Stats()
	return map[string]interface{}{
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_idle_time_closed": stats.MaxIdleTimeClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}
