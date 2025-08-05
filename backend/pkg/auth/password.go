package auth

import (
	"errors"
	
	"golang.org/x/crypto/bcrypt"
)

// HashPassword 对密码进行哈希加密
func HashPassword(password string) (string, error) {
	// 使用bcrypt加密密码，cost为12
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

// CheckPassword 验证密码是否正确
func CheckPassword(password, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// ValidatePasswordStrength 验证密码强度
func ValidatePasswordStrength(password string) error {
	if len(password) < 6 {
		return errors.New("密码长度至少为6位")
	}
	
	if len(password) > 72 {
		return errors.New("密码长度不能超过72位")
	}
	
	// 可以添加更多密码强度验证规则
	// 比如必须包含数字、大小写字母、特殊字符等
	
	return nil
}