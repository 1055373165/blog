package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequestSizeLimit 设置请求体大小限制
func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 设置请求体大小限制
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	})
}

// LargeRequestHandler 处理大型请求的中间件
func LargeRequestHandler() gin.HandlerFunc {
	return RequestSizeLimit(10 * 1024 * 1024) // 10MB限制
}