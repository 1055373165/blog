#!/bin/bash

# Blog 项目更新脚本
# 用于更新项目代码、重新构建并部署

set -e

# 配置变量
PROJECT_DIR="/opt/blog/source"
BACKUP_DIR="/opt/blog/data/backups"
LOG_FILE="/opt/blog/logs/update.log"
BRANCH="${BRANCH:-main}"
FORCE_REBUILD="${FORCE_REBUILD:-false}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 显示更新信息
show_update_info() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     Blog 项目更新工具                          ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║ • 代码更新和合并                                              ║"
    echo "║ • 数据库迁移                                                   ║"
    echo "║ • 应用重新构建                                                 ║"
    echo "║ • 零停机更新                                                   ║"
    echo "║ • 自动备份和回滚                                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查权限
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "此脚本需要root权限运行，请使用: sudo $0"
    fi
    
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "项目目录不存在: $PROJECT_DIR"
    fi
    
    cd "$PROJECT_DIR" || error "无法进入项目目录"
}

# 检查Git状态
check_git_status() {
    log "检查Git状态..."
    
    if [[ ! -d ".git" ]]; then
        error "当前目录不是Git仓库"
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        warn "存在未提交的更改："
        git status --porcelain
        
        read -p "是否继续更新？这将丢失所有未提交的更改 (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "更新被用户取消"
        fi
    fi
    
    log "Git状态检查完成"
}

# 创建更新前备份
create_pre_update_backup() {
    log "创建更新前备份..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/pre_update_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # 备份当前代码
    tar -czf "$backup_path/source_backup.tar.gz" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='data' \
        --exclude='logs' \
        . 2>/dev/null
    
    # 备份数据库
    if [[ -n "${MYSQL_ROOT_PASSWORD}" ]]; then
        mysqldump \
            -u root \
            -p"${MYSQL_ROOT_PASSWORD}" \
            --single-transaction \
            --routines \
            --triggers \
            blog_db | gzip > "$backup_path/database_backup.sql.gz"
    fi
    
    # 记录当前版本信息
    cat > "$backup_path/version_info.txt" <<EOF
更新前版本信息
================
时间: $(date '+%Y-%m-%d %H:%M:%S')
分支: $(git branch --show-current)
提交: $(git rev-parse HEAD)
提交信息: $(git log -1 --pretty=format:"%s")
提交作者: $(git log -1 --pretty=format:"%an <%ae>")
提交时间: $(git log -1 --pretty=format:"%cd")

运行中的容器:
$(docker compose -f docker-compose.prod.yml ps)
EOF
    
    log "备份已创建: $backup_path"
    echo "$backup_path" > /tmp/blog_last_backup_path
}

# 更新代码
update_code() {
    log "更新项目代码..."
    
    # 重置本地更改
    git reset --hard HEAD
    git clean -fd
    
    # 拉取最新代码
    log "拉取远程分支: $BRANCH"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    
    # 显示更新信息
    local current_commit=$(git rev-parse HEAD)
    local previous_commit=$(git rev-parse HEAD~1)
    
    log "代码更新完成"
    info "当前版本: $current_commit"
    
    # 显示本次更新的变更
    if [[ "$current_commit" != "$previous_commit" ]]; then
        log "本次更新包含以下变更:"
        git log --oneline "$previous_commit..$current_commit" | tee -a "$LOG_FILE"
    else
        info "代码已是最新版本"
    fi
}

# 检查依赖更新
check_dependencies() {
    log "检查依赖更新..."
    
    # 检查后端依赖
    if [[ -f "backend/go.mod" ]]; then
        cd backend
        if git diff HEAD~1 go.mod go.sum >/dev/null 2>&1; then
            log "Go依赖有更新，将重新下载"
            go mod download
            go mod tidy
        fi
        cd ..
    fi
    
    # 检查前端依赖
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        if git diff HEAD~1 package.json package-lock.json yarn.lock >/dev/null 2>&1; then
            log "前端依赖有更新，将重新安装"
            if [[ -f "yarn.lock" ]]; then
                yarn install --frozen-lockfile
            elif [[ -f "package-lock.json" ]]; then
                npm ci
            else
                npm install
            fi
        fi
        cd ..
    fi
    
    log "依赖检查完成"
}

# 运行数据库迁移
run_database_migrations() {
    log "检查数据库迁移..."
    
    # 检查是否有新的迁移文件
    if [[ -d "backend/migrations" ]]; then
        local migration_files=(backend/migrations/*.sql)
        if [[ ${#migration_files[@]} -gt 0 ]]; then
            log "发现数据库迁移文件，开始执行..."
            
            # 这里应该根据你的项目实际情况执行迁移
            # 示例：运行Go迁移工具或直接执行SQL
            for migration in "${migration_files[@]}"; do
                if [[ -f "$migration" ]]; then
                    log "执行迁移: $migration"
                    # mysql -u root -p"${MYSQL_ROOT_PASSWORD}" blog_db < "$migration"
                fi
            done
        fi
    fi
    
    log "数据库迁移完成"
}

# 构建应用
build_application() {
    log "构建应用..."
    
    local build_args=""
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        build_args="--no-cache"
        log "强制重新构建所有镜像"
    else
        log "增量构建（使用缓存）"
    fi
    
    # 构建镜像
    docker compose -f docker-compose.prod.yml build $build_args
    
    if [[ $? -eq 0 ]]; then
        log "应用构建完成"
    else
        error "应用构建失败"
    fi
}

# 进行健康检查
health_check() {
    log "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        info "健康检查尝试 $attempt/$max_attempts"
        
        # 检查后端API
        if curl -f -s --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
            log "✓ 后端服务健康检查通过"
            
            # 检查前端
            if curl -f -s --connect-timeout 5 http://localhost >/dev/null 2>&1; then
                log "✓ 前端服务健康检查通过"
                return 0
            fi
        fi
        
        sleep 10
        ((attempt++))
    done
    
    error "健康检查失败，服务可能存在问题"
}

# 滚动更新
rolling_update() {
    log "开始滚动更新..."
    
    # 先更新后端
    log "更新后端服务..."
    docker compose -f docker-compose.prod.yml up -d --no-deps backend
    sleep 20
    
    # 健康检查后端
    if ! curl -f -s --connect-timeout 10 http://localhost:3001/api/health >/dev/null 2>&1; then
        error "后端服务启动失败"
    fi
    
    # 再更新前端
    log "更新前端服务..."
    docker compose -f docker-compose.prod.yml up -d --no-deps frontend
    sleep 15
    
    # 最后更新Nginx
    log "更新Nginx服务..."
    docker compose -f docker-compose.prod.yml up -d --no-deps nginx
    sleep 10
    
    log "滚动更新完成"
}

# 验证更新
verify_update() {
    log "验证更新结果..."
    
    # 检查容器状态
    log "检查容器状态:"
    docker compose -f docker-compose.prod.yml ps
    
    # 检查服务可用性
    health_check
    
    # 检查版本信息
    local current_version=$(git rev-parse --short HEAD)
    log "当前运行版本: $current_version"
    
    # 记录更新成功
    cat >> "$LOG_FILE" <<EOF

更新完成报告
============
更新时间: $(date '+%Y-%m-%d %H:%M:%S')
更新版本: $current_version
更新分支: $BRANCH
更新状态: 成功

服务状态:
$(docker compose -f docker-compose.prod.yml ps)
EOF
    
    log "更新验证完成"
}

# 回滚函数
rollback() {
    error "更新失败，开始回滚..."
    
    local backup_path
    if [[ -f "/tmp/blog_last_backup_path" ]]; then
        backup_path=$(cat /tmp/blog_last_backup_path)
    else
        error "无法找到备份路径，无法回滚"
    fi
    
    if [[ ! -d "$backup_path" ]]; then
        error "备份目录不存在: $backup_path"
    fi
    
    log "从备份恢复: $backup_path"
    
    # 停止当前服务
    docker compose -f docker-compose.prod.yml down
    
    # 恢复代码
    if [[ -f "$backup_path/source_backup.tar.gz" ]]; then
        tar -xzf "$backup_path/source_backup.tar.gz" -C .
        log "代码已恢复"
    fi
    
    # 恢复数据库
    if [[ -f "$backup_path/database_backup.sql.gz" && -n "${MYSQL_ROOT_PASSWORD}" ]]; then
        zcat "$backup_path/database_backup.sql.gz" | mysql -u root -p"${MYSQL_ROOT_PASSWORD}" blog_db
        log "数据库已恢复"
    fi
    
    # 重新启动服务
    docker compose -f docker-compose.prod.yml up -d
    sleep 30
    
    # 验证回滚
    if curl -f -s --connect-timeout 10 http://localhost >/dev/null 2>&1; then
        log "回滚成功，服务已恢复"
    else
        error "回滚失败，请手动检查"
    fi
}

# 清理旧的备份和镜像
cleanup() {
    log "清理旧备份和镜像..."
    
    # 清理旧备份（保留最近7个）
    find "$BACKUP_DIR" -name "pre_update_*" -type d | sort -r | tail -n +8 | xargs rm -rf 2>/dev/null || true
    
    # 清理Docker镜像
    docker image prune -f
    
    log "清理完成"
}

# 发送更新通知
send_notification() {
    local status="$1"
    local version="$2"
    
    # 这里可以添加邮件、Slack或其他通知方式
    log "更新通知: $status - 版本 $version"
}

# 主函数
main() {
    local start_time=$(date +%s)
    
    show_update_info
    
    log "开始更新流程..."
    
    check_permissions
    check_git_status
    create_pre_update_backup
    update_code
    check_dependencies
    run_database_migrations
    build_application
    rolling_update
    verify_update
    cleanup
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    local current_version=$(git rev-parse --short HEAD)
    send_notification "SUCCESS" "$current_version"
    
    log "更新完成！耗时: ${duration}秒"
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                     更新成功完成！                             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "当前版本: $current_version"
    echo "更新日志: $LOG_FILE"
    echo "访问地址: https://www.godepth.top"
}

# 错误处理
trap 'rollback' ERR

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --force)
            FORCE_REBUILD="true"
            shift
            ;;
        --help)
            echo "使用方法: $0 [选项]"
            echo "选项:"
            echo "  --branch BRANCH    指定更新分支 (默认: main)"
            echo "  --force           强制重新构建所有镜像"
            echo "  --help            显示帮助信息"
            exit 0
            ;;
        *)
            error "未知参数: $1"
            ;;
    esac
done

# 运行主函数
main "$@"