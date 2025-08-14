#!/bin/bash

# Blog 系统备份脚本
# 用于备份数据库、上传文件和配置文件

set -e

# 配置变量
BACKUP_DIR="${BACKUP_DIR:-/opt/blog/data/backups}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_ROOT_PASSWORD}"
DB_NAME="${DB_NAME:-blog_db}"
UPLOAD_DIR="${UPLOAD_DIR:-/opt/blog/data/uploads}"
CONFIG_DIR="${CONFIG_DIR:-/opt/blog/config}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="/opt/blog/logs/backup.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# 创建备份目录
create_backup_dirs() {
    log "创建备份目录结构..."
    
    mkdir -p "$BACKUP_DIR"/{database,uploads,config,logs}
    mkdir -p "$BACKUP_DIR/database/$(date +%Y-%m)"
    mkdir -p "$BACKUP_DIR/uploads/$(date +%Y-%m)"
    mkdir -p "$BACKUP_DIR/config/$(date +%Y-%m)"
    
    log "备份目录创建完成"
}

# 备份数据库
backup_database() {
    log "开始备份数据库..."
    
    local backup_file="$BACKUP_DIR/database/$(date +%Y-%m)/blog_db_$(date +%Y%m%d_%H%M%S).sql"
    local backup_file_gz="${backup_file}.gz"
    
    # 检查MySQL连接
    if ! mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" >/dev/null 2>&1; then
        error "无法连接到MySQL数据库"
    fi
    
    # 备份数据库
    mysqldump \
        -u"$MYSQL_USER" \
        -p"$MYSQL_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --lock-tables=false \
        --add-drop-table \
        --quick \
        --extended-insert \
        "$DB_NAME" > "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        # 压缩备份文件
        gzip "$backup_file"
        
        # 验证备份文件
        if [[ -f "$backup_file_gz" ]]; then
            local file_size=$(du -h "$backup_file_gz" | cut -f1)
            log "数据库备份完成: $backup_file_gz (大小: $file_size)"
        else
            error "数据库备份文件创建失败"
        fi
    else
        error "数据库备份失败"
    fi
}

# 备份上传文件
backup_uploads() {
    log "开始备份上传文件..."
    
    if [[ ! -d "$UPLOAD_DIR" ]]; then
        warn "上传目录不存在: $UPLOAD_DIR"
        return 0
    fi
    
    local backup_file="$BACKUP_DIR/uploads/$(date +%Y-%m)/uploads_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # 创建压缩备份
    tar -czf "$backup_file" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log "上传文件备份完成: $backup_file (大小: $file_size)"
    else
        error "上传文件备份失败"
    fi
}

# 备份配置文件
backup_config() {
    log "开始备份配置文件..."
    
    local backup_file="$BACKUP_DIR/config/$(date +%Y-%m)/config_$(date +%Y%m%d_%H%M%S).tar.gz"
    local temp_dir="/tmp/blog_config_backup_$$"
    
    mkdir -p "$temp_dir"
    
    # 复制配置文件
    if [[ -d "$CONFIG_DIR" ]]; then
        cp -r "$CONFIG_DIR"/* "$temp_dir/" 2>/dev/null || true
    fi
    
    # 复制环境文件
    if [[ -f "/opt/blog/source/.env.prod" ]]; then
        cp "/opt/blog/source/.env.prod" "$temp_dir/" 2>/dev/null || true
    fi
    
    # 复制Docker配置
    if [[ -f "/opt/blog/source/docker-compose.prod.yml" ]]; then
        cp "/opt/blog/source/docker-compose.prod.yml" "$temp_dir/" 2>/dev/null || true
    fi
    
    # 创建压缩备份
    if [[ -n "$(ls -A "$temp_dir" 2>/dev/null)" ]]; then
        tar -czf "$backup_file" -C "$temp_dir" . 2>/dev/null
        
        if [[ $? -eq 0 ]]; then
            local file_size=$(du -h "$backup_file" | cut -f1)
            log "配置文件备份完成: $backup_file (大小: $file_size)"
        else
            warn "配置文件备份失败"
        fi
    else
        warn "没有找到配置文件进行备份"
    fi
    
    # 清理临时目录
    rm -rf "$temp_dir"
}

# 清理旧备份
cleanup_old_backups() {
    log "清理超过 $RETENTION_DAYS 天的旧备份..."
    
    # 清理数据库备份
    find "$BACKUP_DIR/database" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # 清理上传文件备份
    find "$BACKUP_DIR/uploads" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # 清理配置文件备份
    find "$BACKUP_DIR/config" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # 清理空目录
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    log "旧备份清理完成"
}

# 生成备份报告
generate_backup_report() {
    log "生成备份报告..."
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).txt"
    
    cat > "$report_file" <<EOF
Blog 系统备份报告
================

备份时间: $(date '+%Y-%m-%d %H:%M:%S')
备份目录: $BACKUP_DIR

目录统计:
--------
EOF
    
    # 统计各类备份文件
    echo "数据库备份:" >> "$report_file"
    find "$BACKUP_DIR/database" -name "*.sql.gz" -type f -exec ls -lh {} \; 2>/dev/null | tail -5 >> "$report_file" || echo "  无数据库备份文件" >> "$report_file"
    
    echo "" >> "$report_file"
    echo "上传文件备份:" >> "$report_file"
    find "$BACKUP_DIR/uploads" -name "*.tar.gz" -type f -exec ls -lh {} \; 2>/dev/null | tail -5 >> "$report_file" || echo "  无上传文件备份" >> "$report_file"
    
    echo "" >> "$report_file"
    echo "配置文件备份:" >> "$report_file"
    find "$BACKUP_DIR/config" -name "*.tar.gz" -type f -exec ls -lh {} \; 2>/dev/null | tail -5 >> "$report_file" || echo "  无配置文件备份" >> "$report_file"
    
    echo "" >> "$report_file"
    echo "磁盘使用情况:" >> "$report_file"
    du -sh "$BACKUP_DIR" 2>/dev/null >> "$report_file" || echo "  无法获取磁盘使用情况" >> "$report_file"
    
    log "备份报告已生成: $report_file"
}

# 发送通知 (如果配置了邮件)
send_notification() {
    local status="$1"
    local message="$2"
    
    # 这里可以添加邮件或其他通知方式
    # 例如: echo "$message" | mail -s "Blog备份通知" admin@example.com
    
    log "备份状态: $status - $message"
}

# 验证备份完整性
verify_backup() {
    log "验证备份完整性..."
    
    local today=$(date +%Y%m%d)
    local db_backup=$(find "$BACKUP_DIR/database" -name "*${today}*.sql.gz" -type f | head -1)
    
    if [[ -n "$db_backup" && -f "$db_backup" ]]; then
        # 验证数据库备份文件
        if gzip -t "$db_backup" 2>/dev/null; then
            log "数据库备份文件验证成功"
        else
            error "数据库备份文件损坏"
        fi
    else
        warn "未找到今日数据库备份文件"
    fi
}

# 主函数
main() {
    log "开始执行备份任务..."
    
    create_backup_dirs
    backup_database
    backup_uploads
    backup_config
    cleanup_old_backups
    verify_backup
    generate_backup_report
    
    send_notification "SUCCESS" "备份任务完成"
    log "备份任务执行完成"
}

# 错误处理
trap 'send_notification "FAILED" "备份任务失败"; error "备份过程中发生错误"' ERR

# 检查必要的工具
check_dependencies() {
    local missing_tools=()
    
    for tool in mysql mysqldump tar gzip find; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error "缺少必要工具: ${missing_tools[*]}"
    fi
}

# 运行前检查
check_dependencies

# 运行主函数
main "$@"