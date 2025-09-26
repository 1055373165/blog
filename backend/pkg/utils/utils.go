package utils

import (
	"fmt"
	"html"
	"math"
	"net"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
)

// GenerateSlug 生成URL友好的slug
func GenerateSlug(text string) string {
	// 转换为小写
	slug := strings.ToLower(text)
	
	// 替换中文和特殊字符为连字符
	reg := regexp.MustCompile(`[^\p{L}\p{N}\s-_]+`)
	slug = reg.ReplaceAllString(slug, "")
	
	// 替换空格和下划线为连字符
	reg = regexp.MustCompile(`[\s_-]+`)
	slug = reg.ReplaceAllString(slug, "-")
	
	// 移除开头和结尾的连字符
	slug = strings.Trim(slug, "-")
	
	// 如果slug为空或太短，使用当前时间戳
	if len(slug) < 3 {
		slug = fmt.Sprintf("article-%d", time.Now().Unix())
	}
	
	// 限制长度
	if len(slug) > 100 {
		slug = slug[:100]
		// 确保不在单词中间截断
		if lastDash := strings.LastIndex(slug, "-"); lastDash > 80 {
			slug = slug[:lastDash]
		}
	}
	
	return slug
}

// GenerateUniqueSlug 生成唯一的slug
func GenerateUniqueSlug(baseSlug string) string {
	slug := baseSlug
	counter := 1
	
	for {
		var article models.Article
		err := database.DB.Where("slug = ?", slug).First(&article).Error
		if err != nil {
			// slug不存在，可以使用
			break
		}
		
		// slug已存在，添加数字后缀
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
		
		// 防止无限循环
		if counter > 1000 {
			slug = fmt.Sprintf("%s-%d", baseSlug, time.Now().Unix())
			break
		}
	}
	
	return slug
}

// CalculateReadingTime 计算阅读时间（分钟）
func CalculateReadingTime(content string) int {
	// 移除HTML标签
	plainText := StripHTML(content)
	
	// 计算单词数（中英文混合）
	words := countWords(plainText)
	
	// 平均阅读速度：中文250字/分钟，英文200词/分钟
	// 这里简化处理，按照220字词/分钟计算
	minutes := int(math.Ceil(float64(words) / 220.0))
	
	if minutes < 1 {
		minutes = 1
	}
	
	return minutes
}

// EstimateReadingTime 估算阅读时间（CalculateReadingTime的别名）
func EstimateReadingTime(content string) int {
	return CalculateReadingTime(content)
}

// countWords 计算单词数（支持中英文）
func countWords(text string) int {
	// 移除多余空格
	text = strings.TrimSpace(text)
	if text == "" {
		return 0
	}
	
	// 统计中文字符
	chineseReg := regexp.MustCompile(`[\p{Han}]`)
	chineseChars := len(chineseReg.FindAllString(text, -1))
	
	// 移除中文字符后统计英文单词
	textWithoutChinese := chineseReg.ReplaceAllString(text, " ")
	englishWords := len(strings.Fields(textWithoutChinese))
	
	// 中文字符按字计算，英文按词计算
	return chineseChars + englishWords
}

// StripHTML 移除HTML标签
func StripHTML(htmlContent string) string {
	// 解码HTML实体
	content := html.UnescapeString(htmlContent)
	
	// 移除HTML标签
	reg := regexp.MustCompile(`<[^>]*>`)
	content = reg.ReplaceAllString(content, "")
	
	// 移除多余的空白字符
	reg = regexp.MustCompile(`\s+`)
	content = reg.ReplaceAllString(content, " ")
	
	return strings.TrimSpace(content)
}

// TruncateText 截取文本并添加省略号
func TruncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	
	// 尝试在单词边界截取
	if maxLength > 3 {
		truncated := text[:maxLength-3]
		if lastSpace := strings.LastIndex(truncated, " "); lastSpace > maxLength/2 {
			return truncated[:lastSpace] + "..."
		}
	}
	
	return text[:maxLength-3] + "..."
}

// FormatDate 格式化日期
func FormatDate(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

// FormatRelativeTime 格式化相对时间
func FormatRelativeTime(t time.Time) string {
	now := time.Now()
	diff := now.Sub(t)
	
	if diff < time.Minute {
		return "刚刚"
	} else if diff < time.Hour {
		return fmt.Sprintf("%d分钟前", int(diff.Minutes()))
	} else if diff < 24*time.Hour {
		return fmt.Sprintf("%d小时前", int(diff.Hours()))
	} else if diff < 30*24*time.Hour {
		return fmt.Sprintf("%d天前", int(diff.Hours()/24))
	} else if diff < 365*24*time.Hour {
		return fmt.Sprintf("%d个月前", int(diff.Hours()/(24*30)))
	} else {
		return fmt.Sprintf("%d年前", int(diff.Hours()/(24*365)))
	}
}

// ValidateSlug 验证slug格式
func ValidateSlug(slug string) bool {
	if len(slug) < 1 || len(slug) > 100 {
		return false
	}
	
	// slug只能包含字母、数字和连字符
	reg := regexp.MustCompile(`^[a-z0-9-]+$`)
	return reg.MatchString(slug)
}

// SanitizeHTML 清理HTML内容（保留安全标签）
func SanitizeHTML(htmlContent string) string {
	// 这里可以使用更专业的HTML清理库，如bluemonday
	// 暂时简单处理：移除不安全的标签和属性
	
	// 移除不安全的标签和属性
	reg := regexp.MustCompile(`<(\/?)(script|style|iframe|object|embed)[^>]*>`)
	content := reg.ReplaceAllString(htmlContent, "")
	
	// 移除危险的属性
	reg = regexp.MustCompile(`(?i)(on\w+|javascript:|data:)`)
	content = reg.ReplaceAllString(content, "")
	
	return content
}

// IsValidEmail 验证邮箱格式
func IsValidEmail(email string) bool {
	reg := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return reg.MatchString(email)
}

// GenerateExcerpt 从内容生成摘要
func GenerateExcerpt(content string, maxLength int) string {
	plainText := StripHTML(content)
	return TruncateText(plainText, maxLength)
}

// GetClientIP 获取客户端真实IP地址
func GetClientIP(c *gin.Context) string {
	// 检查 X-Forwarded-For 头
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// X-Forwarded-For 可能包含多个IP，取第一个
		ips := strings.Split(forwarded, ",")
		clientIP := strings.TrimSpace(ips[0])
		if net.ParseIP(clientIP) != nil {
			return clientIP
		}
	}

	// 检查 X-Real-IP 头
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" && net.ParseIP(realIP) != nil {
		return realIP
	}

	// 检查 CF-Connecting-IP (Cloudflare)
	cfIP := c.GetHeader("CF-Connecting-IP")
	if cfIP != "" && net.ParseIP(cfIP) != nil {
		return cfIP
	}

	// 使用 RemoteAddr
	remoteAddr := c.Request.RemoteAddr
	if ip, _, err := net.SplitHostPort(remoteAddr); err == nil {
		if net.ParseIP(ip) != nil {
			return ip
		}
	}

	// 如果以上都无法获取有效IP，返回默认值
	return "127.0.0.1"
}