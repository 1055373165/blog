#!/bin/bash

# 简化版部署脚本 - 不需要 sudo 权限
# 需要管理员预先安装 Docker 和配置基础环境
# 
# 使用方法:
#   ./deploy-simple.sh          # 快速部署（只重建前端，后端使用缓存）
#   ./deploy-simple.sh --force  # 强制重建所有镜像
#   ./deploy-simple.sh -f       # 强制重建所有镜像（简写）

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOMAIN="www.godepth.top"
PROJECT_DIR="$PWD"
LOG_FILE="$HOME/blog-deploy.log"

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# 检查 Docker
check_docker() {
    log "检查 Docker..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装，请先安装 Docker"
    fi
    
    if ! docker ps &> /dev/null; then
        error "无法访问 Docker，请检查权限或联系管理员"
    fi
    
    # 检查 Docker Compose 版本
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log "检测到 Docker Compose V2 版本: $COMPOSE_VERSION"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        warn "检测到旧版 Docker Compose: $COMPOSE_VERSION"
        warn "建议使用 'docker compose' 命令"
    else
        error "未找到 Docker Compose，请先安装"
    fi
    
    log "Docker 检查通过"
}

# 检查环境文件
check_env() {
    log "检查环境配置..."
    
    if [[ ! -f ".env.prod" ]]; then
        error ".env.prod 文件不存在，请先创建"
    fi
    
    if grep -q "your_mysql_password_here" .env.prod; then
        warn "请修改 .env.prod 中的默认密码"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "环境配置检查完成"
}

# 创建必要目录
create_directories() {
    log "创建项目目录..."
    
    mkdir -p data/{uploads,search_index}
    mkdir -p logs/{nginx,app}
    mkdir -p docker/nginx/{conf.d,ssl}
    
    log "目录创建完成"
}

# 生成自签名证书（仅用于测试）
generate_test_ssl() {
    log "生成测试 SSL 证书..."
    
    if [[ ! -f "docker/nginx/ssl/fullchain.pem" ]]; then
        mkdir -p docker/nginx/ssl
        
        # 生成自签名证书
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/nginx/ssl/privkey.pem \
            -out docker/nginx/ssl/fullchain.pem \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=Blog/CN=$DOMAIN"
        
        # 生成 DH 参数
        openssl dhparam -out docker/nginx/ssl/dhparam.pem 2048
        
        warn "使用自签名证书，浏览器会显示安全警告"
        warn "生产环境请使用真实的 SSL 证书"
    fi
    
    log "SSL 证书准备完成"
}

# 停止现有服务和清理端口
cleanup_existing() {
    log "清理现有服务..."
    
    # 停止可能占用端口的服务
    sudo systemctl stop apache2 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true
    
    # 停止现有 Docker 容器
    if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "停止现有容器..."
        docker compose -f docker-compose.prod.yml down
    fi
    
    # 清理临时容器
    docker stop temp-nginx 2>/dev/null || true
    docker rm temp-nginx 2>/dev/null || true
    
    # 检查端口占用
    if netstat -tlnp 2>/dev/null | grep -q ":80\|:443"; then
        warn "检测到端口 80/443 仍被占用"
        netstat -tlnp 2>/dev/null | grep ":80\|:443" || true
    fi
    
    log "清理完成"
}

# 部署应用
deploy_app() {
    log "部署应用..."
    
    # 检查是否需要强制重建
    FORCE_REBUILD=${1:-false}
    
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        log "强制重建所有镜像..."
        docker compose -f docker-compose.prod.yml build --no-cache
    else
        # 只重建前端（因为前端变更频繁），后端使用缓存
        log "重建前端镜像（后端使用缓存以节省时间）..."
        docker compose -f docker-compose.prod.yml build --no-cache frontend
        
        # 后端使用缓存构建（如果镜像不存在才构建）
        if ! docker images | grep -q "blog.*backend"; then
            log "后端镜像不存在，首次构建..."
            docker compose -f docker-compose.prod.yml build backend
        else
            log "后端镜像已存在，跳过构建以节省时间"
        fi
    fi
    
    log "启动服务..."
    docker compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if ! docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "服务启动失败，请检查日志: docker compose -f docker-compose.prod.yml logs"
    fi
    
    log "应用部署完成"
}

# 验证部署
verify_deployment() {
    log "验证部署..."
    
    # 检查容器状态
    log "容器状态:"
    docker compose -f docker-compose.prod.yml ps
    
    # 检查端口
    log "端口检查:"
    netstat -tlnp 2>/dev/null | grep ":80\|:443" || true
    
    # 简单的健康检查
    sleep 10
    if curl -f -s -k --connect-timeout 10 https://localhost/ > /dev/null 2>&1; then
        log "HTTPS 服务响应正常"
    else
        warn "HTTPS 服务可能还未完全启动"
    fi
    
    if curl -f -s --connect-timeout 10 http://localhost/ > /dev/null 2>&1; then
        log "HTTP 服务响应正常"
    else
        warn "HTTP 服务可能还未完全启动"
    fi
    
    log "部署验证完成"
}

# 显示部署信息
show_info() {
    log "部署完成！"
    echo -e "${GREEN}"
    echo "================================================"
    echo "           Blog系统部署完成！"
    echo "================================================"
    echo -e "${NC}"
    echo "项目目录: $PROJECT_DIR"
    echo "日志文件: $LOG_FILE"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo "HTTP:  http://$DOMAIN"
    echo "HTTP:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "HTTPS: https://$DOMAIN (自签名证书，会有安全警告)"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "查看状态: docker compose -f docker-compose.prod.yml ps"
    echo "查看日志: docker compose -f docker-compose.prod.yml logs -f"
    echo "重启服务: docker compose -f docker-compose.prod.yml restart"
    echo "停止服务: docker compose -f docker-compose.prod.yml down"
    echo ""
    echo -e "${YELLOW}服务端口:${NC}"
    echo "HTTP:  80"
    echo "HTTPS: 443"
    echo ""
    echo -e "${RED}注意事项:${NC}"
    echo "1. 当前使用自签名证书，浏览器会显示安全警告（点击高级->继续访问）"
    echo "2. 管理后台: https://$DOMAIN/admin"
    echo "3. API 健康检查: https://$DOMAIN/api/health"
    echo "4. 生产环境需要配置真实的 SSL 证书"
    echo "5. 定期备份数据库和上传文件"
}

# 主函数
main() {
    # 检查命令行参数
    FORCE_REBUILD=false
    if [[ "$1" == "--force" ]] || [[ "$1" == "-f" ]]; then
        FORCE_REBUILD=true
        log "启用强制重建模式"
    fi
    
    log "开始简化版博客系统部署..."
    
    check_docker
    check_env
    create_directories
    cleanup_existing
    generate_test_ssl
    deploy_app $FORCE_REBUILD
    verify_deployment
    show_info
    
    log "部署流程完成！"
}

# 运行主函数
main "$@"