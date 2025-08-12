#!/bin/bash

# Blog项目部署脚本
# 适用于阿里云Ubuntu 22.04服务器

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DOMAIN="www.godepth.top"
EMAIL="1055373165@qq.com"  # 请修改为您的邮箱
PROJECT_DIR="/opt/blog"
BACKUP_DIR="/opt/backups"
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

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "请不要以root用户运行此脚本"
    fi
}

# 检查系统
check_system() {
    log "检查系统环境..."
    
    if ! command -v lsb_release &> /dev/null; then
        error "无法检测系统版本，请确保运行在Ubuntu系统上"
    fi
    
    OS_VERSION=$(lsb_release -rs)
    if [[ "$OS_VERSION" != "22.04" ]]; then
        warn "此脚本针对Ubuntu 22.04优化，当前版本: $OS_VERSION"
    fi
    
    log "系统检查完成"
}

# 安装Docker
install_docker() {
    log "检查Docker安装状态..."
    
    if command -v docker &> /dev/null; then
        log "Docker已安装: $(docker --version)"
        return
    fi
    
    log "安装Docker..."
    
    # 更新包索引
    sudo apt-get update
    
    # 安装必要的包
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 添加Docker仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 将当前用户添加到docker组
    sudo usermod -aG docker $USER
    
    # 启动Docker服务
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log "Docker安装完成"
}

# 安装其他依赖
install_dependencies() {
    log "安装系统依赖..."
    
    sudo apt-get update
    sudo apt-get install -y \
        git \
        curl \
        wget \
        unzip \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        logrotate \
        cron
    
    log "依赖安装完成"
}

# 配置防火墙
setup_firewall() {
    log "配置防火墙..."
    
    # 重置UFW规则
    sudo ufw --force reset
    
    # 基本规则
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # 允许SSH (请根据实际SSH端口修改)
    sudo ufw allow 22/tcp
    
    # 允许HTTP和HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # 启用防火墙
    sudo ufw --force enable
    
    log "防火墙配置完成"
}

# 配置Fail2ban
setup_fail2ban() {
    log "配置Fail2ban..."
    
    sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /opt/blog/logs/nginx/error.log
maxretry = 5

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /opt/blog/logs/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /opt/blog/logs/nginx/access.log
maxretry = 2
EOF
    
    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    log "Fail2ban配置完成"
}

# 创建项目目录
create_directories() {
    log "创建项目目录..."
    
    sudo mkdir -p $PROJECT_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $PROJECT_DIR/data/{uploads,search_index}
    sudo mkdir -p $PROJECT_DIR/logs/{nginx,app}
    sudo mkdir -p $PROJECT_DIR/docker/nginx/{conf.d,ssl}
    
    # 设置权限
    sudo chown -R $USER:$USER $PROJECT_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
    
    log "目录创建完成"
}

# 生成SSL证书
setup_ssl() {
    log "配置SSL证书..."
    
    # 检查域名解析
    if ! dig +short $DOMAIN | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' > /dev/null; then
        error "域名 $DOMAIN 未正确解析到此服务器，请检查DNS配置"
    fi
    
    # 临时启动简单HTTP服务器用于验证域名
    sudo docker run --rm -d \
        --name temp-nginx \
        -p 80:80 \
        -v $PROJECT_DIR/docker/nginx/ssl:/var/www/certbot \
        nginx:alpine
    
    # 生成DH参数 (这可能需要几分钟)
    if [[ ! -f "$PROJECT_DIR/docker/nginx/ssl/dhparam.pem" ]]; then
        log "生成DH参数..."
        openssl dhparam -out $PROJECT_DIR/docker/nginx/ssl/dhparam.pem 2048
    fi
    
    # 获取SSL证书
    sudo certbot certonly \
        --webroot \
        --webroot-path=$PROJECT_DIR/docker/nginx/ssl \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d ${DOMAIN#www.}
    
    # 复制证书到项目目录
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/docker/nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/docker/nginx/ssl/
    
    # 设置证书文件权限
    sudo chown $USER:$USER $PROJECT_DIR/docker/nginx/ssl/*.pem
    sudo chmod 644 $PROJECT_DIR/docker/nginx/ssl/fullchain.pem
    sudo chmod 600 $PROJECT_DIR/docker/nginx/ssl/privkey.pem
    
    # 停止临时服务器
    sudo docker stop temp-nginx
    
    # 设置证书自动续期
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/docker-compose -f $PROJECT_DIR/docker-compose.prod.yml restart nginx") | sudo crontab -
    
    log "SSL证书配置完成"
}

# 配置日志轮转
setup_logrotate() {
    log "配置日志轮转..."
    
    sudo tee /etc/logrotate.d/blog > /dev/null << EOF
$PROJECT_DIR/logs/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker kill -s USR1 blog_nginx_prod 2>/dev/null || true
    endscript
}

$PROJECT_DIR/logs/app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
}
EOF
    
    log "日志轮转配置完成"
}

# 设置备份脚本
setup_backup() {
    log "配置备份脚本..."
    
    sudo tee /opt/backup-blog.sh > /dev/null << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/opt/blog"

# 创建备份目录
mkdir -p $BACKUP_DIR/db $BACKUP_DIR/uploads $BACKUP_DIR/config

# 备份数据库
docker exec blog_postgres_prod pg_dump -U blog_user -d blog_db | gzip > $BACKUP_DIR/db/blog_db_$DATE.sql.gz

# 备份上传文件
tar -czf $BACKUP_DIR/uploads/uploads_$DATE.tar.gz -C $PROJECT_DIR/data uploads/

# 备份配置文件
cp -r $PROJECT_DIR/.env.prod $PROJECT_DIR/docker-compose.prod.yml $BACKUP_DIR/config/

# 删除7天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "备份完成: $DATE"
EOF
    
    sudo chmod +x /opt/backup-blog.sh
    
    # 添加到定时任务
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-blog.sh >> /var/log/backup.log 2>&1") | crontab -
    
    log "备份脚本配置完成"
}

# 配置监控脚本
setup_monitoring() {
    log "配置监控脚本..."
    
    sudo tee /opt/monitor-blog.sh > /dev/null << 'EOF'
#!/bin/bash

PROJECT_DIR="/opt/blog"
LOG_FILE="/var/log/blog-monitor.log"

cd $PROJECT_DIR

# 检查容器状态
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "$(date): 检测到容器异常，尝试重启..." >> $LOG_FILE
    docker-compose -f docker-compose.prod.yml restart
fi

# 检查磁盘空间
DISK_USAGE=$(df /opt | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): 磁盘使用率过高: ${DISK_USAGE}%" >> $LOG_FILE
fi

# 检查内存使用
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 85 ]; then
    echo "$(date): 内存使用率过高: ${MEMORY_USAGE}%" >> $LOG_FILE
fi
EOF
    
    sudo chmod +x /opt/monitor-blog.sh
    
    # 每5分钟检查一次
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/monitor-blog.sh") | crontab -
    
    log "监控脚本配置完成"
}

# 部署应用
deploy_app() {
    log "部署应用..."
    
    cd $PROJECT_DIR
    
    # 检查环境变量文件
    if [[ ! -f .env.prod ]]; then
        error ".env.prod 文件不存在，请先创建并配置环境变量"
    fi
    
    # 构建并启动服务
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    sleep 30
    
    # 检查服务状态
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "服务启动失败，请检查日志"
    fi
    
    log "应用部署完成"
}

# 验证部署
verify_deployment() {
    log "验证部署..."
    
    # 检查HTTP响应
    if curl -f -s -o /dev/null https://$DOMAIN; then
        log "网站访问正常"
    else
        warn "网站访问可能存在问题，请检查"
    fi
    
    # 检查API响应
    if curl -f -s -o /dev/null https://$DOMAIN/api/health; then
        log "API服务正常"
    else
        warn "API服务可能存在问题，请检查"
    fi
    
    log "部署验证完成"
}

# 显示部署后信息
show_info() {
    log "部署完成！"
    echo -e "${GREEN}"
    echo "================================================"
    echo "           Blog系统部署完成！"
    echo "================================================"
    echo -e "${NC}"
    echo "网站地址: https://$DOMAIN"
    echo "管理后台: https://$DOMAIN/admin"
    echo ""
    echo -e "${YELLOW}重要信息:${NC}"
    echo "1. 项目目录: $PROJECT_DIR"
    echo "2. 备份目录: $BACKUP_DIR"
    echo "3. 日志文件: $LOG_FILE"
    echo "4. SSL证书将自动续期"
    echo "5. 数据库每天2点自动备份"
    echo "6. 系统每5分钟自动监控"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "查看服务状态: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps"
    echo "查看日志: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs -f"
    echo "重启服务: cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart"
    echo "更新部署: cd $PROJECT_DIR && ./deploy.sh"
    echo ""
    echo -e "${RED}请务必:${NC}"
    echo "1. 修改 .env.prod 中的默认密码"
    echo "2. 配置邮箱地址用于SSL证书续期通知"
    echo "3. 定期检查系统日志和监控信息"
    echo ""
}

# 主函数
main() {
    log "开始博客系统部署..."
    
    check_root
    check_system
    install_dependencies
    install_docker
    setup_firewall
    setup_fail2ban
    create_directories
    setup_ssl
    setup_logrotate
    setup_backup
    setup_monitoring
    deploy_app
    verify_deployment
    show_info
    
    log "部署流程全部完成！"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi