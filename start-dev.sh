#!/bin/bash

echo "🚀 启动博客系统开发环境..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 清理正在运行的服务与容器
echo "🧹 清理端口占用与容器..."

kill_by_port() {
  local port="$1"
  # 查找监听该端口的进程
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "  终止占用端口 $port 的进程: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    # 若仍存在则强杀
    pids=$(lsof -ti tcp:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
      echo "  发送 SIGKILL 给残留进程: $pids"
      kill -9 $pids 2>/dev/null || true
    fi
  else
    echo "  端口 $port 空闲"
  fi
}

kill_by_port 3001  # 后端
kill_by_port 5173  # 前端

# 关闭并清理容器（包含孤儿）
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose rm -f 2>/dev/null || true

# 检查MySQL是否运行
echo "🔍 检查MySQL服务..."
if ! nc -z localhost 3306 2>/dev/null; then
    echo "❌ MySQL未运行在localhost:3306"
    echo "请先启动MySQL服务:"
    echo "  macOS: brew services start mysql"
    echo "  Ubuntu: sudo systemctl start mysql"
    echo "  或使用MySQL安装程序启动服务"
    exit 1
fi
echo "✅ MySQL服务正常运行"

# 检查是否存在.env文件
if [ ! -f ".env" ]; then
    echo "📝 创建.env文件..."
    echo "请配置.env文件中的数据库连接信息"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "📝 复制前端环境配置文件..."
    echo "VITE_API_BASE_URL=http://localhost:3001" > frontend/.env
fi

# 启动Redis（可选）
echo "🗄️  启动Redis服务..."
docker-compose up -d redis

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
make deps
make dev &
BACKEND_PID=$!
cd ..

# 启动前端服务
echo "🎨 启动前端服务..."
cd frontend
yarn install
yarn dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 开发环境启动完成！"
echo ""
echo "📍 服务地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3001"
echo "   数据库: localhost:3306"
echo "   Redis: localhost:6379"
echo ""
echo "📖 常用命令:"
echo "   停止服务: Ctrl+C"
echo "   查看日志: docker-compose logs -f"
echo "   重启数据库: docker-compose restart mysql"
echo ""
echo "⚡ 按 Ctrl+C 停止所有服务"

# 捕获中断信号
trap 'echo "🛑 停止服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down --remove-orphans; exit 0' INT

# 等待进程结束
wait