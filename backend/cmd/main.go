package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"blog-backend/internal/database"
	"blog-backend/internal/handlers"
	"blog-backend/internal/middleware"
	"blog-backend/pkg/auth"
	"blog-backend/pkg/search"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("警告: 未找到 .env 文件，使用系统环境变量")
	}

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
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建Gin路由器
	router := gin.New()

	// 添加中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS配置
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3000",  // 前端开发环境
		"http://localhost:5173",  // Vite默认端口
	}
	config.AllowCredentials = true
	config.AllowHeaders = append(config.AllowHeaders, "Authorization")
	router.Use(cors.New(config))

	// 健康检查接口
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Blog API Server is running",
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

		// 搜索相关路由
		searchGroup := api.Group("/search")
		{
			searchGroup.GET("", handlers.SearchContent)
			searchGroup.GET("/suggestions", handlers.SearchSuggestions)
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
		}
	}

	// 静态文件服务
	router.Static("/uploads", "./uploads")

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("服务器启动在端口 %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}