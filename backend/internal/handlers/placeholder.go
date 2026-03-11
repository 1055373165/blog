package handlers

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// 分类相关处理器已在 categories.go 中实现

// 标签相关处理器已在 tags.go 中实现

// 搜索相关处理器已在 search.go 中实现

// 统计相关处理器
func GetStats(c *gin.Context) {
	db := database.GetDB()
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "数据库连接失败",
		})
		return
	}

	// 获取文章统计
	var totalArticles, publishedArticles, draftArticles int64
	db.Model(&models.Article{}).Count(&totalArticles)
	db.Model(&models.Article{}).Where("is_published = ?", true).Count(&publishedArticles)
	db.Model(&models.Article{}).Where("is_draft = ?", true).Count(&draftArticles)

	// 获取总浏览量
	var totalViews int64
	db.Model(&models.ArticleView{}).Count(&totalViews)

	// 获取总点赞数
	var totalLikes int64
	db.Model(&models.ArticleLike{}).Count(&totalLikes)

	// 获取分类数量
	var totalCategories int64
	db.Model(&models.Category{}).Count(&totalCategories)

	// 获取标签数量
	var totalTags int64
	db.Model(&models.Tag{}).Count(&totalTags)

	// 获取系列数量
	var totalSeries int64
	db.Model(&models.Series{}).Count(&totalSeries)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"totalArticles":     totalArticles,
			"publishedArticles": publishedArticles,
			"draftArticles":     draftArticles,
			"totalViews":        totalViews,
			"totalLikes":        totalLikes,
			"totalCategories":   totalCategories,
			"totalTags":         totalTags,
			"totalSeries":       totalSeries,
		},
	})
}

func GetViewsStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Views stats endpoint - to be implemented",
		"data":    []interface{}{},
	})
}

// 文件上传相关处理器

func UploadImage(c *gin.Context) {
	// 添加调试日志
	fmt.Printf("📸 [DEBUG] 图片上传请求开始 - IP: %s, User-Agent: %s\n", c.ClientIP(), c.GetHeader("User-Agent"))
	fmt.Printf("📸 [DEBUG] 请求头Authorization: %s\n", c.GetHeader("Authorization"))

	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		fmt.Printf("❌ [ERROR] 获取上传文件失败: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "获取上传文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer file.Close()

	fmt.Printf("📄 [DEBUG] 文件信息 - 名称: %s, 大小: %d bytes, 类型: %s\n", header.Filename, header.Size, header.Header.Get("Content-Type"))

	// 验证文件类型
	allowedTypes := map[string]bool{
		"image/jpeg":    true,
		"image/jpg":     true,
		"image/png":     true,
		"image/gif":     true,
		"image/webp":    true,
		"image/svg+xml": true, // 添加 SVG 支持
	}

	contentType := header.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的文件类型",
			"allowed": []string{"jpeg", "jpg", "png", "gif", "webp", "svg"},
		})
		return
	}

	// 验证文件大小（10MB限制）
	const maxSize = 10 * 1024 * 1024 // 10MB
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件大小超过限制",
			"maxSize": "10MB",
		})
		return
	}

	// 生成唯一文件名
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// 根据 content type 推断扩展名
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		case "image/svg+xml":
			ext = ".svg"
		default:
			ext = ".jpg"
		}
	}

	// 使用时间戳和文件内容hash生成文件名
	now := time.Now()
	dateDir := now.Format("2006/01/02")

	// 读取文件内容计算hash
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取文件内容失败",
			"error":   err.Error(),
		})
		return
	}

	// 计算MD5 hash
	hash := md5.Sum(fileBytes)
	hashStr := hex.EncodeToString(hash[:])[:8] // 取前8位

	filename := fmt.Sprintf("%s_%s%s", now.Format("150405"), hashStr, ext)

	// 确保上传目录存在
	cfg := config.GlobalConfig
	fmt.Printf("🗂️ [DEBUG] 配置的上传路径: %s\n", cfg.Upload.Path)
	uploadDir := filepath.Join(cfg.Upload.Path, "images", dateDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建上传目录失败",
			"error":   err.Error(),
		})
		return
	}

	// 保存文件
	fullPath := filepath.Join(uploadDir, filename)
	outFile, err := os.Create(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer outFile.Close()

	if _, err := outFile.Write(fileBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成API访问路径（不包含images前缀，因为API路由会处理）
	apiPath := filepath.Join(dateDir, filename)
	// 确保路径使用正斜杠（适用于URL）
	apiPath = strings.ReplaceAll(apiPath, "\\", "/")

	// 用于返回给前端的完整相对路径（使用Nginx代理路径）
	// 前端通过 /uploads/images/ 访问，Nginx会代理到 /api/upload/image/
	relativePath := filepath.Join("/uploads/images", dateDir, filename)
	relativePath = strings.ReplaceAll(relativePath, "\\", "/")

	// 根据环境确定域名、协议和URL路径
	var domain, scheme, imageURL string

	// 如果是本地开发环境，强制使用localhost
	if cfg.App.Environment == "development" {
		scheme = "http://"
		domain = fmt.Sprintf("localhost:%s", cfg.Server.Port)
		// 开发环境直接使用API路径
		imageURL = fmt.Sprintf("%s%s/api/upload/image/%s", scheme, domain, apiPath)
	} else {
		// 生产环境使用配置的域名和Nginx代理路径
		scheme = "https://"
		domain = "www.godepth.top"

		// 生产环境使用Nginx代理路径 /uploads/images/
		imageURL = fmt.Sprintf("%s%s%s", scheme, domain, relativePath)
		fmt.Println("imageURL：", imageURL)
	}

	fmt.Printf("✅ [SUCCESS] 图片上传成功 - 文件: %s, URL: %s\n", filename, imageURL)
	fmt.Printf("🔗 [DEBUG] 环境: %s, 协议: %s, 域名: %s\n", cfg.App.Environment, scheme, domain)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "图片上传成功",
		"data": gin.H{
			"url":      imageURL,
			"filename": filename,
			"size":     header.Size,
			"type":     contentType,
			"path":     relativePath,
		},
	})
}

func GetImage(c *gin.Context) {
	// 获取路径参数，支持嵌套路径如：2025/08/30/110748_aa33284c.png
	imagePath := c.Param("filename")
	if imagePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "图片路径不能为空",
		})
		return
	}

	// 移除前导斜杠（通配符参数会包含前导斜杠）
	imagePath = strings.TrimPrefix(imagePath, "/")

	cfg := config.GlobalConfig
	// 构建完整的文件路径
	fullPath := filepath.Join(cfg.Upload.Path, "images", imagePath)
	// 安全检查：确保路径在上传目录内
	uploadDir, err := filepath.Abs(cfg.Upload.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "服务器错误",
		})
		return
	}

	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "服务器错误",
		})
		return
	}

	// 检查路径是否在允许的上传目录内
	if !strings.HasPrefix(absPath, uploadDir) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "访问被拒绝",
		})
		return
	}

	// 检查文件是否存在
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "图片不存在",
			"path":    imagePath,
		})
		return
	}

	// 设置适当的缓存头
	c.Header("Cache-Control", "public, max-age=31536000") // 1年缓存
	c.Header("X-Content-Type-Options", "nosniff")

	// 返回文件
	c.File(fullPath)
}

func UploadFile(c *gin.Context) {
	// 添加调试日志
	fmt.Printf("📎 [DEBUG] 文件上传请求开始 - IP: %s, User-Agent: %s\n", c.ClientIP(), c.GetHeader("User-Agent"))

	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		fmt.Printf("❌ [ERROR] 获取上传文件失败: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "获取上传文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer file.Close()

	fmt.Printf("📄 [DEBUG] 文件信息 - 名称: %s, 大小: %d bytes, 类型: %s\n", header.Filename, header.Size, header.Header.Get("Content-Type"))

	// 验证文件类型（支持常见的文档类型）
	allowedTypes := map[string]bool{
		"application/pdf":    true,
		"application/msword": true,
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
		"application/vnd.ms-excel": true,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true,
		"application/vnd.ms-powerpoint":                                             true,
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
		"text/plain":                   true,
		"application/zip":              true,
		"application/x-rar-compressed": true,
		"application/json":             true,
		"text/csv":                     true,
		"application/epub+zip":         true,
		"video/mp4":                    true,
	}

	contentType := header.Header.Get("Content-Type")

	// 如果content-type为空或者不在允许列表中，根据文件扩展名判断
	if contentType == "" || !allowedTypes[contentType] {
		ext := strings.ToLower(filepath.Ext(header.Filename))
		allowedExts := map[string]string{
			".pdf":  "application/pdf",
			".doc":  "application/msword",
			".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			".xls":  "application/vnd.ms-excel",
			".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			".ppt":  "application/vnd.ms-powerpoint",
			".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
			".txt":  "text/plain",
			".zip":  "application/zip",
			".rar":  "application/x-rar-compressed",
			".json": "application/json",
			".csv":  "text/csv",
			".epub": "application/epub+zip",
			".mp4":  "video/mp4",
		}

		if inferredType, ok := allowedExts[ext]; ok {
			contentType = inferredType
		} else {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "不支持的文件类型",
				"allowed": []string{"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar", "json", "csv", "epub", "mp4"},
			})
			return
		}
	}

	// 验证文件大小（150MB限制）
	const maxSize = 150 * 1024 * 1024 // 150MB
	if header.Size > maxSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件大小超过限制",
			"maxSize": "150MB",
		})
		return
	}

	// 生成唯一文件名
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// 根据 content type 推断扩展名
		switch contentType {
		case "application/pdf":
			ext = ".pdf"
		case "application/msword":
			ext = ".doc"
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			ext = ".docx"
		case "application/vnd.ms-excel":
			ext = ".xls"
		case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
			ext = ".xlsx"
		case "application/vnd.ms-powerpoint":
			ext = ".ppt"
		case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
			ext = ".pptx"
		case "text/plain":
			ext = ".txt"
		case "application/zip":
			ext = ".zip"
		case "application/x-rar-compressed":
			ext = ".rar"
		case "application/json":
			ext = ".json"
		case "text/csv":
			ext = ".csv"
		case "application/epub+zip":
			ext = ".epub"
		case "video/mp4":
			ext = ".mp4"
		default:
			ext = ".file"
		}
	}

	// 使用时间戳和文件内容hash生成文件名
	now := time.Now()
	dateDir := now.Format("2006/01/02")

	// 读取文件内容计算hash
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取文件内容失败",
			"error":   err.Error(),
		})
		return
	}

	// 计算MD5 hash
	hash := md5.Sum(fileBytes)
	hashStr := hex.EncodeToString(hash[:])[:8] // 取前8位

	filename := fmt.Sprintf("%s_%s%s", now.Format("150405"), hashStr, ext)

	// 确保上传目录存在
	cfg := config.GlobalConfig
	fmt.Printf("🗂️ [DEBUG] 配置的上传路径: %s\n", cfg.Upload.Path)
	uploadDir := filepath.Join(cfg.Upload.Path, "files", dateDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建上传目录失败",
			"error":   err.Error(),
		})
		return
	}

	// 保存文件
	fullPath := filepath.Join(uploadDir, filename)
	outFile, err := os.Create(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer outFile.Close()

	if _, err := outFile.Write(fileBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成API访问路径
	apiPath := filepath.Join(dateDir, filename)
	apiPath = strings.ReplaceAll(apiPath, "\\", "/")

	// 用于返回给前端的完整相对路径
	relativePath := filepath.Join("/uploads/files", dateDir, filename)
	relativePath = strings.ReplaceAll(relativePath, "\\", "/")

	// 根据环境确定域名、协议和URL路径
	var domain, scheme, fileURL string

	// 如果是本地开发环境，强制使用localhost
	if cfg.App.Environment == "development" {
		scheme = "http://"
		domain = fmt.Sprintf("localhost:%s", cfg.Server.Port)
		// 开发环境直接使用API路径
		fileURL = fmt.Sprintf("%s%s/api/upload/file/%s", scheme, domain, apiPath)
	} else {
		// 生产环境使用配置的域名和Nginx代理路径
		scheme = "https://"
		domain = "www.godepth.top"

		// 生产环境使用Nginx代理路径 /uploads/files/
		fileURL = fmt.Sprintf("%s%s%s", scheme, domain, relativePath)
		fmt.Println("fileURL：", fileURL)
	}

	fmt.Printf("✅ [SUCCESS] 文件上传成功 - 文件: %s, URL: %s\n", filename, fileURL)
	fmt.Printf("🔗 [DEBUG] 环境: %s, 协议: %s, 域名: %s\n", cfg.App.Environment, scheme, domain)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "文件上传成功",
		"data": gin.H{
			"url":      fileURL,
			"filename": filename,
			"size":     header.Size,
			"type":     contentType,
			"path":     relativePath,
		},
	})
}

func GetFile(c *gin.Context) {
	// 获取路径参数，支持嵌套路径如：2025/08/30/110748_aa33284c.pdf
	filePath := c.Param("filename")
	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件路径不能为空",
		})
		return
	}

	// 移除前导斜杠（通配符参数会包含前导斜杠）
	filePath = strings.TrimPrefix(filePath, "/")

	cfg := config.GlobalConfig
	// 构建完整的文件路径
	fullPath := filepath.Join(cfg.Upload.Path, "files", filePath)

	// 安全检查：确保路径在上传目录内
	uploadDir, err := filepath.Abs(cfg.Upload.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "服务器错误",
		})
		return
	}

	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "服务器错误",
		})
		return
	}

	// 检查路径是否在允许的上传目录内
	if !strings.HasPrefix(absPath, uploadDir) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "访问被拒绝",
		})
		return
	}

	// 检查文件是否存在
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "文件不存在",
			"path":    filePath,
		})
		return
	}

	// 获取文件名，用于设置下载文件名
	fileName := filepath.Base(fullPath)

	// 设置适当的响应头
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Cache-Control", "no-cache")

	// 返回文件
	c.File(fullPath)
}
