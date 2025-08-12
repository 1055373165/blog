#!/bin/bash

# 修复部署过程中的权限问题

set -e

echo "修复部署权限问题..."

# 创建日志文件
touch $HOME/blog-deploy.log
touch $HOME/blog-update.log

# 创建项目目录（如果不存在）
sudo mkdir -p /opt/blog
sudo mkdir -p /opt/backups

# 设置项目目录权限
sudo chown -R $USER:$USER /opt/blog
sudo chown -R $USER:$USER /opt/backups

# 确保当前用户可以使用 Docker
sudo usermod -aG docker $USER

# 如果项目文件在当前目录，复制到 /opt/blog
if [[ -f "docker-compose.prod.yml" && "$PWD" != "/opt/blog" ]]; then
    echo "复制项目文件到 /opt/blog..."
    sudo cp -r . /opt/blog/
    sudo chown -R $USER:$USER /opt/blog
fi

echo "权限修复完成！"
echo ""
echo "下一步："
echo "1. 重新登录或运行: newgrp docker"
echo "2. 进入项目目录: cd /opt/blog"
echo "3. 运行部署脚本: ./deploy.sh"