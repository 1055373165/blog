package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"blog-backend/internal/config"
)

// ClaudeClient Claude API 客户端
type ClaudeClient struct {
	apiKey  string
	baseURL string
	model   string
	timeout time.Duration
	client  *http.Client
}

// ClaudeRequest Claude API 请求结构
type ClaudeRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	Messages  []Message `json:"messages"`
}

// Message Claude API 消息结构
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ClaudeResponse Claude API 响应结构
type ClaudeResponse struct {
	Content []Content `json:"content"`
	Usage   Usage     `json:"usage"`
}

// Content 响应内容结构
type Content struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Usage 使用情况结构
type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

// NewClaudeClient 创建新的 Claude 客户端
func NewClaudeClient() *ClaudeClient {
	cfg := config.GlobalConfig.Claude
	
	return &ClaudeClient{
		apiKey:  cfg.APIKey,
		baseURL: cfg.BaseURL,
		model:   cfg.Model,
		timeout: cfg.Timeout,
		client: &http.Client{
			Timeout: cfg.Timeout,
		},
	}
}

// GetBookDescription 获取书籍的详细内容简介
func (c *ClaudeClient) GetBookDescription(bookName string) (string, error) {
	if c.apiKey == "" {
		// 如果没有配置 API Key，返回默认描述
		return c.getDefaultDescription(bookName), nil
	}

	prompt := fmt.Sprintf("请为《%s》这本书提供一个详细的内容简介，包括书籍的主要内容、适合读者、学习重点等。请用中文回答，内容要专业且实用。", bookName)

	request := ClaudeRequest{
		Model:     c.model,
		MaxTokens: 500,
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	requestBody, err := json.Marshal(request)
	if err != nil {
		return c.getDefaultDescription(bookName), fmt.Errorf("序列化请求失败: %v", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/v1/messages", bytes.NewBuffer(requestBody))
	if err != nil {
		return c.getDefaultDescription(bookName), fmt.Errorf("创建请求失败: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return c.getDefaultDescription(bookName), fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.getDefaultDescription(bookName), fmt.Errorf("读取响应失败: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return c.getDefaultDescription(bookName), fmt.Errorf("API请求失败，状态码: %d, 响应: %s", resp.StatusCode, string(body))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return c.getDefaultDescription(bookName), fmt.Errorf("解析响应失败: %v", err)
	}

	if len(claudeResp.Content) > 0 && claudeResp.Content[0].Type == "text" {
		return claudeResp.Content[0].Text, nil
	}

	return c.getDefaultDescription(bookName), fmt.Errorf("未获取到有效的响应内容")
}

// getDefaultDescription 获取默认描述
func (c *ClaudeClient) getDefaultDescription(bookName string) string {
	defaultDescriptions := map[string]string{
		"操作系统导论": "《操作系统导论》是计算机科学领域的经典教材，被誉为操作系统学习的'神书'。本书以清晰易懂的方式介绍了操作系统的基本概念、原理和实现。内容涵盖进程管理、内存管理、文件系统、并发控制等核心主题。作者通过大量实例和图解，帮助读者深入理解操作系统的工作原理。适合计算机科学专业学生、软件工程师以及对系统编程感兴趣的开发者阅读。",
		"100 个 Go 语言典型错误": "这是一本专门总结Go语言开发过程中常见错误的实战指南。通过分析100个典型错误案例，帮助开发者快速识别和避免常见的编程陷阱。内容涵盖语法错误、并发问题、性能优化、最佳实践等方面。每个错误案例都配有详细的解释和正确的解决方案，是Go语言开发者提升代码质量、避免常见错误的必备参考书。",
		"Go Web 编程": "全面介绍使用Go语言进行Web开发的权威指南。从HTTP协议基础到高级Web框架应用，循序渐进地讲解Go语言在Web开发中的应用。内容包括路由设计、模板渲染、数据库操作、中间件开发、RESTful API设计等核心技术。通过丰富的实例和项目实战，帮助读者掌握现代Web应用开发的完整流程。",
	}

	if desc, exists := defaultDescriptions[bookName]; exists {
		return desc
	}

	return fmt.Sprintf("《%s》是一本优秀的技术读物，内容丰富实用，能够帮助读者深入理解相关技术概念和实践应用。本书适合不同层次的读者，从入门到进阶都能找到有价值的内容，是技术学习和技能提升的重要参考资料。", bookName)
}