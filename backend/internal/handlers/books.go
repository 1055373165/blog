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
)

// Book 书籍信息结构
type Book struct {
	ID          string    `json:"id"`
	Filename    string    `json:"filename"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	CreatedAt   time.Time `json:"created_at"`
}

// BookResponse API响应结构
type BookResponse struct {
	Success bool   `json:"success"`
	Data    []Book `json:"data"`
	Message string `json:"message,omitempty"`
}

// 支持的图片格式
var supportedImageFormats = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

// 智能书籍信息生成器
func generateBookInfo(filename string) (title, description string) {
	// 移除扩展名
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	
	// 如果是hash文件名，使用确定性生成而非随机
	if isHashFilename(name) {
		return generateDeterministicBookInfo(name)
	}
	
	// 如果包含可识别的模式，提取信息
	if strings.Contains(strings.ToLower(name), "go") {
		return generateGoBookInfo(name)
	}
	
	// 默认处理
	return generateDefaultBookInfo(name)
}

// 检查是否为hash文件名（长度>20且只包含字母数字）
func isHashFilename(name string) bool {
	if len(name) < 20 {
		return false
	}
	
	for _, char := range name {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
			return false
		}
	}
	return true
}

// Go语言相关书籍信息生成器
var goBookTopics = []struct {
	title       string
	description string
}{
	{"Go语言实战", "深入理解Go语言并发编程"},
	{"Go语言核心编程", "掌握Go语言设计理念"},
	{"Go语言高级编程", "构建高性能Web应用"},
	{"Go语言设计模式", "企业级应用架构设计"},
	{"Go微服务实战", "构建可扩展的微服务架构"},
	{"Go云原生开发", "Kubernetes与容器化应用"},
	{"Go并发编程", "goroutine与channel最佳实践"},
	{"Go Web开发", "构建现代Web应用程序"},
	{"Go性能优化", "高性能Go应用开发指南"},
	{"Go算法实现", "数据结构与算法Go实现"},
	{"Go系统编程", "系统级编程与网络开发"},
	{"Go项目实战", "企业级项目开发案例"},
	{"Go语言精进之路", "从入门到专家的进阶指南"},
	{"Go语言标准库", "深入解析标准库源码"},
	{"Go语言内存管理", "垃圾回收器原理与优化"},
}

// 确定性生成hash文件名的书籍信息
func generateDeterministicBookInfo(hashName string) (string, string) {
	// 使用hash的前几个字符来确定性地选择书籍信息
	hash := 0
	for _, char := range hashName {
		hash += int(char)
	}
	
	// 确保索引在有效范围内
	index := hash % len(goBookTopics)
	topic := goBookTopics[index]
	
	return topic.title, topic.description
}

func generateGoBookInfo(filename string) (string, string) {
	// 如果文件名包含Go相关信息，使用确定性生成
	if filename != "" {
		hash := 0
		for _, char := range filename {
			hash += int(char)
		}
		index := hash % len(goBookTopics)
		topic := goBookTopics[index]
		return topic.title, topic.description
	}
	
	// 默认返回第一个
	return goBookTopics[0].title, goBookTopics[0].description
}

func generateGenericBookInfo() (string, string) {
	return generateGoBookInfo("")
}

func generateDefaultBookInfo(name string) (string, string) {
	// 智能标题美化
	title := strings.ReplaceAll(name, "_", " ")
	title = strings.ReplaceAll(title, "-", " ")
	
	// 检测常见的技术关键词
	lowerName := strings.ToLower(name)
	
	// 根据文件名模式智能生成标题和描述
	switch {
	case strings.Contains(lowerName, "image") && strings.Contains(lowerName, "202"):
		// 截图格式的文件名
		return "Go编程技术图解", "Go语言技术概念与实践图解说明"
	case strings.Contains(lowerName, "go"):
		return "Go语言编程指南", "深入浅出Go语言编程技术"
	case strings.Contains(lowerName, "book"):
		return "技术编程手册", "全面的编程技术参考指南"
	case strings.Contains(lowerName, "guide"):
		return "编程实用指南", "实战导向的编程学习指南"
	case strings.Contains(lowerName, "tutorial"):
		return "编程教程大全", "从入门到精通的编程教程"
	case strings.Contains(lowerName, "manual"):
		return "技术手册", "详细的技术参考手册"
	default:
		// 默认美化处理
		title = strings.Title(title)
		if title == "" {
			title = "Go编程技术读物"
		}
		return title, "精选技术读物，助力编程技能提升"
	}
}

// GetBooks 获取书籍列表API
func GetBooks(c *gin.Context) {
	// 书籍目录路径
	booksPath := "../frontend/public/books"
	
	// 检查目录是否存在
	if _, err := os.Stat(booksPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, BookResponse{
			Success: false,
			Message: "书籍目录不存在",
		})
		return
	}
	
	// 读取目录内容
	files, err := ioutil.ReadDir(booksPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, BookResponse{
			Success: false,
			Message: "读取书籍目录失败",
		})
		return
	}
	
	var books []Book
	
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
		title, description := generateBookInfo(filename)
		
		book := Book{
			ID:          generateBookID(filename),
			Filename:    filename,
			Title:       title,
			Description: description,
			URL:         fmt.Sprintf("/books/%s", filename),
			CreatedAt:   file.ModTime(),
		}
		
		books = append(books, book)
	}
	
	// 按创建时间排序（最新的在前）
	sort.Slice(books, func(i, j int) bool {
		return books[i].CreatedAt.After(books[j].CreatedAt)
	})
	
	c.JSON(http.StatusOK, BookResponse{
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
	// 目前直接调用GetBooks即可，因为我们没有实现缓存
	GetBooks(c)
}

// GetBookMetadata 获取书籍元数据API（可扩展用于获取更详细的信息）
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
	booksPath := "../frontend/public/books"
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
	
	title, description := generateBookInfo(filename)
	
	metadata := map[string]interface{}{
		"id":          generateBookID(filename),
		"filename":    filename,
		"title":       title,
		"description": description,
		"url":         fmt.Sprintf("/books/%s", filename),
		"size":        fileInfo.Size(),
		"created_at":  fileInfo.ModTime(),
		"extension":   filepath.Ext(filename),
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metadata,
	})
}