.PHONY: help build run dev test clean deps

# 默认目标
help:
	@echo "可用的命令:"
	@echo "  build   - 构建应用程序"
	@echo "  run     - 运行应用程序"
	@echo "  dev     - 开发模式运行（自动重启）"
	@echo "  test    - 运行测试"
	@echo "  clean   - 清理构建文件"
	@echo "  deps      - 安装依赖"
	@echo "  db-create - 创建数据库"
	@echo "  db-migrate- 运行数据库迁移"
	@echo "  db-seed   - 插入种子数据"
	@echo "  db-reset  - 重置数据库（删除并重建）"
	@echo "  db-status - 检查数据库状态"

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
db-create:
	@echo "创建数据库..."
	@createdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)

db-drop:
	@echo "删除数据库..."
	@dropdb -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) $(DB_NAME)

db-migrate:
	@echo "运行数据库迁移..."
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -f migrations/001_create_tables.sql

db-seed:
	@echo "插入种子数据..."
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -f scripts/seed.sql

db-reset: db-drop db-create db-migrate db-seed
	@echo "数据库重置完成"

db-status:
	@echo "数据库状态检查..."
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -c "SELECT COUNT(*) as user_count FROM users; SELECT COUNT(*) as article_count FROM articles;"

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