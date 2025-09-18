package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"blog-backend/internal/config"

	"github.com/gin-gonic/gin"
)

// UploadMedia 处理音视频等大文件上传
func UploadMedia(c *gin.Context) {
	fmt.Printf("📦 [DEBUG] 媒体上传请求开始 - IP: %s, UA: %s\n", c.ClientIP(), c.GetHeader("User-Agent"))

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "获取上传文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !(strings.HasPrefix(contentType, "audio/") || strings.HasPrefix(contentType, "video/")) {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "仅支持音频或视频文件",
			"allowed": []string{"audio/*", "video/*"},
		})
		return
	}

	// 尺寸限制（与路由中间件一致，留出一点冗余）
	const maxSize = 200 * 1024 * 1024 // 200MB
	if header.Size > 0 && header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"message": "文件大小超过限制",
			"maxSize": "200MB",
		})
		return
	}

	// 生成存储路径：/app/uploads/media/{audio|video}/YYYY/MM/DD/
	cfg := config.GlobalConfig
	mediaKind := "audio"
	if strings.HasPrefix(contentType, "video/") {
		mediaKind = "video"
	}

	dateDir := time.Now().Format("2006/01/02")
	saveDir := filepath.Join(cfg.Upload.Path, "media", mediaKind, dateDir)
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "创建上传目录失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成文件名：HHMMSS + 原始扩展名（若无扩展名则从 MIME 推断）
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// 简单根据 content type 推断
		if strings.HasPrefix(contentType, "audio/") {
			switch contentType {
			case "audio/mpeg":
				ext = ".mp3"
			case "audio/wav":
				ext = ".wav"
			case "audio/x-wav":
				ext = ".wav"
			case "audio/ogg":
				ext = ".ogg"
			case "audio/flac":
				ext = ".flac"
			default:
				ext = ".audio"
			}
		} else if strings.HasPrefix(contentType, "video/") {
			switch contentType {
			case "video/mp4":
				ext = ".mp4"
			case "video/webm":
				ext = ".webm"
			case "video/ogg":
				ext = ".ogv"
			case "video/x-matroska":
				ext = ".mkv"
			default:
				ext = ".video"
			}
		}
	}

	filename := fmt.Sprintf("%s%s", time.Now().Format("150405"), ext)
	dstPath := filepath.Join(saveDir, filename)

	// 将上传内容流式写入磁盘，避免占用过多内存
	out, err := os.Create(dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "创建文件失败",
			"error":   err.Error(),
		})
		return
	}
	defer out.Close()

	written, err := io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "保存文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 构造访问 URL（生产环境通过 Nginx /uploads/media/ 反代）
	var url string
	// 相对路径用于拼接 URL
	relPath := filepath.Join("/uploads/media", mediaKind, dateDir, filename)
	relPath = strings.ReplaceAll(relPath, "\\", "/")
	fmt.Println("relPath: ", relPath)

	if cfg.IsDevelopment() {
		fmt.Println("开发环境")
		// 构造开发环境URL，路径格式：/api/upload/media/{mediaKind}/{YYYY}/{MM}/{DD}/{filename}
		mediaPath := fmt.Sprintf("%s/%s/%s", mediaKind, dateDir, filename)
		url = fmt.Sprintf("http://localhost:%s/api/upload/media/%s", cfg.Server.Port, mediaPath)
	} else {
		fmt.Println("生产环境")
		url = fmt.Sprintf("https://www.godepth.top%s", relPath)
	}

	c.JSON(http.StatusOK, gin.H{
		"url":       url,
		"filename":  filename,
		"size":      written,
		"mime_type": contentType,
	})
}

// GetMedia 获取媒体文件
func GetMedia(c *gin.Context) {
	mediaPath := c.Param("filename")
	if mediaPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "文件路径不能为空",
		})
		return
	}

	mediaPath = strings.TrimPrefix(mediaPath, "/")

	cfg := config.GlobalConfig
	fullPath := filepath.Join(cfg.Upload.Path, "media", mediaPath)

	// 安全检查，确保访问路径在上传目录内
	uploadDir, err := filepath.Abs(cfg.Upload.Path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器错误"})
		return
	}
	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "服务器错误"})
		return
	}
	if !strings.HasPrefix(absPath, uploadDir) {
		c.JSON(http.StatusForbidden, gin.H{"message": "访问被拒绝"})
		return
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "文件不存在",
			"path":    mediaPath,
		})
		return
	}

	// 缓存头
	c.Header("Cache-Control", "public, max-age=31536000")
	c.Header("X-Content-Type-Options", "nosniff")
	c.File(fullPath)
}
