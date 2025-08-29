#!/bin/bash

echo "🚀 启动博客系统服务器环境..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 检查MySQL是否运行
echo "🔍 检查MySQL服务..."
if ! nc -z localhost 3306 2>/dev/null; then
    echo "❌ MySQL未运行在localhost:3306"
    echo "请先启动MySQL服务:"
    echo "  Ubuntu: sudo systemctl start mysql"
    exit 1
fi
echo "✅ MySQL服务正常运行"

# 检查是否存在生产环境配置文件
if [ ! -f ".env.prod" ]; then
    echo "❌ 未找到.env.prod文件"
    echo "请先创建.env.prod文件并配置生产环境变量"
    exit 1
fi

# 加载生产环境变量
set -a
source .env.prod
set +a

echo "✅ 生产环境配置已加载"

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p data/{uploads,search_index}
mkdir -p logs/{app,nginx}

# 启动Redis
echo "🗄️  启动Redis服务..."
docker run -d --name blog_redis_server \
    --restart unless-stopped \
    -p 6379:6379 \
    -v $(pwd)/data/redis:/data \
    redis:7-alpine \
    redis-server --appendonly yes --requirepass "${REDIS_PASSWORD:-}" 2>/dev/null || \
    docker start blog_redis_server

echo "✅ Redis服务启动完成"

# 构建前端
echo "🎨 构建前端应用..."
cd frontend

# 创建前端生产环境变量
cat > .env.production <<EOF
VITE_API_BASE_URL=https://www.godepth.top${VITE_API_BASE_URL:-https://www.godepth.top}
EOF

# 安装依赖并构建
yarn install --frozen-lockfile
yarn build

echo "✅ 前端构建完成"
cd ..

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend

# 安装Go依赖
make deps

# 后台启动后端服务
nohup make prod > ../logs/app/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/app/backend.pid

echo "✅ 后端服务启动完成 (PID: $BACKEND_PID)"
cd ..

# 启动前端服务器 (使用serve或nginx)
echo "🌐 启动前端服务器..."

# 检查是否安装了serve
if command -v serve >/dev/null 2>&1; then
    # 使用serve启动前端
    nohup serve -s frontend/dist -l 3000 > logs/app/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > logs/app/frontend.pid
    echo "✅ 前端服务启动完成 (PID: $FRONTEND_PID) - 使用serve"
elif command -v nginx >/dev/null 2>&1; then
    # 使用nginx启动前端
    echo "使用nginx服务前端文件..."
    sudo cp frontend/dist/* /var/www/html/ -r 2>/dev/null || true
    sudo systemctl start nginx
    echo "✅ 前端服务启动完成 - 使用nginx"
else
    # 使用Python简单服务器
    cd frontend/dist
    nohup python3 -m http.server 3000 > ../../logs/app/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../../logs/app/frontend.pid
    echo "✅ 前端服务启动完成 (PID: $FRONTEND_PID) - 使用Python服务器"
    cd ../..
fi

echo ""
echo "🎉 服务器环境启动完成！"
echo ""
echo "📍 服务地址:"
echo "   前端: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3000"
echo "   后端: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3001"
echo "   域名: https://www.godepth.top (如已配置DNS)"
echo ""
echo "📊 服务状态:"
echo "   后端PID: $(cat logs/app/backend.pid 2>/dev/null || echo '未知')"
echo "   前端PID: $(cat logs/app/frontend.pid 2>/dev/null || echo '未知')"
echo ""
echo "📖 管理命令:"
echo "   查看后端日志: tail -f logs/app/backend.log"
echo "   查看前端日志: tail -f logs/app/frontend.log"
echo "   停止服务: ./stop-server.sh"
echo "   重启服务: ./restart-server.sh"
echo ""
echo "🔥 服务已在后台运行，可以安全退出终端"
