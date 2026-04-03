#!/bin/bash
set -e

# 设置工作目录为脚本所在的目录
cd "$(dirname "$0")"

echo "======================================"
echo "    Blog 项目一键部署脚本 (生产环境)    "
echo "======================================"

# 1. 检查 Docker 及 Docker Compose 环境
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker，请先安装 Docker!"
    exit 1
fi

DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif docker-compose --version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ 错误: 未安装 Docker Compose，请先安装即可！"
    exit 1
fi

echo "✅ Docker 环境检查通过"

# 2. 检查/初始化环境变量文件
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ 未找到 $ENV_FILE 配置文件，正在为你自动生成..."
    
    # 生成安全的随机密码
    DB_PASSWORD=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
    REDIS_PASSWORD=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
    JWT_SECRET=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
    
    cat > "$ENV_FILE" << EOF
# ==========================================
# 自动生成的生产环境变量配置 (.env)
# ==========================================

# 数据库配置项
DB_USER=root
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=blog_db

# Redis 配置项
REDIS_PASSWORD=${REDIS_PASSWORD}

# 安全认证配置
JWT_SECRET=${JWT_SECRET}

# 🌐 域名/API 配置 (至关重要：前端构建时会使用它作为请求的 BaseURL)
VITE_API_BASE_URL=https://www.godepth.top
EOF
    echo "✅ 已生成默认环境配置文件 -> $ENV_FILE"
    echo "🔴 阻断提示：因为是初次生成配置文件，请先使用文本编辑器（如vim .env）检查并修改里面配置项（特别是 VITE_API_BASE_URL 是否正确指代你的域名）。"
    echo "👉 确认配置修改无误后，再次运行此脚本 ($0) 即可开始部署！"
    exit 0
fi
echo "✅ 环境变量配置文件 (.env) 检查通过"

# 3. 创建持久化数据映射目录并设置权限
echo "⏳ 正在初始化数据挂载目录..."
mkdir -p data/uploads
mkdir -p data/search_index
mkdir -p frontend/public/books

# 因为后端 Dockerfile.prod 切换到了 appuser (1001:1001) 非root用户运行，
# 前端 Nginx 也可能使用不同的用户，需给数据挂载目录赋予相应的读写权限
chmod -R 777 data/uploads
chmod -R 777 data/search_index
chmod -R 777 frontend/public/books
echo "✅ 数据挂载目录初始化并赋权完成"

# 4. 停止旧的容器实例
echo "⏳ 正在清理旧版本容器缓存..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down

# 5. 重新构建并以 Daemon 模式启动
echo "⏳ 开始构建并启动容器 (前端需要 npm build、后端编译 Go 需要时间，请耐心等待)..."
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build

# 6. 验证部署结果
if [ $? -eq 0 ]; then
    echo "======================================"
    echo "🚀 部署成功! 项目的容器均已经在后台运行。 "
    echo "======================================"
    echo "👉 后端服务端口: 3001"
    echo "👉 前端服务端口: 8080"
    echo ""
    echo "常用运维命令："
    echo "📋 查看所有服务运行状态："
    echo "   $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml ps"
    echo "📖 查看实时运行监控日志："
    echo "   $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
    echo "🛑 停止项目服务："
    echo "   $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down"
else
    echo "❌ 部署过程中出现错误，请向上翻阅构建日志以便排查问题！"
fi
