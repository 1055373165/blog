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
	// 大文件上传在具体路由组中单独设置请求体大小限制

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
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.POST("/logout", middleware.AuthRequired(), handlers.Logout)
			auth.GET("/profile", middleware.AuthRequired(), handlers.GetProfile)
			auth.PUT("/profile", middleware.AuthRequired(), handlers.UpdateProfile)
			auth.POST("/refresh-token", handlers.RefreshToken)
			auth.POST("/change-password", middleware.AuthRequired(), handlers.ChangePassword)
		}

		// 文章相关路由
		articles := api.Group("/articles")
		articles.Use(middleware.LargeRequestHandler()) // 为文章上传接口设置10MB限制
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

			// 评论相关路由
			articles.GET("/:id/comments", handlers.GetComments)
			articles.POST("/:id/comments", handlers.CreateComment)
		}

		// 评论相关路由
		comments := api.Group("/comments")
		{
			comments.PUT("/:id", handlers.UpdateComment)
			comments.DELETE("/:id", handlers.DeleteComment)
			comments.POST("/:id/like", handlers.ToggleCommentLike)
			comments.POST("/:id/report", handlers.ReportComment)
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

		// 博客相关路由
		blogs := api.Group("/blogs")
		{
			blogs.GET("", handlers.GetBlogs)
			blogs.GET("/:id", handlers.GetBlog)
			blogs.GET("/slug/:slug", handlers.GetBlogBySlug)
			blogs.POST("", middleware.AuthRequired(), handlers.CreateBlog)
			blogs.PUT("/:id", middleware.AuthRequired(), handlers.UpdateBlog)
			blogs.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteBlog)
			blogs.POST("/:id/views", handlers.IncrementBlogViews)
			blogs.POST("/:id/like", handlers.ToggleBlogLike)
			blogs.PATCH("/:id/toggle-publish", middleware.AuthRequired(), handlers.ToggleBlogPublish)
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
			upload.Use(middleware.RequestSizeLimit(200 * 1024 * 1024)) // 为上传接口设置200MB限制
			upload.POST("/image", middleware.AuthRequired(), handlers.UploadImage)
			upload.POST("/file", middleware.AuthRequired(), handlers.UploadFile)
			upload.POST("/media", middleware.AuthRequired(), handlers.UploadMedia)
			upload.GET("/image/*filename", handlers.GetImage)
			upload.GET("/file/*filename", handlers.GetFile)
			upload.GET("/media/*filename", handlers.GetMedia)
		}

		// 封面图片相关路由
		cover := api.Group("/cover")
		{
			cover.GET("", handlers.GetCoverImages)
			cover.POST("/upload", middleware.AuthRequired(), handlers.UploadCoverImage)
		}

		// 封面图片文件服务路由（类似现有的图片上传）
		upload.GET("/cover/*filename", handlers.GetCoverImage)

		// 书籍相关路由
		books := api.Group("/books")
		{
			books.GET("", handlers.GetBooksSimple)
			books.POST("/refresh", handlers.RefreshBooks)
			books.GET("/metadata/:filename", handlers.GetBookMetadata)
			books.GET("/description", handlers.GetBookDetailedDescription)
		}

		// 投稿相关路由
		submissions := api.Group("/submissions")
		submissions.Use(middleware.LargeRequestHandler()) // 为投稿接口设置10MB限制
		{
			// 用户投稿接口
			submissions.POST("", middleware.AuthRequired(), handlers.CreateSubmission)
			submissions.GET("/my", middleware.AuthRequired(), handlers.GetMySubmissions)
			submissions.GET("/:id", middleware.AuthRequired(), handlers.GetSubmission)
			submissions.PUT("/:id", middleware.AuthRequired(), handlers.UpdateSubmission)
			submissions.POST("/:id/submit", middleware.AuthRequired(), handlers.SubmitSubmission)
			submissions.DELETE("/:id", middleware.AuthRequired(), handlers.DeleteSubmission)

			// 管理员投稿管理接口
			submissions.GET("/admin/all", middleware.AuthRequired(), handlers.GetAllSubmissions)
			submissions.POST("/:id/review", middleware.AuthRequired(), handlers.ReviewSubmission)
			submissions.POST("/:id/publish", middleware.AuthRequired(), handlers.PublishSubmission)
		}

		// 管理员用户管理路由
		adminUsers := api.Group("/admin/users")
		adminUsers.Use(middleware.AuthRequired()) // 需要登录
		{
			adminUsers.GET("", handlers.GetUsers)                           // 获取用户列表
			adminUsers.GET("/:id", handlers.GetUserDetail)                  // 获取用户详情
			adminUsers.PUT("/:id/toggle-admin", handlers.ToggleUserAdmin)   // 切换管理员权限
			adminUsers.PUT("/:id/toggle-active", handlers.ToggleUserActive) // 切换用户状态
			adminUsers.DELETE("/:id", handlers.DeleteUser)                  // 删除用户
		}

		// 学习系统路由
		studyHandler := handlers.NewStudyHandler(database.DB)
		study := api.Group("/study")
		// 移除认证中间件，管理员功能暂时开放访问
		{
			// 学习计划管理
			study.GET("/plans", studyHandler.GetStudyPlans)
			study.POST("/plans", studyHandler.CreateStudyPlan)
			study.GET("/plans/:id", studyHandler.GetStudyPlan)
			study.PUT("/plans/:id", studyHandler.UpdateStudyPlan)
			study.DELETE("/plans/:id", studyHandler.DeleteStudyPlan)

			// 学习项目管理
			study.POST("/plans/:id/articles", studyHandler.AddArticleToStudyPlan)
			study.GET("/plans/:id/items", studyHandler.GetStudyItems)
			study.DELETE("/items/:item_id", studyHandler.RemoveStudyItem)
			study.PUT("/items/:item_id/notes", studyHandler.UpdateStudyItemNotes)

			// 学习进度管理
			study.POST("/items/:item_id/study", studyHandler.RecordStudySession)
			study.GET("/due", studyHandler.GetDueStudyItems)

			// 学习分析
			study.GET("/plans/:id/analytics", studyHandler.GetStudyAnalytics)
		}
	}

	// 开发环境兼容路由：支持无 /api 前缀的上传路径
	// 使得 VITE_API_BASE_URL 指向 http://127.0.0.1:3001 时，/upload/media 也能工作
	{
		uploadCompat := router.Group("/upload")
		uploadCompat.Use(middleware.RequestSizeLimit(200 * 1024 * 1024))
		uploadCompat.POST("/media", handlers.UploadMedia)
		uploadCompat.GET("/media/*filename", handlers.GetMedia)
	}

	// 静态文件服务

	// 启动服务器
	serverAddr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("服务器启动在 %s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}
