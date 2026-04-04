package handlers

import (
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"blog-backend/internal/config"

	"github.com/gin-gonic/gin"
	_ "golang.org/x/image/webp"
	"golang.org/x/image/draw"
)

const thumbnailMaxWidth = 400
const thumbnailDir = "thumbnails"

// CoverImage 封面图片信息
type CoverImage struct {
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	ThumbnailURL string    `json:"thumbnail_url"`
	RelativePath string    `json:"relative_path"`
	Size         int64     `json:"size"`
	ModTime      time.Time `json:"mod_time"`
	IsDefault    bool      `json:"is_default"`
}

// generateThumbnail creates a thumbnail for the given image file.
// Returns the thumbnail filename or error.
func generateThumbnail(srcPath, thumbDir, filename string) error {
	// SVG 不支持生成缩略图，直接跳过
	if strings.ToLower(filepath.Ext(filename)) == ".svg" {
		return nil
	}

	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return fmt.Errorf("create thumbnail dir: %w", err)
	}

	thumbPath := filepath.Join(thumbDir, filename+".jpg")

	// Skip if thumbnail already exists and is newer than source
	srcInfo, err := os.Stat(srcPath)
	if err != nil {
		return err
	}
	if thumbInfo, err := os.Stat(thumbPath); err == nil {
		if thumbInfo.ModTime().After(srcInfo.ModTime()) {
			return nil // thumbnail is up to date
		}
	}

	srcFile, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	srcImg, _, err := image.Decode(srcFile)
	if err != nil {
		return fmt.Errorf("decode image: %w", err)
	}

	bounds := srcImg.Bounds()
	origW := bounds.Dx()
	origH := bounds.Dy()

	// Calculate new dimensions maintaining aspect ratio
	newW := thumbnailMaxWidth
	newH := origH * newW / origW
	if origW <= thumbnailMaxWidth {
		// Image is already small enough
		newW = origW
		newH = origH
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.ApproxBiLinear.Scale(dst, dst.Bounds(), srcImg, srcImg.Bounds(), draw.Over, nil)

	thumbFile, err := os.Create(thumbPath)
	if err != nil {
		return err
	}
	defer thumbFile.Close()

	return jpeg.Encode(thumbFile, dst, &jpeg.Options{Quality: 75})
}

// getThumbnailURL returns the thumbnail URL for a given cover image filename.
func getThumbnailURL(cfg *config.Config, filename string) string {
	thumbFilename := filename + ".jpg"
	if cfg.App.Environment == "development" {
		return fmt.Sprintf("http://localhost:%s/api/upload/cover/%s/%s", cfg.Server.Port, thumbnailDir, thumbFilename)
	}
	return fmt.Sprintf("https://www.godepth.top/uploads/cover/%s/%s", thumbnailDir, thumbFilename)
}

// GetCoverImages 获取所有封面图片列表
func GetCoverImages(c *gin.Context) {
	// 获取前端静态文件目录中的 cover 文件夹
	// 在生产环境中，这个路径应该指向前端构建后的静态文件目录
	cfg := config.GlobalConfig

	// 使用与现有图片上传相同的目录结构
	coverDir := filepath.Join(cfg.Upload.Path, "cover")

	// 确保目录存在
	if err := os.MkdirAll(coverDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无法创建封面图片目录",
			"error":   err.Error(),
		})
		return
	}

	fmt.Printf("📁 [DEBUG] 封面图片目录: %s\n", coverDir)

	// 读取目录中的所有图片文件
	files, err := os.ReadDir(coverDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取封面图片目录失败",
			"error":   err.Error(),
		})
		return
	}

	var coverImages []CoverImage
	supportedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".svg":  true,
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		filename := file.Name()
		ext := strings.ToLower(filepath.Ext(filename))

		// 只处理支持的图片格式
		if !supportedExts[ext] {
			continue
		}

		// 获取文件信息
		fileInfo, err := file.Info()
		if err != nil {
			continue
		}

		// 生成URL路径，使用与现有图片上传相同的模式
		var imageURL string
		if cfg.App.Environment == "development" {
			// 开发环境使用本地API路径
			imageURL = fmt.Sprintf("http://localhost:%s/api/upload/cover/%s", cfg.Server.Port, filename)
		} else {
			// 生产环境使用 uploads/cover 路径，通过 Nginx 代理
			imageURL = fmt.Sprintf("https://www.godepth.top/uploads/cover/%s", filename)
		}

		// Generate thumbnail if needed
		thumbDir := filepath.Join(coverDir, thumbnailDir)
		if err := generateThumbnail(filepath.Join(coverDir, filename), thumbDir, filename); err != nil {
			fmt.Printf("WARNING: failed to generate thumbnail for %s: %v\n", filename, err)
		}

		coverImage := CoverImage{
			Name:         filename,
			URL:          imageURL,
			ThumbnailURL: getThumbnailURL(cfg, filename),
			RelativePath: fmt.Sprintf("/cover/%s", filename),
			Size:         fileInfo.Size(),
			ModTime:      fileInfo.ModTime(),
			IsDefault:    strings.HasPrefix(filename, "cover_"),
		}

		coverImages = append(coverImages, coverImage)
	}

	// 按修改时间倒序排列，最新的在前面
	sort.Slice(coverImages, func(i, j int) bool {
		return coverImages[i].ModTime.After(coverImages[j].ModTime)
	})

	fmt.Printf("📸 [DEBUG] 找到 %d 个封面图片\n", len(coverImages))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取封面图片列表成功",
		"data": gin.H{
			"images": coverImages,
			"total":  len(coverImages),
		},
	})
}

// UploadCoverImage 上传封面图片到 cover 目录
func UploadCoverImage(c *gin.Context) {
	fmt.Printf("📸 [DEBUG] 封面图片上传请求开始\n")

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

	fmt.Printf("📄 [DEBUG] 文件信息 - 名称: %s, 大小: %d bytes\n", header.Filename, header.Size)

	// 验证文件类型
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}

	contentType := header.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的文件类型",
			"allowed": []string{"jpeg", "jpg", "png", "gif", "webp"},
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

	// 使用与现有图片上传相同的目录结构
	cfg := config.GlobalConfig
	coverDir := filepath.Join(cfg.Upload.Path, "cover")

	// 确保目录存在
	if err := os.MkdirAll(coverDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建封面图片目录失败",
			"error":   err.Error(),
		})
		return
	}

	// 生成文件名：cover_ + 时间戳 + 原始扩展名
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}

	filename := fmt.Sprintf("cover_%d%s", time.Now().UnixNano(), ext)
	fullPath := filepath.Join(coverDir, filename)

	// 读取文件内容
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取文件内容失败",
			"error":   err.Error(),
		})
		return
	}

	// 保存文件
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

	// 生成URL，使用与现有图片上传相同的模式
	var imageURL string
	if cfg.App.Environment == "development" {
		imageURL = fmt.Sprintf("http://localhost:%s/api/upload/cover/%s", cfg.Server.Port, filename)
	} else {
		imageURL = fmt.Sprintf("https://www.godepth.top/uploads/cover/%s", filename)
	}

	// Generate thumbnail
	thumbDir := filepath.Join(coverDir, thumbnailDir)
	if err := generateThumbnail(fullPath, thumbDir, filename); err != nil {
		fmt.Printf("WARNING: failed to generate thumbnail for %s: %v\n", filename, err)
	}

	fmt.Printf("✅ [SUCCESS] 封面图片上传成功 - 文件: %s, URL: %s\n", filename, imageURL)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "封面图片上传成功",
		"data": gin.H{
			"url":           imageURL,
			"thumbnail_url": getThumbnailURL(cfg, filename),
			"filename":      filename,
			"relative_path": fmt.Sprintf("/uploads/cover/%s", filename),
			"size":          header.Size,
			"type":          contentType,
		},
	})
}

// GetCoverImage 获取封面图片文件（类似 GetImage）
func GetCoverImage(c *gin.Context) {
	// 获取路径参数，支持嵌套路径
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
	fullPath := filepath.Join(cfg.Upload.Path, "cover", imagePath)

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

// DeleteCoverImage 删除封面图片
func DeleteCoverImage(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件名不能为空",
		})
		return
	}

	// 安全检查：防止路径遍历
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文件名",
		})
		return
	}

	cfg := config.GlobalConfig
	fullPath := filepath.Join(cfg.Upload.Path, "cover", filename)

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
		})
		return
	}

	// 删除文件
	if err := os.Remove(fullPath); err != nil {
		fmt.Printf("❌ [ERROR] 删除封面图片失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除文件失败",
			"error":   err.Error(),
		})
		return
	}

	// 删除对应缩略图
	thumbPath := filepath.Join(cfg.Upload.Path, "cover", thumbnailDir, filename+".jpg")
	os.Remove(thumbPath) // ignore error, thumbnail may not exist

	fmt.Printf("🗑️ [SUCCESS] 封面图片已删除: %s\n", filename)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "封面图片删除成功",
	})
}
