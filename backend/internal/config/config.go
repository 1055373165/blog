package config

import (
	"fmt"
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

var GlobalConfig *Config

// LoadConfig 加载配置
func LoadConfig() error {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		fmt.Println("警告: 未找到 .env 文件，使用系统环境变量")
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
			Port:         getEnv("DB_PORT", "5432"),
			User:         getEnv("DB_USER", "postgres"),
			Password:     getEnv("DB_PASSWORD", ""),
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
				"http://localhost:3000",
				"http://localhost:5173",
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
	return fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.Database.Host,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.Port,
		c.Database.SSLMode,
		c.Database.TimeZone,
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
