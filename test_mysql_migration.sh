#!/bin/bash

echo "🔍 PostgreSQL到MySQL迁移验证脚本"
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# 检查函数
check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo -e "\n1. 检查Go依赖配置..."
if grep -q "gorm.io/driver/mysql" backend/go.mod; then
    check_pass "MySQL驱动已配置"
else
    check_fail "MySQL驱动未找到，请检查backend/go.mod"
fi

if grep -q "gorm.io/driver/postgres" backend/go.mod; then
    check_fail "仍然存在PostgreSQL驱动引用"
else
    check_pass "PostgreSQL驱动已移除"
fi

echo -e "\n2. 检查数据库连接配置..."
if grep -q "mysql.Open" backend/internal/database/database.go; then
    check_pass "数据库连接已改为MySQL"
else
    check_fail "数据库连接配置有误"
fi

if grep -q "postgres.Open" backend/internal/database/database.go; then
    check_fail "仍然存在PostgreSQL连接配置"
else
    check_pass "PostgreSQL连接配置已移除"
fi

echo -e "\n3. 检查DSN格式..."
if grep -q "tcp(" backend/internal/config/config.go; then
    check_pass "MySQL DSN格式正确"
else
    check_fail "DSN格式可能不正确"
fi

echo -e "\n4. 检查Docker Compose配置..."
if ! grep -q "postgres:" docker-compose.yml; then
    check_pass "PostgreSQL容器已从开发环境移除"
else
    check_fail "开发环境仍有PostgreSQL容器配置"
fi

if ! grep -q "postgres:" docker-compose.prod.yml; then
    check_pass "PostgreSQL容器已从生产环境移除"
else
    check_fail "生产环境仍有PostgreSQL容器配置"
fi

if grep -q "host.docker.internal" docker-compose.yml; then
    check_pass "Docker配置已更新为连接主机MySQL"
else
    check_fail "Docker配置未正确设置主机连接"
fi

echo -e "\n5. 检查环境变量配置..."
if grep -q "DB_PORT=3306" .env 2>/dev/null; then
    check_pass ".env文件MySQL端口配置正确"
else
    check_warn ".env文件MySQL端口配置需要检查"
fi

if grep -q "DB_PORT=3306" .env.prod; then
    check_pass ".env.prod文件MySQL端口配置正确"
else
    check_warn ".env.prod文件MySQL端口配置需要检查"
fi

echo -e "\n6. 检查MySQL migrations文件..."
if [ -f "backend/migrations/001_create_tables_mysql.sql" ]; then
    check_pass "MySQL兼容的migrations文件已创建"
    
    if grep -q "AUTO_INCREMENT" backend/migrations/001_create_tables_mysql.sql; then
        check_pass "MySQL AUTO_INCREMENT语法正确"
    else
        check_fail "MySQL migrations文件缺少AUTO_INCREMENT"
    fi
    
    if grep -q "FULLTEXT" backend/migrations/001_create_tables_mysql.sql; then
        check_pass "MySQL全文搜索索引已配置"
    else
        check_warn "MySQL全文搜索索引可能需要检查"
    fi
else
    check_fail "MySQL migrations文件未找到"
fi

echo -e "\n7. 检查启动脚本..."
if grep -q "nc -z localhost 3306" start-dev.sh; then
    check_pass "启动脚本已更新MySQL检查"
else
    check_fail "启动脚本MySQL检查配置有误"
fi

if grep -q "pg_isready" start-dev.sh; then
    check_fail "启动脚本仍有PostgreSQL检查"
else
    check_pass "启动脚本PostgreSQL检查已移除"
fi

echo -e "\n8. 检查文档..."
if [ -f "MYSQL_SETUP.md" ]; then
    check_pass "MySQL安装配置文档已创建"
else
    check_fail "MySQL安装配置文档未找到"
fi

echo -e "\n9. 实际连接测试..."
if command -v nc &> /dev/null; then
    if nc -z localhost 3306 2>/dev/null; then
        check_pass "MySQL服务正在运行 (localhost:3306)"
        
        # 测试数据库连接（如果MySQL客户端可用）
        if command -v mysql &> /dev/null; then
            if [ -f ".env" ]; then
                DB_PASSWORD=$(grep "DB_PASSWORD=" .env | cut -d'=' -f2)
                DB_USER=$(grep "DB_USER=" .env | cut -d'=' -f2 | head -1)
                DB_NAME=$(grep "DB_NAME=" .env | cut -d'=' -f2 | head -1)
                
                if [ -n "$DB_PASSWORD" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
                    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null; then
                        check_pass "数据库连接测试成功"
                    else
                        check_warn "数据库连接失败，请检查凭据或创建数据库"
                    fi
                else
                    check_warn "无法从.env文件读取数据库配置"
                fi
            else
                check_warn ".env文件不存在，无法测试数据库连接"
            fi
        else
            check_warn "MySQL客户端未安装，跳过连接测试"
        fi
    else
        check_warn "MySQL服务未运行，请先启动MySQL"
    fi
else
    check_warn "nc命令不可用，跳过端口检查"
fi

echo -e "\n=================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 迁移验证通过！所有检查项目都正常。${NC}"
    echo -e "\n下一步操作："
    echo -e "1. 确保MySQL服务正在运行"
    echo -e "2. 创建数据库：${YELLOW}mysql -u root -p -e \"CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"${NC}"
    echo -e "3. 导入表结构：${YELLOW}mysql -u root -p blog_db < backend/migrations/001_create_tables_mysql.sql${NC}"
    echo -e "4. 配置.env文件中的数据库密码"
    echo -e "5. 启动应用：${YELLOW}./start-dev.sh${NC}"
else
    echo -e "${RED}❌ 发现 $ERRORS 个问题，请修复后重新运行验证。${NC}"
fi
echo "=================================="