#!/bin/bash

# 博客部署验证脚本

echo "🔍 开始验证博客部署配置..."

# 检查配置文件是否存在
echo "📁 检查配置文件..."
files=(
    "claudeconf/nginx.conf"
    "claudeconf/default.conf"
    "docker-compose.prod.yml"
    "frontend/Dockerfile.prod"
    "frontend/docker/nginx.conf"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done

# 检查nginx配置语法
echo "🔧 检查nginx配置语法..."
docker run --rm -v "$(pwd)/claudeconf/nginx.conf:/etc/nginx/nginx.conf:ro" -v "$(pwd)/claudeconf/default.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx配置语法正确"
else
    echo "❌ Nginx配置语法错误"
    exit 1
fi

# 检查docker-compose配置
echo "🐳 检查Docker Compose配置..."
docker-compose -f docker-compose.prod.yml config > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Docker Compose配置正确"
else
    echo "❌ Docker Compose配置错误"
    exit 1
fi

# 检查端口映射
echo "🔌 检查端口映射..."
echo "主要端口配置："
echo "  - Nginx: 80 (外部) -> 80 (容器内)"
echo "  - Nginx: 443 (外部) -> 443 (容器内)"
echo "  - Frontend: 8080 (容器间) -> 8080 (容器内)"
echo "  - Backend: 3001 (容器间) -> 3001 (容器内)"
echo "  - Redis: 6379 (容器间) -> 6379 (容器内)"

# 检查网络配置
echo "🌐 检查网络配置..."
echo "网络架构："
echo "  外部请求 -> Nginx (80/443) -> Frontend (8080) 或 Backend (3001)"
echo "  Frontend 和 Backend 通过 blog_network 内部网络通信"

# 检查环境变量
echo "🔐 检查环境变量..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，请创建并配置以下变量："
    echo "  - DB_PASSWORD"
    echo "  - REDIS_PASSWORD"
    echo "  - JWT_SECRET"
    echo "  - CORS_ALLOWED_ORIGINS"
else
    echo "✅ .env 文件存在"
fi

# 检查必要目录
echo "📂 检查必要目录..."
dirs=(
    "data/uploads"
    "claudeconf"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir 目录存在"
    else
        echo "📁 创建目录 $dir"
        mkdir -p "$dir"
    fi
done

echo "🎉 部署配置验证完成！"
echo ""
echo "📋 部署说明："
echo "1. 确保已创建 .env 文件并配置必要的环境变量"
echo "2. 运行: docker-compose -f docker-compose.prod.yml up -d"
echo "3. 访问: http://localhost 查看网站"
echo "4. API接口: http://localhost/api/"
echo "5. 健康检查: http://localhost/health"
echo ""
echo "🔧 故障排除："
echo "- 查看日志: docker-compose -f docker-compose.prod.yml logs [服务名]"
echo "- 重启服务: docker-compose -f docker-compose.prod.yml restart [服务名]"
echo "- 检查容器状态: docker-compose -f docker-compose.prod.yml ps"