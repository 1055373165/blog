.PHONY: help build run dev test clean deps

# 默认目标
help:
	@echo "可用的命令:"
	@echo "  build   - 构建应用程序"
	@echo "  run     - 运行应用程序"
	@echo "  dev     - 开发模式运行（自动重启）"
	@echo "  test    - 运行测试"
	@echo "  clean   - 清理构建文件"
	@echo "  deps    - 安装依赖"
	@echo "  migrate - 运行数据库迁移"

# 构建应用程序
build:
	@echo "构建应用程序..."
	@go build -o bin/blog-server cmd/main.go

# 运行应用程序
run: build
	@echo "启动服务器..."
	@./bin/blog-server

# 开发模式运行
dev:
	@echo "开发模式启动..."
	@go run cmd/main.go

# 运行测试
test:
	@echo "运行测试..."
	@go test -v ./...

# 清理构建文件
clean:
	@echo "清理构建文件..."
	@rm -rf bin/
	@rm -rf uploads/
	@rm -rf search_index/

# 安装依赖
deps:
	@echo "安装依赖..."
	@go mod tidy
	@go mod download

# 数据库相关
migrate:
	@echo "运行数据库迁移..."
	@go run cmd/main.go --migrate

# 格式化代码
fmt:
	@echo "格式化代码..."
	@go fmt ./...

# 代码检查
lint:
	@echo "代码检查..."
	@golangci-lint run

# 生成文档
docs:
	@echo "生成API文档..."
	@swag init -g cmd/main.go

# Docker相关
docker-build:
	@echo "构建Docker镜像..."
	@docker build -t blog-backend .

docker-run:
	@echo "运行Docker容器..."
	@docker run -p 3001:3001 --env-file .env blog-backend

# 环境配置
env:
	@echo "复制环境配置文件..."
	@cp .env.example .env
	@echo "请编辑 .env 文件配置数据库连接信息"