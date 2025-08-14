#!/bin/bash

echo "🛑 停止博客系统服务器环境..."

# 停止后端服务
if [ -f "logs/app/backend.pid" ]; then
    BACKEND_PID=$(cat logs/app/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "🔧 停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm logs/app/backend.pid
        echo "✅ 后端服务已停止"
    else
        echo "⚠️  后端服务进程不存在"
        rm logs/app/backend.pid 2>/dev/null
    fi
else
    echo "⚠️  未找到后端服务PID文件"
fi

# 停止前端服务
if [ -f "logs/app/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/app/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "🌐 停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm logs/app/frontend.pid
        echo "✅ 前端服务已停止"
    else
        echo "⚠️  前端服务进程不存在"
        rm logs/app/frontend.pid 2>/dev/null
    fi
else
    echo "⚠️  未找到前端服务PID文件"
fi

# 停止Redis容器
echo "🗄️  停止Redis服务..."
docker stop blog_redis_server 2>/dev/null || echo "⚠️  Redis容器未运行"

echo ""
echo "✅ 所有服务已停止"
