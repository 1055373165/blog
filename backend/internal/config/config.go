package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config 应用配置结构
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Redis    RedisConfig
	Upload   UploadConfig
	Search   SearchConfig
	CORS     CORSConfig
	App      AppConfig
	Claude   ClaudeConfig
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port    string
	Mode    string
	Host    string
	Timeout time.Duration
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host         string
	Port         string
	User         string
	Password     string
	Name         string
	SSLMode      string
	TimeZone     string
	MaxOpenConns int
	MaxIdleConns int
	MaxLifetime  time.Duration
}

// JWTConfig JWT配置
type JWTConfig struct {
	Secret    string
	ExpiresIn time.Duration
}

// RedisConfig Redis配置
type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// UploadConfig 文件上传配置
type UploadConfig struct {
	Path        string
	MaxFileSize int64
	AllowedExts []string
}

// SearchConfig 搜索配置
type SearchConfig struct {
	IndexPath   string
	EnableCache bool
	CacheTTL    time.Duration
	BatchSize   int
}

// CORSConfig CORS配置
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

// AppConfig 应用配置
type AppConfig struct {
	Name        string
	Version     string
	Environment string
	LogLevel    string
	Debug       bool
}

// ClaudeConfig Claude API配置
type ClaudeConfig struct {
	APIKey  string
	BaseURL string
	Model   string
	Timeout time.Duration
}

var GlobalConfig *Config

// LoadConfig 加载配置
func LoadConfig() error {
	// 尝试加载环境变量文件，优先级：.env > ../.env.prod > 系统环境变量
	envFiles := []string{".env", "../.env.prod", "/app/.env.prod"}
	loaded := false

	for _, file := range envFiles {
		if err := godotenv.Load(file); err == nil {
			fmt.Printf("已加载配置文件: %s\n", file)
			loaded = true
			break
		}
	}

	if !loaded {
		fmt.Println("未找到配置文件，使用系统环境变量")
	}

	config := &Config{
		Server: ServerConfig{
			Port:    getEnv("PORT", "3001"),
			Mode:    getEnv("GIN_MODE", "debug"),
			Host:    getEnv("SERVER_HOST", "0.0.0.0"),
			Timeout: getDurationEnv("SERVER_TIMEOUT", "30s"),
		},
		Database: DatabaseConfig{
			Host:         getEnv("DB_HOST", "localhost"),
			Port:         getEnv("DB_PORT", "3306"),
			User:         getEnv("DB_USER", "root"),
			Password:     getEnv("DB_PASSWORD", "1234"),
			Name:         getEnv("DB_NAME", "blog_db"),
			SSLMode:      getEnv("DB_SSLMODE", "disable"),
			TimeZone:     getEnv("DB_TIMEZONE", "Asia/Shanghai"),
			MaxOpenConns: getIntEnv("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns: getIntEnv("DB_MAX_IDLE_CONNS", 5),
			MaxLifetime:  getDurationEnv("DB_MAX_LIFETIME", "300s"),
		},
		JWT: JWTConfig{
			Secret:    getEnv("JWT_SECRET", "sunmengyu"),
			ExpiresIn: getDurationEnv("JWT_EXPIRES_IN", "24h"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getIntEnv("REDIS_DB", 0),
		},
		Upload: UploadConfig{
			Path:        getEnv("UPLOAD_PATH", "./uploads"),
			MaxFileSize: getInt64Env("MAX_FILE_SIZE", 10*1024*1024), // 10MB
			AllowedExts: []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"},
		},
		Search: SearchConfig{
			IndexPath:   getEnv("SEARCH_INDEX_PATH", "./search_index"),
			EnableCache: getBoolEnv("ENABLE_SEARCH_CACHE", true),
			CacheTTL:    getDurationEnv("SEARCH_CACHE_TTL", "10m"),
			BatchSize:   getIntEnv("SEARCH_BATCH_SIZE", 100),
		},
		CORS: CORSConfig{
			AllowedOrigins: getSliceEnv("ALLOWED_ORIGINS", []string{
				"http://localhost:3001",
				"http://localhost:5173",
				"http://localhost:5174",
				"http://localhost:5175",
				"http://www.godepth.top",
			}),
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
			AllowedHeaders: []string{"Origin", "Content-Type", "Authorization"},
		},
		App: AppConfig{
			Name:        getEnv("APP_NAME", "Blog Backend"),
			Version:     getEnv("APP_VERSION", "1.0.0"),
			Environment: getEnv("ENVIRONMENT", "development"),
			LogLevel:    getEnv("LOG_LEVEL", "info"),
			Debug:       getBoolEnv("DEBUG", false),
		},
		Claude: ClaudeConfig{
			APIKey:  getEnv("CLAUDE_API_KEY", ""),
			BaseURL: getEnv("CLAUDE_BASE_URL", "https://api.anthropic.com"),
			Model:   getEnv("CLAUDE_MODEL", "claude-3-haiku-20240307"),
			Timeout: getDurationEnv("CLAUDE_TIMEOUT", "30s"),
		},
	}

	// 验证必要配置
	if err := config.validate(); err != nil {
		return fmt.Errorf("配置验证失败: %v", err)
	}

	GlobalConfig = config
	return nil
}

// validate 验证配置
func (c *Config) validate() error {
	if c.Database.Host == "" {
		return fmt.Errorf("数据库主机不能为空")
	}
	if c.Database.User == "" {
		return fmt.Errorf("数据库用户不能为空")
	}
	if c.Database.Name == "" {
		return fmt.Errorf("数据库名称不能为空")
	}
	if c.JWT.Secret == "" || c.JWT.Secret == "default-secret-key-change-in-production" {
		if c.App.Environment == "production" {
			return fmt.Errorf("生产环境必须设置JWT密钥")
		}
	}
	if c.Upload.Path == "" {
		return fmt.Errorf("上传路径不能为空")
	}
	return nil
}

// GetDSN 获取数据库连接字符串
func (c *Config) GetDSN() string {
	// 对可能包含特殊字符的参数进行URL编码
	escapedPassword := url.QueryEscape(c.Database.Password)
	escapedTimeZone := url.QueryEscape(c.Database.TimeZone)

	// MySQL DSN格式: username:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=%s",
		c.Database.User,
		escapedPassword,
		c.Database.Host,
		c.Database.Port,
		c.Database.Name,
		escapedTimeZone,
	)
}

// IsDevelopment 是否为开发环境
func (c *Config) IsDevelopment() bool {
	return c.App.Environment == "development"
}

// IsProduction 是否为生产环境
func (c *Config) IsProduction() bool {
	return c.App.Environment == "production"
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getInt64Env(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if int64Value, err := strconv.ParseInt(value, 10, 64); err == nil {
			return int64Value
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getDurationEnv(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	if duration, err := time.ParseDuration(defaultValue); err == nil {
		return duration
	}
	return time.Hour
}

func getSliceEnv(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// 简单的逗号分割
		result := make([]string, 0)
		for _, item := range splitString(value, ",") {
			if trimmed := trimString(item); trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}

// 简单的字符串处理函数
func splitString(s, sep string) []string {
	if s == "" {
		return []string{}
	}
	// 简单实现，不使用strings包
	result := make([]string, 0)
	current := ""
	for _, char := range s {
		if string(char) == sep {
			result = append(result, current)
			current = ""
		} else {
			current += string(char)
		}
	}
	result = append(result, current)
	return result
}

func trimString(s string) string {
	// 简单的trim实现
	if s == "" {
		return s
	}
	start := 0
	end := len(s) - 1

	// 去除前面的空格
	for start <= end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	// 去除后面的空格
	for end >= start && (s[end] == ' ' || s[end] == '\t' || s[end] == '\n' || s[end] == '\r') {
		end--
	}

	if start > end {
		return ""
	}

	return s[start : end+1]
}
