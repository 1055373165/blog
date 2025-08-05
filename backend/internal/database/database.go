package database

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"blog-backend/internal/models"
	"blog-backend/pkg/auth"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() error {
	// 获取数据库配置
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "")
	dbname := getEnv("DB_NAME", "blog_db")
	sslmode := getEnv("DB_SSLMODE", "disable")
	timezone := getEnv("DB_TIMEZONE", "Asia/Shanghai")

	// 构建数据库连接字符串
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		host, user, password, dbname, port, sslmode, timezone)

	// 配置GORM日志级别
	logLevel := logger.Info
	if os.Getenv("GIN_MODE") == "release" {
		logLevel = logger.Error
	}

	// 创建数据库连接
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
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
	maxOpenConns, _ := strconv.Atoi(getEnv("DB_MAX_OPEN_CONNS", "25"))
	maxIdleConns, _ := strconv.Atoi(getEnv("DB_MAX_IDLE_CONNS", "5"))
	maxLifetime, _ := strconv.Atoi(getEnv("DB_MAX_LIFETIME", "300"))

	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(maxLifetime) * time.Second)

	// 测试连接
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("数据库连接测试失败: %v", err)
	}

	log.Println("数据库连接成功")
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
		&models.SearchIndex{},
		&models.Config{},
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

// createIndexes 创建数据库索引
func createIndexes() error {
	// 为文章表创建复合索引
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC)")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id, is_published, published_at DESC)")
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_articles_series ON articles(series_id, series_order)")
	
	// 为文章点赞表创建唯一复合索引
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_article_likes_unique ON article_likes(article_id, ip)")
	
	// 为文章浏览表创建索引
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_article_views_article_date ON article_views(article_id, viewed_at)")
	
	// 为搜索相关字段创建索引
	DB.Exec("CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING gin(to_tsvector('english', title || ' ' || content))")
	
	return nil
}

// createDefaultData 创建默认数据
func createDefaultData() error {
	// 创建默认管理员用户
	var adminCount int64
	DB.Model(&models.User{}).Where("is_admin = ?", true).Count(&adminCount)
	
	if adminCount == 0 {
		// 加密默认密码
		hashedPassword, err := auth.HashPassword("admin123")
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
			log.Println("默认管理员创建成功 (admin@blog.com / admin123)")
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

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}