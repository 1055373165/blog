# MySQL安装和配置指南

## 系统要求

- MySQL 8.0 或更高版本
- 至少 1GB 可用内存
- 足够的磁盘空间用于数据存储

## 安装MySQL

### Ubuntu/Debian系统

```bash
# 更新包管理器
sudo apt update

# 安装MySQL服务器
sudo apt install mysql-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 运行安全配置向导
sudo mysql_secure_installation
```

### CentOS/RHEL系统

```bash
# 安装MySQL仓库
sudo yum install mysql-server

# 启动MySQL服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 查找临时root密码
sudo grep 'temporary password' /var/log/mysqld.log

# 运行安全配置向导
sudo mysql_secure_installation
```

### macOS系统

```bash
# 使用Homebrew安装
brew install mysql

# 启动MySQL服务
brew services start mysql

# 或者手动启动
mysql.server start
```

### Windows系统

1. 从[MySQL官网](https://dev.mysql.com/downloads/mysql/)下载MySQL安装程序
2. 运行安装程序，选择"Developer Default"配置
3. 设置root密码
4. 启动MySQL服务

## 数据库配置

### 1. 连接到MySQL

```bash
mysql -u root -p
```

### 2. 创建博客数据库

```sql
-- 创建数据库
CREATE DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（可选，也可以使用root）
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授予权限
GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';
FLUSH PRIVILEGES;

-- 查看数据库
SHOW DATABASES;

-- 退出MySQL
EXIT;
```

### 3. 导入数据库结构

```bash
# 使用MySQL兼容的migrations文件
mysql -u root -p blog_db < backend/migrations/001_create_tables_mysql.sql
```

### 4. 验证数据库结构

```sql
-- 连接到博客数据库
mysql -u root -p blog_db

-- 查看所有表
SHOW TABLES;

-- 查看表结构示例
DESCRIBE articles;
DESCRIBE users;

-- 检查索引
SHOW INDEX FROM articles;
```

## 环境配置

### 1. 配置.env文件

```bash
# 复制并编辑环境配置文件
cp .env.example .env
```

编辑 `.env` 文件，确保数据库配置正确：

```env
# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=blog_db
DB_TIMEZONE=Asia/Shanghai

# 其他配置...
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

### 2. 配置生产环境

编辑 `.env.prod` 文件：

```env
# MySQL数据库配置（生产环境）
DB_USER=root
DB_PASSWORD=your_production_mysql_password
DB_NAME=blog_db
DB_HOST=localhost
DB_PORT=3306
DB_TIMEZONE=Asia/Shanghai

# 其他生产环境配置...
JWT_SECRET=your_production_jwt_secret
REDIS_PASSWORD=your_redis_password
```

## 性能优化建议

### 1. MySQL配置优化

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf` (Ubuntu) 或 `/etc/my.cnf` (CentOS):

```ini
[mysqld]
# 基本配置
max_connections = 200
max_connect_errors = 10000
table_open_cache = 2000
max_allowed_packet = 16M

# InnoDB配置
innodb_buffer_pool_size = 1G  # 根据可用内存调整
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M
innodb_flush_log_at_trx_commit = 1

# 查询缓存
query_cache_type = 1
query_cache_size = 128M

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 时区
default-time-zone = '+08:00'
```

重启MySQL服务：

```bash
sudo systemctl restart mysql
```

### 2. 数据库索引优化

已在migrations文件中包含了优化的索引，包括：
- 主键和外键索引
- 查询频繁字段的索引
- 全文搜索索引
- 复合索引

## 备份和恢复

### 1. 数据备份

```bash
# 创建备份脚本
cat > backup_blog_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u root -p blog_db > $BACKUP_DIR/blog_db_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/blog_db_$DATE.sql

# 删除7天前的备份
find $BACKUP_DIR -name "blog_db_*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/blog_db_$DATE.sql.gz"
EOF

chmod +x backup_blog_db.sh
```

### 2. 设置定时备份

```bash
# 添加到crontab，每天凌晨2点备份
crontab -e

# 添加以下行
0 2 * * * /path/to/backup_blog_db.sh >> /var/log/backup.log 2>&1
```

### 3. 数据恢复

```bash
# 从备份恢复数据库
gunzip blog_db_20241213_020000.sql.gz
mysql -u root -p blog_db < blog_db_20241213_020000.sql
```

## 故障排除

### 常见问题

1. **连接被拒绝**
   ```bash
   # 检查MySQL服务状态
   sudo systemctl status mysql
   
   # 检查端口是否开放
   netstat -tlnp | grep 3306
   ```

2. **权限问题**
   ```sql
   -- 重新授予权限
   GRANT ALL PRIVILEGES ON blog_db.* TO 'blog_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **字符集问题**
   ```sql
   -- 检查数据库字符集
   SHOW CREATE DATABASE blog_db;
   
   -- 修改字符集
   ALTER DATABASE blog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **性能问题**
   ```sql
   -- 查看慢查询日志
   SHOW VARIABLES LIKE 'slow_query_log';
   
   -- 启用慢查询日志
   SET GLOBAL slow_query_log = 'ON';
   SET GLOBAL long_query_time = 2;
   ```

### 监控命令

```bash
# 查看MySQL进程
mysqladmin -u root -p processlist

# 查看数据库状态
mysqladmin -u root -p status

# 查看变量配置
mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb%'"
```

## 迁移检查清单

- [ ] MySQL 8.0+ 已安装并运行
- [ ] blog_db 数据库已创建
- [ ] 数据库表结构已导入
- [ ] .env 文件已正确配置
- [ ] 应用程序可以连接到MySQL
- [ ] 全文搜索功能正常
- [ ] 备份策略已设置
- [ ] 性能优化已配置

## 联系和支持

如果在安装配置过程中遇到问题，请：
1. 检查MySQL错误日志：`sudo tail -f /var/log/mysql/error.log`
2. 确认防火墙设置允许3306端口
3. 验证.env文件中的数据库凭据
4. 查看应用程序日志获取详细错误信息