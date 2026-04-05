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
const defaultCategory = "默认"

// CoverImage 封面图片信息
type CoverImage struct {
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	ThumbnailURL string    `json:"thumbnail_url"`
	RelativePath string    `json:"relative_path"`
	Size         int64     `json:"size"`
	ModTime      time.Time `json:"mod_time"`
	IsDefault    bool      `json:"is_default"`
	Category     string    `json:"category"`
}

// CoverCategory 封面图片分类信息
type CoverCategory struct {
	Name       string `json:"name"`
	ImageCount int    `json:"image_count"`
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

// isSupportedImage checks if the file extension is a supported image format
func isSupportedImage(filename string) bool {
	supportedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".svg":  true,
	}
	ext := strings.ToLower(filepath.Ext(filename))
	return supportedExts[ext]
}

// buildCoverImageURL generates the URL for a cover image based on environment
func buildCoverImageURL(cfg *config.Config, pathSegments ...string) string {
	path := strings.Join(pathSegments, "/")
	if cfg.App.Environment == "development" {
		return fmt.Sprintf("http://localhost:%s/api/upload/cover/%s", cfg.Server.Port, path)
	}
	return fmt.Sprintf("https://www.godepth.top/uploads/cover/%s", path)
}

// buildThumbnailURL returns the thumbnail URL for a given cover image.
// thumbnailKey is the unique identifier used as the thumbnail filename (e.g. "category__filename" or just "filename").
func buildThumbnailURL(cfg *config.Config, thumbnailKey string) string {
	thumbFilename := thumbnailKey + ".jpg"
	if cfg.App.Environment == "development" {
		return fmt.Sprintf("http://localhost:%s/api/upload/cover/%s/%s", cfg.Server.Port, thumbnailDir, thumbFilename)
	}
	return fmt.Sprintf("https://www.godepth.top/uploads/cover/%s/%s", thumbnailDir, thumbFilename)
}

// sanitizeCategory cleans and validates a category name
func sanitizeCategory(category string) string {
	category = strings.TrimSpace(category)
	// Prevent path traversal
	category = strings.ReplaceAll(category, "..", "")
	category = strings.ReplaceAll(category, "/", "")
	category = strings.ReplaceAll(category, "\\", "")
	if category == "" || category == thumbnailDir {
		return defaultCategory
	}
	return category
}

// scanCategoryImages scans images in a specific category directory and returns CoverImage list.
// For root-level images (category == defaultCategory), it scans the coverDir root.
func scanCategoryImages(cfg *config.Config, coverDir, category string) []CoverImage {
	var images []CoverImage
	var scanDir string

	if category == defaultCategory {
		scanDir = coverDir
	} else {
		scanDir = filepath.Join(coverDir, category)
	}

	files, err := os.ReadDir(scanDir)
	if err != nil {
		return images
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}
		filename := file.Name()
		if !isSupportedImage(filename) {
			continue
		}

		fileInfo, err := file.Info()
		if err != nil {
			continue
		}

		var imageURL string
		var thumbnailKey string
		var relativePath string

		if category == defaultCategory {
			// Root-level images
			imageURL = buildCoverImageURL(cfg, filename)
			thumbnailKey = filename
			relativePath = fmt.Sprintf("/cover/%s", filename)
		} else {
			// Category subdirectory images
			imageURL = buildCoverImageURL(cfg, category, filename)
			thumbnailKey = category + "__" + filename
			relativePath = fmt.Sprintf("/cover/%s/%s", category, filename)
		}

		// Generate thumbnail
		thumbDir := filepath.Join(coverDir, thumbnailDir)
		srcPath := filepath.Join(scanDir, filename)
		if err := generateThumbnail(srcPath, thumbDir, thumbnailKey); err != nil {
			fmt.Printf("WARNING: failed to generate thumbnail for %s/%s: %v\n", category, filename, err)
		}

		images = append(images, CoverImage{
			Name:         filename,
			URL:          imageURL,
			ThumbnailURL: buildThumbnailURL(cfg, thumbnailKey),
			RelativePath: relativePath,
			Size:         fileInfo.Size(),
			ModTime:      fileInfo.ModTime(),
			IsDefault:    strings.HasPrefix(filename, "cover_"),
			Category:     category,
		})
	}

	return images
}

// GetCoverImages 获取所有封面图片列表（含分类信息）
func GetCoverImages(c *gin.Context) {
	cfg := config.GlobalConfig
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

	var allImages []CoverImage
	var categories []CoverCategory

	// 1. Scan root-level images (defaultCategory)
	rootImages := scanCategoryImages(cfg, coverDir, defaultCategory)
	if len(rootImages) > 0 {
		allImages = append(allImages, rootImages...)
		categories = append(categories, CoverCategory{
			Name:       defaultCategory,
			ImageCount: len(rootImages),
		})
	}

	// 2. Scan subdirectory categories
	entries, err := os.ReadDir(coverDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "读取封面图片目录失败",
			"error":   err.Error(),
		})
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dirName := entry.Name()
		// Skip the thumbnails directory
		if dirName == thumbnailDir {
			continue
		}

		catImages := scanCategoryImages(cfg, coverDir, dirName)
		if len(catImages) > 0 {
			allImages = append(allImages, catImages...)
			categories = append(categories, CoverCategory{
				Name:       dirName,
				ImageCount: len(catImages),
			})
		}
	}

	// Sort by modification time, newest first
	sort.Slice(allImages, func(i, j int) bool {
		return allImages[i].ModTime.After(allImages[j].ModTime)
	})

	fmt.Printf("📸 [DEBUG] 找到 %d 个封面图片，%d 个分类\n", len(allImages), len(categories))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取封面图片列表成功",
		"data": gin.H{
			"images":     allImages,
			"categories": categories,
			"total":      len(allImages),
		},
	})
}

// GetCoverCategories 获取封面图片分类列表
func GetCoverCategories(c *gin.Context) {
	cfg := config.GlobalConfig
	coverDir := filepath.Join(cfg.Upload.Path, "cover")

	if err := os.MkdirAll(coverDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无法创建封面图片目录",
			"error":   err.Error(),
		})
		return
	}

	var categories []CoverCategory

	// Check root-level images for default category
	rootFiles, _ := os.ReadDir(coverDir)
	rootImageCount := 0
	for _, f := range rootFiles {
		if !f.IsDir() && isSupportedImage(f.Name()) {
			rootImageCount++
		}
	}
	if rootImageCount > 0 {
		categories = append(categories, CoverCategory{
			Name:       defaultCategory,
			ImageCount: rootImageCount,
		})
	}

	// Scan subdirectories
	for _, entry := range rootFiles {
		if !entry.IsDir() || entry.Name() == thumbnailDir {
			continue
		}
		subFiles, _ := os.ReadDir(filepath.Join(coverDir, entry.Name()))
		imgCount := 0
		for _, f := range subFiles {
			if !f.IsDir() && isSupportedImage(f.Name()) {
				imgCount++
			}
		}
		if imgCount > 0 {
			categories = append(categories, CoverCategory{
				Name:       entry.Name(),
				ImageCount: imgCount,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取封面图片分类列表成功",
		"data": gin.H{
			"categories": categories,
		},
	})
}

// UploadCoverImage 上传封面图片到 cover 目录（支持分类）
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

	// 获取分类参数
	category := sanitizeCategory(c.PostForm("category"))

	fmt.Printf("📄 [DEBUG] 文件信息 - 名称: %s, 大小: %d bytes, 分类: %s\n", header.Filename, header.Size, category)

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

	cfg := config.GlobalConfig
	coverDir := filepath.Join(cfg.Upload.Path, "cover")

	// Determine target directory based on category
	var targetDir string
	if category == defaultCategory {
		targetDir = coverDir
	} else {
		targetDir = filepath.Join(coverDir, category)
	}

	// 确保目录存在
	if err := os.MkdirAll(targetDir, 0755); err != nil {
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
	fullPath := filepath.Join(targetDir, filename)

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

	// Build image URL
	var imageURL string
	var thumbnailKey string
	if category == defaultCategory {
		imageURL = buildCoverImageURL(cfg, filename)
		thumbnailKey = filename
	} else {
		imageURL = buildCoverImageURL(cfg, category, filename)
		thumbnailKey = category + "__" + filename
	}

	// Generate thumbnail
	thumbDirPath := filepath.Join(coverDir, thumbnailDir)
	if err := generateThumbnail(fullPath, thumbDirPath, thumbnailKey); err != nil {
		fmt.Printf("WARNING: failed to generate thumbnail for %s: %v\n", filename, err)
	}

	fmt.Printf("✅ [SUCCESS] 封面图片上传成功 - 文件: %s, 分类: %s, URL: %s\n", filename, category, imageURL)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "封面图片上传成功",
		"data": gin.H{
			"url":           imageURL,
			"thumbnail_url": buildThumbnailURL(cfg, thumbnailKey),
			"filename":      filename,
			"category":      category,
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

// DeleteCoverImage 删除封面图片（支持分类路径）
func DeleteCoverImage(c *gin.Context) {
	// Use wildcard param to support category/filename paths
	filePath := c.Param("filepath")
	filePath = strings.TrimPrefix(filePath, "/")

	if filePath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "文件路径不能为空",
		})
		return
	}

	// 安全检查：防止路径遍历
	if strings.Contains(filePath, "..") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的文件路径",
		})
		return
	}

	cfg := config.GlobalConfig
	fullPath := filepath.Join(cfg.Upload.Path, "cover", filePath)

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

	// 删除对应缩略图 — determine thumbnail key
	filename := filepath.Base(filePath)
	parts := strings.Split(filePath, "/")
	var thumbnailKey string
	if len(parts) == 2 {
		// category/filename format
		thumbnailKey = parts[0] + "__" + parts[1]
	} else {
		// root-level filename
		thumbnailKey = filename
	}
	thumbPath := filepath.Join(cfg.Upload.Path, "cover", thumbnailDir, thumbnailKey+".jpg")
	os.Remove(thumbPath) // ignore error, thumbnail may not exist

	fmt.Printf("🗑️ [SUCCESS] 封面图片已删除: %s\n", filePath)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "封面图片删除成功",
	})
}

// RenameCoverCategory 重命名封面图片分类
func RenameCoverCategory(c *gin.Context) {
	oldName := c.Param("name")
	if oldName == "" || oldName == defaultCategory || oldName == thumbnailDir {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的分类名称",
		})
		return
	}

	var req struct {
		NewName string `json:"new_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请提供新的分类名称",
		})
		return
	}

	newName := sanitizeCategory(req.NewName)
	if newName == defaultCategory || newName == thumbnailDir {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不能使用保留的分类名称",
		})
		return
	}

	cfg := config.GlobalConfig
	coverDir := filepath.Join(cfg.Upload.Path, "cover")
	oldPath := filepath.Join(coverDir, oldName)
	newPath := filepath.Join(coverDir, newName)

	// Check old category exists
	if _, err := os.Stat(oldPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "分类不存在",
		})
		return
	}

	// Check new name doesn't conflict
	if _, err := os.Stat(newPath); err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "目标分类名已存在",
		})
		return
	}

	// Rename the directory
	if err := os.Rename(oldPath, newPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "重命名分类失败",
			"error":   err.Error(),
		})
		return
	}

	// Rename associated thumbnails
	thumbDirPath := filepath.Join(coverDir, thumbnailDir)
	if thumbFiles, err := os.ReadDir(thumbDirPath); err == nil {
		oldPrefix := oldName + "__"
		newPrefix := newName + "__"
		for _, tf := range thumbFiles {
			if strings.HasPrefix(tf.Name(), oldPrefix) {
				newThumbName := newPrefix + strings.TrimPrefix(tf.Name(), oldPrefix)
				os.Rename(
					filepath.Join(thumbDirPath, tf.Name()),
					filepath.Join(thumbDirPath, newThumbName),
				)
			}
		}
	}

	fmt.Printf("📝 [SUCCESS] 分类重命名: %s -> %s\n", oldName, newName)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "分类重命名成功",
	})
}

// DeleteCoverCategory 删除封面图片分类及其中所有图片
func DeleteCoverCategory(c *gin.Context) {
	name := c.Param("name")
	if name == "" || name == defaultCategory || name == thumbnailDir {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的分类名称",
		})
		return
	}

	cfg := config.GlobalConfig
	coverDir := filepath.Join(cfg.Upload.Path, "cover")
	catPath := filepath.Join(coverDir, name)

	// Safety check
	absPath, err := filepath.Abs(catPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "服务器错误",
		})
		return
	}
	uploadDir, _ := filepath.Abs(cfg.Upload.Path)
	if !strings.HasPrefix(absPath, uploadDir) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "访问被拒绝",
		})
		return
	}

	if _, err := os.Stat(catPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "分类不存在",
		})
		return
	}

	// Remove associated thumbnails
	thumbDirPath := filepath.Join(coverDir, thumbnailDir)
	if thumbFiles, err := os.ReadDir(thumbDirPath); err == nil {
		prefix := name + "__"
		for _, tf := range thumbFiles {
			if strings.HasPrefix(tf.Name(), prefix) {
				os.Remove(filepath.Join(thumbDirPath, tf.Name()))
			}
		}
	}

	// Remove the entire category directory
	if err := os.RemoveAll(catPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除分类失败",
			"error":   err.Error(),
		})
		return
	}

	fmt.Printf("🗑️ [SUCCESS] 分类已删除: %s\n", name)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "分类删除成功",
	})
}
