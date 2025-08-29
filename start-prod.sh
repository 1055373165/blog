#!/bin/bash

# 快速启动生产环境服务

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}启动博客生产环境...${NC}"

# 检查环境
if [[ ! -f "docker-compose.prod.yml" ]]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

if [[ ! -f ".env.prod" ]]; then
    echo -e "${RED}错误: .env.prod 文件不存在，请先配置环境变量${NC}"
    exit 1
fi

# 检查环境变量是否已修改
if grep -q "your_strong_postgres_password_here" .env.prod; then
    echo -e "${YELLOW}警告: 请修改 .env.prod 中的默认密码${NC}"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 创建必要目录
mkdir -p data/{uploads,search_index}
mkdir -p logs/{nginx,app}
mkdir -p docker/nginx/{conf.d,ssl}

echo -e "${GREEN}正在启动服务...${NC}"

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo -e "${GREEN}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo -e "${GREEN}检查服务状态:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}"
echo "================================================"
echo "           生产环境启动完成！"
echo "================================================"
echo -e "${NC}"

echo "常用命令:"
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo ""

if [[ -f "docker/nginx/ssl/fullchain.pem" ]]; then
    echo "网站地址: http://www.godepth.top"
else
    echo -e "${YELLOW}注意: 请先配置SSL证书，然后访问 http://www.godepth.top${NC}"
fi