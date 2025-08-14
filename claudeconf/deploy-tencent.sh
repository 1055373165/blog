#!/bin/bash

# 腾讯云Ubuntu服务器一键部署脚本
# 完整版 - 从零开始配置整个服务器环境
# 
# 使用方法:
#   chmod +x deploy-tencent.sh
#   ./deploy-tencent.sh
#
# 功能:
# 1. 系统环境配置
# 2. Docker安装配置
# 3. MySQL安装配置 
# 4. Nginx安装配置
# 5. 应用部署
# 6. SSL证书配置
# 7. 系统服务管理

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# 配置变量
DOMAIN="www.godepth.top"
PROJECT_DIR="/root/blog"
MYSQL_ROOT_PASSWORD=""
MYSQL_DB_PASSWORD=""
JWT_SECRET=""
REDIS_PASSWORD=""
LOG_FILE="/var/log/blog-deploy.log"

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}此脚本需要root权限运行，请使用: sudo $0${NC}"
        exit 1
    fi
}

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

# 显示欢迎信息
show_welcome() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     Blog 一键部署系统                          ║"
    echo "║                    腾讯云 Ubuntu 专用版                         ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ • 自动安装 Docker、MySQL、Nginx                               ║"
    echo "║ • 自动配置 SSL 证书                                           ║"
    echo "║ • 自动创建系统服务                                             ║"
    echo "║ • 自动配置防火墙规则                                           ║"
    echo "║ • 支持域名访问和IP访问                                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    read -p "按回车键开始部署..." -r
}

# 生成随机密码
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# 收集用户输入
collect_inputs() {
    log "收集部署配置信息..."
    
    # 域名配置
    echo -e "${CYAN}请输入域名 (直接回车使用默认值: $DOMAIN):${NC}"
    read -r user_domain
    if [[ -n "$user_domain" ]]; then
        DOMAIN="$user_domain"
    fi
    
    # MySQL密码
    echo -e "${CYAN}请输入MySQL root密码 (直接回车自动生成):${NC}"
    read -s mysql_root_pass
    if [[ -n "$mysql_root_pass" ]]; then
        MYSQL_ROOT_PASSWORD="$mysql_root_pass"
    else
        MYSQL_ROOT_PASSWORD=$(generate_password)
    fi
    
    # 数据库密码
    echo -e "${CYAN}请输入应用数据库密码 (直接回车自动生成):${NC}"
    read -s mysql_db_pass
    if [[ -n "$mysql_db_pass" ]]; then
        MYSQL_DB_PASSWORD="$mysql_db_pass"
    else
        MYSQL_DB_PASSWORD=$(generate_password)
    fi
    
    # JWT密钥
    echo -e "${CYAN}请输入JWT密钥 (直接回车自动生成):${NC}"
    read -s jwt_secret
    if [[ -n "$jwt_secret" ]]; then
        JWT_SECRET="$jwt_secret"
    else
        JWT_SECRET=$(generate_password)
    fi
    
    # Redis密码
    echo -e "${CYAN}请输入Redis密码 (直接回车自动生成):${NC}"
    read -s redis_pass
    if [[ -n "$redis_pass" ]]; then
        REDIS_PASSWORD="$redis_pass"
    else
        REDIS_PASSWORD=$(generate_password)
    fi
    
    log "配置信息收集完成"
}

# 系统更新
update_system() {
    log "更新系统软件包..."
    
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        unzip \
        software-properties-common \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        openssl \
        net-tools
    
    log "系统更新完成"
}

# 安装Docker
install_docker() {
    log "安装Docker..."
    
    # 移除旧版本
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # 添加Docker官方GPG密钥
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 添加Docker仓库
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 启动并启用Docker
    systemctl start docker
    systemctl enable docker
    
    # 添加用户到docker组（如果有非root用户）
    if [[ -n "$SUDO_USER" ]]; then
        usermod -aG docker "$SUDO_USER"
    fi
    
    log "Docker安装完成"
}

# 安装MySQL
install_mysql() {
    log "安装MySQL..."
    
    # 设置MySQL root密码
    debconf-set-selections <<< "mysql-server mysql-server/root_password password $MYSQL_ROOT_PASSWORD"
    debconf-set-selections <<< "mysql-server mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD"
    
    # 安装MySQL
    apt-get install -y mysql-server
    
    # 启动并启用MySQL
    systemctl start mysql
    systemctl enable mysql
    
    # 等待MySQL启动
    sleep 10
    
    # 创建应用数据库和用户
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'blog_user'@'%' IDENTIFIED BY '$MYSQL_DB_PASSWORD';
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'%';
FLUSH PRIVILEGES;
EOF
    
    # 配置MySQL远程访问
    sed -i 's/bind-address.*=.*127.0.0.1/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
    systemctl restart mysql
    
    log "MySQL安装配置完成"
}

# 确保系统Nginx不冲突
ensure_nginx_clean() {
    log "检查并清理系统Nginx..."
    
    # 停止系统Nginx（如果运行）
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    
    # 检查端口占用
    if netstat -tlnp 2>/dev/null | grep -q ":80\s"; then
        warn "端口80仍被占用，请检查："
        netstat -tlnp 2>/dev/null | grep ":80\s" || true
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q ":443\s"; then
        warn "端口443仍被占用，请检查："
        netstat -tlnp 2>/dev/null | grep ":443\s" || true
    fi
    
    log "Nginx环境检查完成"
}

# 配置防火墙
setup_firewall() {
    log "配置防火墙..."
    
    # 重置UFW规则
    ufw --force reset
    
    # 设置默认策略
    ufw default deny incoming
    ufw default allow outgoing
    
    # 允许SSH
    ufw allow ssh
    ufw allow 22/tcp
    
    # 允许HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许MySQL(仅本地)
    ufw allow from 127.0.0.1 to any port 3306
    ufw allow from 172.16.0.0/12 to any port 3306
    
    # 启用防火墙
    ufw --force enable
    
    log "防火墙配置完成"
}

# 创建项目目录结构
create_project_structure() {
    log "创建项目目录结构..."
    
    mkdir -p $PROJECT_DIR
    mkdir -p $PROJECT_DIR/{data,logs,config,scripts}
    mkdir -p $PROJECT_DIR/data/{uploads,search_index,mysql,redis}
    mkdir -p $PROJECT_DIR/logs/{nginx,app,mysql}
    mkdir -p $PROJECT_DIR/config/{nginx,ssl}
    
    # 设置目录权限
    chown -R www-data:www-data $PROJECT_DIR/data
    chmod -R 755 $PROJECT_DIR
    
    log "项目目录结构创建完成"
}

# 生成SSL证书
generate_ssl_certificate() {
    log "生成SSL证书..."
    
    mkdir -p $PROJECT_DIR/config/ssl
    
    # 生成私钥
    openssl genrsa -out $PROJECT_DIR/config/ssl/privkey.pem 2048
    
    # 生成证书请求
    openssl req -new -key $PROJECT_DIR/config/ssl/privkey.pem \
        -out $PROJECT_DIR/config/ssl/cert.csr \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Blog/CN=$DOMAIN"
    
    # 生成自签名证书
    openssl x509 -req -in $PROJECT_DIR/config/ssl/cert.csr \
        -signkey $PROJECT_DIR/config/ssl/privkey.pem \
        -out $PROJECT_DIR/config/ssl/fullchain.pem \
        -days 365
    
    # 生成DH参数
    openssl dhparam -out $PROJECT_DIR/config/ssl/dhparam.pem 2048
    
    # 设置证书权限
    chmod 600 $PROJECT_DIR/config/ssl/privkey.pem
    chmod 644 $PROJECT_DIR/config/ssl/fullchain.pem
    chmod 644 $PROJECT_DIR/config/ssl/dhparam.pem
    
    log "SSL证书生成完成"
}

# 部署应用
deploy_application() {
    log "部署应用..."
    
    # 确保项目目录存在
    mkdir -p $PROJECT_DIR/source
    
    # 复制项目文件到部署目录
    if [[ "$PWD" != "$PROJECT_DIR/source" ]]; then
        log "复制项目文件到 $PROJECT_DIR/source..."
        cp -r . $PROJECT_DIR/source/
    fi
    
    cd $PROJECT_DIR/source
    
    # 创建环境配置文件
    cat > .env.prod <<EOF
# 数据库配置
DB_USER=blog_user
DB_PASSWORD=$MYSQL_DB_PASSWORD
DB_NAME=blog_db

# 应用配置
JWT_SECRET=$JWT_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD

# 域名配置
DOMAIN=$DOMAIN
EOF
    
    # 构建并启动应用
    docker compose --env-file .env.prod -f docker-compose.prod.yml build
    docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
    
    log "应用部署完成"
}

# 保存配置信息
save_configuration() {
    log "保存配置信息..."
    
    cat > $PROJECT_DIR/config/deployment_info.txt <<EOF
Blog 部署信息
=============

部署时间: $(date '+%Y-%m-%d %H:%M:%S')
域名: $DOMAIN
项目目录: $PROJECT_DIR

数据库信息:
- MySQL Root 密码: $MYSQL_ROOT_PASSWORD
- 应用数据库密码: $MYSQL_DB_PASSWORD
- 数据库名: blog_db
- 数据库用户: blog_user

应用配置:
- JWT 密钥: $JWT_SECRET
- Redis 密码: $REDIS_PASSWORD

访问地址:
- HTTP: http://$DOMAIN
- HTTPS: https://$DOMAIN
- 管理后台: https://$DOMAIN/admin

常用命令:
- 查看应用状态: cd $PROJECT_DIR/source && docker compose -f docker-compose.prod.yml ps
- 查看应用日志: cd $PROJECT_DIR/source && docker compose -f docker-compose.prod.yml logs -f
- 重启应用: cd $PROJECT_DIR/source && docker compose -f docker-compose.prod.yml restart
- 停止应用: cd $PROJECT_DIR/source && docker compose -f docker-compose.prod.yml down

系统服务:
- Docker: systemctl status docker
- MySQL: systemctl status mysql
- Nginx: systemctl status nginx

日志位置:
- 部署日志: $LOG_FILE
- Nginx日志: /var/log/nginx/
- MySQL日志: /var/log/mysql/

注意事项:
1. 请妥善保存这些密码信息
2. 建议定期备份数据库和文件
3. 定期更新系统和应用
4. 监控服务器资源使用情况
EOF
    
    chmod 600 $PROJECT_DIR/config/deployment_info.txt
    
    log "配置信息已保存到: $PROJECT_DIR/config/deployment_info.txt"
}

# 最终验证
final_verification() {
    log "最终验证部署..."
    
    # 检查服务状态
    systemctl is-active --quiet docker && log "✓ Docker 运行正常" || warn "✗ Docker 服务异常"
    systemctl is-active --quiet mysql && log "✓ MySQL 运行正常" || warn "✗ MySQL 服务异常"
    systemctl is-active --quiet nginx && log "✓ Nginx 运行正常" || warn "✗ Nginx 服务异常"
    
    # 检查端口
    if netstat -tlnp | grep -q ":80\s"; then
        log "✓ 端口 80 已监听"
    else
        warn "✗ 端口 80 未监听"
    fi
    
    if netstat -tlnp | grep -q ":443\s"; then
        log "✓ 端口 443 已监听"
    else
        warn "✗ 端口 443 未监听"
    fi
    
    # 检查Docker容器
    cd $PROJECT_DIR/source
    if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log "✓ 应用容器运行正常"
    else
        warn "✗ 应用容器状态异常"
        docker compose -f docker-compose.prod.yml ps
    fi
    
    log "部署验证完成"
}

# 显示完成信息
show_completion_info() {
    log "部署完成！"
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     部署成功完成！                             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}访问信息:${NC}"
    echo "• 网站地址: https://$DOMAIN"
    echo "• 管理后台: https://$DOMAIN/admin"
    echo "• API健康检查: https://$DOMAIN/api/health"
    echo ""
    
    echo -e "${CYAN}重要信息:${NC}"
    echo "• 配置文件: $PROJECT_DIR/config/deployment_info.txt"
    echo "• 日志文件: $LOG_FILE"
    echo "• 项目目录: $PROJECT_DIR"
    echo ""
    
    echo -e "${YELLOW}后续步骤:${NC}"
    echo "1. 访问网站验证功能是否正常"
    echo "2. 配置真实的SSL证书(可选)"
    echo "3. 设置数据库备份策略"
    echo "4. 配置监控和告警"
    echo ""
    
    echo -e "${RED}重要提醒:${NC}"
    echo "1. 请妥善保存 $PROJECT_DIR/config/deployment_info.txt 中的密码信息"
    echo "2. 当前使用自签名证书，浏览器会显示安全警告"
    echo "3. 建议定期备份数据库和上传文件"
    echo "4. 定期更新系统安全补丁"
}

# 主函数
main() {
    log "开始腾讯云Ubuntu一键部署..."
    
    check_root
    show_welcome
    collect_inputs
    ensure_nginx_clean
    update_system
    install_docker
    install_mysql
    setup_firewall
    create_project_structure
    generate_ssl_certificate
    
    # 复制配置文件
    cp ./claudeconf/*.conf $PROJECT_DIR/config/nginx/ 2>/dev/null || true
    cp ./claudeconf/*.service /etc/systemd/system/ 2>/dev/null || true
    systemctl daemon-reload
    
    deploy_application
    save_configuration
    final_verification
    show_completion_info
    
    log "一键部署流程完成！"
}

# 错误处理
trap 'error "部署过程中发生错误，请检查日志: $LOG_FILE"' ERR

# 运行主函数
main "$@"