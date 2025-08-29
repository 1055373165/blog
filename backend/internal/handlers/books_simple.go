package handlers

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"blog-backend/internal/services"
)

// Book 书籍信息结构
type BookSimple struct {
	ID                  string    `json:"id"`
	Filename            string    `json:"filename"`
	Title               string    `json:"title"`
	Description         string    `json:"description"`
	DetailedDescription string    `json:"detailed_description"` // 新增：详细描述
	Category            string    `json:"category"`             // 新增：分类
	Difficulty          string    `json:"difficulty"`           // 新增：难度等级
	Tags                []string  `json:"tags"`                 // 新增：标签
	Author              string    `json:"author"`               // 新增：作者
	URL                 string    `json:"url"`
	CreatedAt           time.Time `json:"created_at"`
}

// BookResponse API响应结构
type BookSimpleResponse struct {
	Success bool         `json:"success"`
	Data    []BookSimple `json:"data"`
	Message string       `json:"message,omitempty"`
}

// 支持的图片格式
var supportedImageFormats = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

// 简化的书籍信息生成器
func generateSimpleBookInfo(filename string) (title, description, detailedDescription, category, difficulty, author string, tags []string) {
	// 移除扩展名
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	
	// 检查是否为特定书籍，给出更好的描述
	switch name {
	case "100 个 Go 语言典型错误":
		return "100 个 Go 语言典型错误", "Go语言开发中常见错误与最佳实践指南",
			"这是一本专门针对Go语言开发中常见错误的实战指南。通过总结100个典型错误，帮助开发者避免常见的坑，提升代码质量。",
			"最佳实践", "intermediate", "技术专家", []string{"错误处理", "最佳实践", "调试"}
	case "Go Web 编程":
		return "Go Web 编程", "使用Go语言构建现代Web应用的完整指南",
			"全面介绍如何使用Go语言开发Web应用程序的权威指南。从HTTP基础到高级Web框架，涵盖了Web开发的各个方面。",
			"Web开发", "intermediate", "Web开发专家", []string{"Web开发", "HTTP", "API"}
	case "深入理解计算机系统（神书）":
		return "深入理解计算机系统（神书）", "计算机系统的经典教材",
			"被誉为神书的计算机系统经典教材。从程序员的角度深入浅出地介绍计算机系统的实现原理。",
			"计算机系统", "advanced", "系统专家", []string{"计算机系统", "底层原理"}
	default:
		// 默认处理
		title = strings.ReplaceAll(name, "_", " ")
		title = strings.ReplaceAll(title, "-", " ")
		if title == "" {
			title = "Go编程技术读物"
		}
		return title, "精选技术读物，助力编程技能提升",
			"这是一本精心挑选的技术读物，内容丰富实用，能够帮助开发者提升编程技能。",
			"技术读物", "intermediate", "技术专家", []string{"技术学习", "编程"}
	}
}

// GetBooksSimple 获取书籍列表API（简化版）
func GetBooksSimple(c *gin.Context) {
	// 书籍目录路径
	booksPath := "/app/books"
	
	// 检查目录是否存在
	if _, err := os.Stat(booksPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, BookSimpleResponse{
			Success: false,
			Message: "书籍目录不存在",
		})
		return
	}
	
	// 读取目录内容
	files, err := ioutil.ReadDir(booksPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, BookSimpleResponse{
			Success: false,
			Message: "读取书籍目录失败",
		})
		return
	}
	
	var books []BookSimple
	
	// 遍历文件
	for _, file := range files {
		if file.IsDir() {
			continue
		}
		
		filename := file.Name()
		ext := strings.ToLower(filepath.Ext(filename))
		
		// 检查是否为支持的图片格式
		if !supportedImageFormats[ext] {
			continue
		}
		
		// 生成书籍信息
		title, description, detailedDescription, category, difficulty, author, tags := generateSimpleBookInfo(filename)
		
		book := BookSimple{
			ID:                  generateBookID(filename),
			Filename:            filename,
			Title:               title,
			Description:         description,
			DetailedDescription: detailedDescription,
			Category:            category,
			Difficulty:          difficulty,
			Tags:                tags,
			Author:              author,
			URL:                 fmt.Sprintf("/books/%s", filename),
			CreatedAt:           file.ModTime(),
		}
		
		books = append(books, book)
	}
	
	// 按创建时间排序（最新的在前）
	sort.Slice(books, func(i, j int) bool {
		return books[i].CreatedAt.After(books[j].CreatedAt)
	})
	
	c.JSON(http.StatusOK, BookSimpleResponse{
		Success: true,
		Data:    books,
		Message: fmt.Sprintf("成功获取 %d 本书籍", len(books)),
	})
}

// 生成书籍ID（基于文件名的简单hash）
func generateBookID(filename string) string {
	// 使用文件名前8个字符作为ID，如果不足则使用完整文件名
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	if len(name) >= 8 {
		return name[:8]
	}
	return name
}

// RefreshBooks 刷新书籍缓存API（预留给将来使用）
func RefreshBooks(c *gin.Context) {
	// 这里可以实现缓存刷新逻辑
	// 目前直接调用GetBooksSimple即可
	GetBooksSimple(c)
}

// GetBookMetadata 获取书籍元数据API（简化版）
func GetBookMetadata(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "文件名不能为空",
		})
		return
	}
	
	// 检查文件是否存在
	booksPath := "/app/books"
	filePath := filepath.Join(booksPath, filename)
	
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "文件不存在",
		})
		return
	}
	
	// 获取文件信息
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取文件信息失败",
		})
		return
	}
	
	title, description, detailedDescription, category, difficulty, author, tags := generateSimpleBookInfo(filename)
	
	metadata := map[string]interface{}{
		"id":                   generateBookID(filename),
		"filename":             filename,
		"title":                title,
		"description":          description,
		"detailed_description": detailedDescription,
		"category":             category,
		"difficulty":           difficulty,
		"tags":                 tags,
		"author":               author,
		"url":                  fmt.Sprintf("/books/%s", filename),
		"size":                 fileInfo.Size(),
		"created_at":           fileInfo.ModTime(),
		"extension":            filepath.Ext(filename),
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metadata,
	})
}

// GetBookDetailedDescription 获取书籍的详细内容简介（通过 Claude API）
func GetBookDetailedDescription(c *gin.Context) {
	bookName := c.Query("book_name")
	if bookName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "书籍名称不能为空",
		})
		return
	}

	// 创建 Claude 客户端
	claudeClient := services.NewClaudeClient()

	// 获取详细描述
	description, err := claudeClient.GetBookDescription(bookName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":     false,
			"error":       "获取书籍详细描述失败",
			"description": description, // 即使出错也返回默认描述
			"details":     err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"book_name":   bookName,
		"description": description,
	})
}