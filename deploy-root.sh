#!/bin/bash

# Root 权限部署脚本 - 支持 root 用户直接部署
# 适用于快速部署和测试环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOMAIN="www.godepth.top"
PROJECT_DIR="/opt/blog"
LOG_FILE="/var/log/blog-deploy.log"
BACKUP_DIR="/opt/backups"

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

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# 检查系统
check_system() {
    log "检查系统环境..."
    
    # 创建日志文件
    touch $LOG_FILE
    chmod 644 $LOG_FILE
    
    # 检查操作系统
    if command -v lsb_release &> /dev/null; then
        OS_VERSION=$(lsb_release -rs)
        log "检测到系统版本: Ubuntu $OS_VERSION"
    fi
    
    log "系统检查完成"
}

# 安装 Docker
install_docker() {
    log "检查 Docker 安装状态..."
    
    if command -v docker &> /dev/null; then
        log "Docker 已安装: $(docker --version)"
        systemctl enable docker
        systemctl start docker
        return
    fi
    
    log "安装 Docker..."
    
    # 更新包索引
    apt-get update
    
    # 安装必要的包
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加 Docker 官方 GPG 密钥
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 添加 Docker 仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动 Docker 服务
    systemctl enable docker
    systemctl start docker
    
    log "Docker 安装完成"
}

# 安装依赖
install_dependencies() {
    log "安装系统依赖..."
    
    apt-get update
    apt-get install -y \
        git \
        curl \
        wget \
        unzip \
        openssl \
        net-tools \
        ufw \
        fail2ban \
        logrotate \
        cron
    
    log "依赖安装完成"
}

# 配置防火墙
setup_firewall() {
    log "配置防火墙..."
    
    # 重置 UFW 规则
    ufw --force reset
    
    # 基本规则
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许 SSH (22端口)
    ufw allow 22/tcp
    
    # 允许 HTTP 和 HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 启用防火墙
    ufw --force enable
    
    log "防火墙配置完成"
}

# 创建项目目录
create_directories() {
    log "创建项目目录..."
    
    # 如果当前目录不是 /opt/blog，则复制项目文件
    if [[ "$PWD" != "$PROJECT_DIR" ]]; then
        log "复制项目文件到 $PROJECT_DIR..."
        mkdir -p $PROJECT_DIR
        cp -r . $PROJECT_DIR/
        cd $PROJECT_DIR
    fi
    
    mkdir -p $BACKUP_DIR
    mkdir -p data/{uploads,search_index}
    mkdir -p logs/{nginx,app}
    mkdir -p docker/nginx/{conf.d,ssl}
    
    # 设置权限
    chmod -R 755 $PROJECT_DIR
    chmod -R 755 $BACKUP_DIR
    
    log "目录创建完成"
}

# 检查环境配置
check_env() {
    log "检查环境配置..."
    
    if [[ ! -f ".env.prod" ]]; then
        warn ".env.prod 文件不存在，创建默认配置..."
        cat > .env.prod << 'EOF'
# 数据库配置
POSTGRES_PASSWORD=blog_password_$(date +%s)
REDIS_PASSWORD=redis_password_$(date +%s)

# JWT密钥
JWT_SECRET=jwt_secret_key_$(date +%s)_$(openssl rand -hex 16)

# 域名配置
DOMAIN=www.godepth.top
API_BASE_URL=https://www.godepth.top

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@godepth.top
SMTP_PASS=

# 文件存储配置
UPLOAD_PATH=/app/uploads
MAX_UPLOAD_SIZE=20M

# 日志级别
LOG_LEVEL=info
EOF
        log "已创建默认 .env.prod 配置"
    fi
    
    if grep -q "your_strong_postgres_password_here" .env.prod; then
        warn "检测到默认密码，建议修改 .env.prod 中的密码"
    fi
    
    log "环境配置检查完成"
}

# 生成自签名证书
generate_ssl() {
    log "生成 SSL 证书..."
    
    if [[ ! -f "docker/nginx/ssl/fullchain.pem" ]]; then
        mkdir -p docker/nginx/ssl
        
        log "生成自签名证书..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/nginx/ssl/privkey.pem \
            -out docker/nginx/ssl/fullchain.pem \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=Blog/CN=$DOMAIN"
        
        log "生成 DH 参数..."
        openssl dhparam -out docker/nginx/ssl/dhparam.pem 2048
        
        chmod 644 docker/nginx/ssl/fullchain.pem
        chmod 600 docker/nginx/ssl/privkey.pem
        chmod 644 docker/nginx/ssl/dhparam.pem
        
        warn "使用自签名证书，浏览器会显示安全警告"
    else
        log "SSL 证书已存在"
    fi
    
    log "SSL 证书配置完成"
}

# 停止冲突服务
stop_conflicting_services() {
    log "停止可能冲突的服务..."
    
    # 停止可能占用端口的服务
    systemctl stop apache2 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    
    # 停止现有 Docker 容器
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    fi
    
    # 清理临时容器
    docker stop temp-nginx 2>/dev/null || true
    docker rm temp-nginx 2>/dev/null || true
    
    log "冲突服务已停止"
}

# 部署应用
deploy_app() {
    log "部署应用..."
    
    # 清理 Docker 资源
    log "清理 Docker 资源..."
    docker system prune -f --volumes || true
    
    # 构建并启动服务
    log "构建镜像..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    log "启动服务..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "服务启动失败，请检查日志: docker-compose -f docker-compose.prod.yml logs"
    fi
    
    log "应用部署完成"
}

# 配置自动备份
setup_backup() {
    log "配置自动备份..."
    
    cat > /opt/backup-blog.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/blog"

mkdir -p $BACKUP_DIR/db $BACKUP_DIR/uploads $BACKUP_DIR/config

# 备份数据库
docker exec blog_postgres_prod pg_dump -U blog_user -d blog_db | gzip > $BACKUP_DIR/db/blog_db_$DATE.sql.gz

# 备份上传文件
tar -czf $BACKUP_DIR/uploads/uploads_$DATE.tar.gz -C $PROJECT_DIR/data uploads/

# 备份配置文件
cp $PROJECT_DIR/.env.prod $PROJECT_DIR/docker-compose.prod.yml $BACKUP_DIR/config/

# 删除7天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "备份完成: $DATE"
EOF
    
    chmod +x /opt/backup-blog.sh
    
    # 添加到定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-blog.sh >> /var/log/backup.log 2>&1") | crontab -
    
    log "自动备份配置完成"
}

# 验证部署
verify_deployment() {
    log "验证部署..."
    
    # 检查容器状态
    log "容器状态:"
    docker-compose -f docker-compose.prod.yml ps
    
    # 检查端口
    log "端口检查:"
    netstat -tlnp | grep ":80\|:443" || true
    
    # 健康检查
    sleep 10
    if curl -f -s -k --connect-timeout 10 https://localhost/ > /dev/null 2>&1; then
        log "HTTPS 服务响应正常"
    else
        warn "HTTPS 服务可能还未完全启动"
    fi
    
    log "部署验证完成"
}

# 显示部署信息
show_info() {
    log "部署完成！"
    
    # 获取服务器IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${GREEN}"
    echo "================================================"
    echo "           Blog系统部署完成！"
    echo "================================================"
    echo -e "${NC}"
    echo "项目目录: $PROJECT_DIR"
    echo "备份目录: $BACKUP_DIR"
    echo "日志文件: $LOG_FILE"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo "域名访问: https://$DOMAIN"
    echo "IP访问:   https://$SERVER_IP"
    echo "管理后台: https://$DOMAIN/admin"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "查看状态: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps"
    echo "查看日志: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs -f"
    echo "重启服务: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart"
    echo "停止服务: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml down"
    echo "手动备份: /opt/backup-blog.sh"
    echo ""
    echo -e "${RED}重要提醒:${NC}"
    echo "1. 当前使用自签名证书，浏览器会显示安全警告（点击高级->继续访问）"
    echo "2. 自动备份已配置（每天凌晨2点）"
    echo "3. 请修改 $PROJECT_DIR/.env.prod 中的默认密码"
    echo "4. 生产环境建议配置真实的 SSL 证书"
    echo ""
}

# 主函数
main() {
    log "开始 Root 权限博客系统部署..."
    
    check_system
    install_dependencies
    install_docker
    setup_firewall
    create_directories
    check_env
    stop_conflicting_services
    generate_ssl
    deploy_app
    setup_backup
    verify_deployment
    show_info
    
    log "部署流程全部完成！"
}

# 运行主函数
main "$@"