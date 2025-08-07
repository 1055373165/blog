#!/bin/bash

# 数据库初始化脚本
# 用法: ./scripts/init-db.sh [options]

set -e

# 默认配置
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_NAME=${DB_NAME:-"blog_db"}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
数据库初始化脚本

用法: $0 [选项]

选项:
    -h, --help              显示此帮助信息
    --host HOST             数据库主机 (默认: localhost)
    --port PORT             数据库端口 (默认: 5432)
    --user USER             数据库用户 (默认: postgres)
    --dbname DBNAME         数据库名称 (默认: blog_db)
    --drop                  删除已存在的数据库
    --seed                  插入种子数据
    --reset                 重置数据库 (删除+创建+迁移+种子数据)

示例:
    $0                      基本初始化
    $0 --drop --seed        删除重建并插入种子数据
    $0 --reset              完全重置数据库
EOF
}

# 解析命令行参数
SHOULD_DROP=false
SHOULD_SEED=false
SHOULD_RESET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --dbname)
            DB_NAME="$2"
            shift 2
            ;;
        --drop)
            SHOULD_DROP=true
            shift
            ;;
        --seed)
            SHOULD_SEED=true
            shift
            ;;
        --reset)
            SHOULD_RESET=true
            shift
            ;;
        *)
            print_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查必要的命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 命令未找到，请先安装 PostgreSQL 客户端工具"
        exit 1
    fi
}

check_command psql
check_command createdb
check_command dropdb

# 检查数据库连接
check_connection() {
    print_info "检查数据库连接..."
    if ! PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        print_error "无法连接到数据库服务器"
        print_error "请检查数据库服务是否运行，以及连接参数是否正确"
        exit 1
    fi
    print_info "数据库连接正常"
}

# 检查数据库是否存在
check_database_exists() {
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1
}

# 创建数据库
create_database() {
    print_info "创建数据库: $DB_NAME"
    if check_database_exists; then
        print_warn "数据库 $DB_NAME 已存在"
        return 0
    fi
    
    PGPASSWORD=$DB_PASSWORD createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    print_info "数据库 $DB_NAME 创建成功"
}

# 删除数据库
drop_database() {
    print_info "删除数据库: $DB_NAME"
    if ! check_database_exists; then
        print_warn "数据库 $DB_NAME 不存在"
        return 0
    fi
    
    PGPASSWORD=$DB_PASSWORD dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    print_info "数据库 $DB_NAME 删除成功"
}

# 运行迁移
run_migrations() {
    print_info "运行数据库迁移..."
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f migrations/001_create_tables.sql -q
    print_info "数据库迁移完成"
}

# 插入种子数据
insert_seed_data() {
    print_info "插入种子数据..."
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/seed.sql -q
    print_info "种子数据插入完成"
}

# 显示数据库状态
show_status() {
    print_info "数据库状态:"
    PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 'Users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'Categories', COUNT(*) FROM categories  
    UNION ALL
    SELECT 'Tags', COUNT(*) FROM tags
    UNION ALL
    SELECT 'Articles', COUNT(*) FROM articles
    UNION ALL
    SELECT 'Published Articles', COUNT(*) FROM articles WHERE is_published = true;
    "
}

# 主逻辑
main() {
    print_info "开始初始化数据库..."
    print_info "配置: Host=$DB_HOST, Port=$DB_PORT, User=$DB_USER, Database=$DB_NAME"
    
    # 检查连接
    check_connection
    
    if [[ "$SHOULD_RESET" == "true" ]]; then
        drop_database
        create_database
        run_migrations
        insert_seed_data
        show_status
        print_info "数据库重置完成！"
        return 0
    fi
    
    if [[ "$SHOULD_DROP" == "true" ]]; then
        drop_database
    fi
    
    create_database
    run_migrations
    
    if [[ "$SHOULD_SEED" == "true" ]]; then
        insert_seed_data
    fi
    
    show_status
    print_info "数据库初始化完成！"
}

# 运行主函数
main "$@"