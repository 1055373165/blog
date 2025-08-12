#!/bin/bash

# Blog项目更新脚本
# 用于更新已部署的生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
PROJECT_DIR="/opt/blog"
BACKUP_DIR="/opt/backups"
LOG_FILE="$HOME/blog-update.log"

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

# 检查是否在项目目录
check_directory() {
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        error "请在项目根目录运行此脚本"
    fi
}

# 备份数据
backup_data() {
    log "备份当前数据..."
    
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/update_backup_$DATE"
    
    mkdir -p $BACKUP_PATH/{db,uploads,config}
    
    # 备份数据库
    docker exec blog_postgres_prod pg_dump -U blog_user -d blog_db | gzip > $BACKUP_PATH/db/blog_db.sql.gz
    
    # 备份上传文件
    if [[ -d "data/uploads" ]]; then
        cp -r data/uploads $BACKUP_PATH/
    fi
    
    # 备份配置文件
    cp .env.prod docker-compose.prod.yml $BACKUP_PATH/config/
    
    log "数据备份完成: $BACKUP_PATH"
    echo "BACKUP_PATH=$BACKUP_PATH" > /tmp/blog_backup_path
}

# 拉取最新代码
pull_code() {
    log "拉取最新代码..."
    
    if [[ -d ".git" ]]; then
        git pull origin main
    else
        warn "非Git仓库，请手动上传最新代码"
    fi
}

# 更新应用
update_app() {
    log "更新应用..."
    
    # 停止服务
    docker-compose -f docker-compose.prod.yml down
    
    # 清理旧镜像
    docker system prune -f
    docker image prune -af
    
    # 重新构建
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # 启动服务
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        error "服务启动失败，正在回滚..."
    fi
}

# 验证更新
verify_update() {
    log "验证更新..."
    
    # 检查网站访问
    if curl -f -s -o /dev/null https://www.godepth.top; then
        log "网站访问正常"
    else
        error "网站访问失败，正在回滚..."
    fi
    
    # 检查API
    if curl -f -s -o /dev/null https://www.godepth.top/api/health; then
        log "API服务正常"
    else
        warn "API服务可能存在问题"
    fi
}

# 回滚
rollback() {
    if [[ -f "/tmp/blog_backup_path" ]]; then
        BACKUP_PATH=$(cat /tmp/blog_backup_path | cut -d'=' -f2)
        
        log "正在回滚到备份: $BACKUP_PATH"
        
        # 停止服务
        docker-compose -f docker-compose.prod.yml down
        
        # 恢复配置文件
        cp $BACKUP_PATH/config/* .
        
        # 恢复上传文件
        if [[ -d "$BACKUP_PATH/uploads" ]]; then
            rm -rf data/uploads
            cp -r $BACKUP_PATH/uploads data/
        fi
        
        # 重启服务
        docker-compose -f docker-compose.prod.yml up -d
        
        log "回滚完成"
    else
        error "未找到备份路径，无法自动回滚"
    fi
}

# 清理备份
cleanup() {
    log "清理旧备份..."
    
    # 保留最近5个更新备份
    find $BACKUP_DIR -name "update_backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf
    
    # 清理临时文件
    rm -f /tmp/blog_backup_path
    
    log "清理完成"
}

# 主函数
main() {
    log "开始更新博客系统..."
    
    # 检查环境
    check_directory
    
    # 设置错误处理
    trap rollback ERR
    
    # 执行更新流程
    backup_data
    pull_code
    update_app
    verify_update
    cleanup
    
    log "更新完成！"
    
    echo -e "${GREEN}"
    echo "================================================"
    echo "           更新完成！"
    echo "================================================"
    echo -e "${NC}"
    echo "网站地址: https://www.godepth.top"
    echo ""
    echo "检查服务状态: docker-compose -f docker-compose.prod.yml ps"
    echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi