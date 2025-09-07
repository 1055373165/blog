package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/handlers"
	"blog-backend/internal/middleware"
	"blog-backend/pkg/auth"
	"blog-backend/pkg/search"
)

func main() {
	// 加载配置
	if err := config.LoadConfig(); err != nil {
		log.Fatal("加载配置失败:", err)
	}

	cfg := config.GlobalConfig
	log.Printf("启动 %s v%s (%s 环境)", cfg.App.Name, cfg.App.Version, cfg.App.Environment)

	// 初始化数据库连接
	if err := database.InitDB(); err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 自动迁移数据库表
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	// 初始化JWT
	auth.InitJWT()

	// 初始化搜索引擎
	if err := search.InitSearchEngine(); err != nil {
		log.Printf("搜索引擎初始化失败: %v", err)
		log.Println("将使用数据库搜索作为备选方案")
	}

	// 设置Gin模式
	gin.SetMode(cfg.Server.Mode)

	// 创建Gin路由器
	router := gin.New()

	// 添加中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.LargeRequestHandler()) // 处理大型请求

	// CORS配置
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.CORS.AllowedOrigins
	corsConfig.AllowMethods = cfg.CORS.AllowedMethods
	corsConfig.AllowHeaders = cfg.CORS.AllowedHeaders
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// 健康检查接口
	router.GET("/health", func(c *gin.Context) {
		dbErr := database.HealthCheck()
		if dbErr != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"message": "Database connection failed",
				"error":   dbErr.Error(),
				"app":     cfg.App.Name,
				"version": cfg.App.Version,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      "ok",
			"message":     "Blog API Server is running",
			"app":         cfg.App.Name,
			"version":     cfg.App.Version,
			"environment": cfg.App.Environment,
			"database":    "connected",
		})
	})

	// 数据库状态接口
	router.GET("/health/db", func(c *gin.Context) {
		stats := database.GetStats()
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"data":   stats,
		})
	})

	// API路由组
	api := router.Group("/api")
	{
		// 认证相关路由
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/logout", middleware.AuthRequired(), handlers.Logout)
			auth.GET("/profile", middleware.AuthRequired(), handlers.GetProfile)
			auth.PUT("/profile", middleware.AuthRequired(), handlers.UpdateProfile)
			auth.POST("/refresh-token", handlers.RefreshToken)
			auth.POST("/change-password", middleware.AuthRequired(), handlers.ChangePassword)
		}

		// 文章相关路由
		articles := api.Group("/articles")
		{
			articles.GET("", handlers.GetArticles)
			articles.GET("/:id", handlers.GetArticle)
			articles.GET("/slug/:slug", handlers.GetArticleBySlug)
			articles.POST("", middleware.AuthRequired(), handlers.CreateArticle)
			articles.PUT("/:id", middleware.AuthRequired(), handlers.UpdateArticle)
			articles.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteArticle)
			articles.POST("/:id/views", handlers.IncrementArticleViews)
			articles.POST("/:id/like", handlers.ToggleArticleLike)
			articles.GET("/:id/related", handlers.GetRelatedArticles)
		}

		// 分类相关路由
		categories := api.Group("/categories")
		{
			categories.GET("", handlers.GetCategories)
			categories.GET("/tree", handlers.GetCategoryTree)
			categories.GET("/:id", handlers.GetCategory)
			categories.GET("/slug/:slug", handlers.GetCategoryBySlug)
			categories.POST("", middleware.AuthRequired(), handlers.CreateCategory)
			categories.PUT("/:id", middleware.AuthRequired(), handlers.UpdateCategory)
			categories.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteCategory)
			categories.GET("/:id/articles", handlers.GetArticlesByCategory)
		}

		// 标签相关路由
		tags := api.Group("/tags")
		{
			tags.GET("", handlers.GetTags)
			tags.GET("/popular", handlers.GetPopularTags)
			tags.GET("/:id", handlers.GetTag)
			tags.GET("/slug/:slug", handlers.GetTagBySlug)
			tags.POST("", middleware.AuthRequired(), handlers.CreateTag)
			tags.PUT("/:id", middleware.AuthRequired(), handlers.UpdateTag)
			tags.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteTag)
			tags.GET("/:id/articles", handlers.GetArticlesByTag)
			tags.GET("/search", handlers.SearchTags)
		}

		// 系列相关路由
		series := api.Group("/series")
		{
			series.GET("", handlers.GetSeries)
			series.GET("/:id", handlers.GetSeriesById)
			series.GET("/slug/:slug", handlers.GetSeriesBySlug)
			series.POST("", middleware.AuthRequired(), handlers.CreateSeries)
			series.PUT("/:id", middleware.AuthRequired(), handlers.UpdateSeries)
			series.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteSeries)
			series.GET("/:id/articles", handlers.GetArticlesBySeries)
			series.GET("/slug/:slug/articles", handlers.GetArticlesBySeriesSlug)
		}

		// 搜索相关路由
		searchGroup := api.Group("/search")
		{
			searchGroup.GET("", handlers.SearchContent)
			searchGroup.GET("/suggestions", handlers.SearchSuggestions)
			searchGroup.GET("/stats", handlers.GetSearchStats)
			searchGroup.POST("/reindex", middleware.AuthRequired(), handlers.IndexAllArticles)
		}

		// 统计相关路由
		stats := api.Group("/stats")
		{
			stats.GET("", handlers.GetStats)
			stats.GET("/popular-articles", handlers.GetPopularArticles)
			stats.GET("/views", handlers.GetViewsStats)
		}

		// 文件上传路由
		upload := api.Group("/upload")
		{
			upload.POST("/image", middleware.AuthRequired(), handlers.UploadImage)
			upload.POST("/file", middleware.AuthRequired(), handlers.UploadFile)
			upload.GET("/image/*filename", handlers.GetImage)
		}

		// 书籍相关路由
		books := api.Group("/books")
		{
			books.GET("", handlers.GetBooksSimple)
			books.POST("/refresh", handlers.RefreshBooks)
			books.GET("/metadata/:filename", handlers.GetBookMetadata)
			books.GET("/description", handlers.GetBookDetailedDescription)
		}
	}

	// 静态文件服务

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("服务器启动在 %s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
