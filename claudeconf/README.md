# Blog 一键部署配置文件

这个目录包含了 Blog 项目在腾讯云 Ubuntu 服务器上一键部署所需的所有配置文件和脚本。

## 文件说明

### 主要脚本
- `deploy-tencent.sh` - 主部署脚本，从零开始配置整个服务器环境
- `update.sh` - 项目更新脚本，用于代码更新和滚动部署
- `backup.sh` - 备份脚本，定时备份数据库和文件
- `monitor.sh` - 监控脚本，实时监控系统健康状态

### 配置文件
- `.env.prod.template` - 生产环境配置模板
- `docker-compose.production.yml` - 生产环境 Docker Compose 配置
- `nginx.conf` - Nginx 主配置文件
- `default.conf` - Nginx 站点配置文件
- `redis.conf` - Redis 配置文件
- `my.cnf` - MySQL 配置文件
- `init-db.sql` - 数据库初始化 SQL 脚本

### 系统服务
- `blog.service` - Blog 应用系统服务
- `blog-backup.service` - 备份服务
- `blog-backup.timer` - 备份定时器
- `blog-monitor.service` - 监控服务

## 使用方法

### 1. 首次部署

```bash
# 1. 将整个项目上传到服务器
scp -r /path/to/blog root@your-server:/opt/

# 2. 登录服务器
ssh root@your-server

# 3. 进入项目目录
cd /opt/blog

# 4. 给部署脚本执行权限
chmod +x claudeconf/deploy-tencent.sh

# 5. 运行一键部署
./claudeconf/deploy-tencent.sh
```

### 2. 代码更新

```bash
# 进入项目目录
cd /opt/blog/source

# 更新到最新版本
./claudeconf/update.sh

# 强制重新构建
./claudeconf/update.sh --force

# 更新指定分支
./claudeconf/update.sh --branch develop
```

### 3. 备份管理

```bash
# 手动执行备份
./claudeconf/backup.sh

# 查看备份文件
ls -la /opt/blog/data/backups/

# 检查备份服务状态
systemctl status blog-backup.timer
```

### 4. 监控管理

```bash
# 查看监控服务状态
systemctl status blog-monitor

# 查看监控日志
tail -f /opt/blog/logs/monitor.log

# 执行一次性健康检查
./claudeconf/monitor.sh --once
```

## 服务管理

### 启动/停止服务
```bash
# 启动 Blog 服务
systemctl start blog

# 停止 Blog 服务
systemctl stop blog

# 重启 Blog 服务
systemctl restart blog

# 查看服务状态
systemctl status blog
```

### 启用/禁用自动启动
```bash
# 启用开机自启
systemctl enable blog
systemctl enable blog-backup.timer
systemctl enable blog-monitor

# 禁用开机自启
systemctl disable blog
systemctl disable blog-backup.timer
systemctl disable blog-monitor
```

## 目录结构

部署完成后的目录结构：

```
/opt/blog/
├── source/                 # 项目源代码
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.prod.yml
│   └── .env.prod
├── data/                   # 数据目录
│   ├── uploads/            # 上传文件
│   ├── search_index/       # 搜索索引
│   ├── mysql/              # MySQL 数据
│   ├── redis/              # Redis 数据
│   └── backups/            # 备份文件
├── logs/                   # 日志目录
│   ├── nginx/              # Nginx 日志
│   ├── app/                # 应用日志
│   └── mysql/              # MySQL 日志
├── config/                 # 配置目录
│   ├── nginx/              # Nginx 配置
│   ├── ssl/                # SSL 证书
│   └── deployment_info.txt # 部署信息
└── scripts/                # 脚本目录
    ├── backup.sh
    ├── monitor.sh
    └── update.sh
```

## 重要配置项

### 环境变量
在 `.env.prod` 文件中配置以下重要参数：
- `DB_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT 密钥
- `REDIS_PASSWORD` - Redis 密码
- `API_BASE_URL` - API 基础 URL

### 域名配置
在以下文件中修改域名设置：
- `deploy-tencent.sh` 中的 `DOMAIN` 变量
- `default.conf` 中的 `server_name`
- `.env.prod` 中的 `API_BASE_URL`

### SSL 证书
- 脚本会自动生成自签名证书
- 生产环境建议替换为真实的 SSL 证书
- 证书路径：`/opt/blog/config/ssl/`

## 常用命令

### Docker 相关
```bash
# 查看容器状态
docker compose -f docker-compose.prod.yml ps

# 查看容器日志
docker compose -f docker-compose.prod.yml logs -f

# 重启特定服务
docker compose -f docker-compose.prod.yml restart backend

# 进入容器
docker exec -it blog_backend_prod bash
```

### 数据库相关
```bash
# 连接数据库
mysql -u root -p blog_db

# 查看数据库状态
systemctl status mysql

# 备份数据库
mysqldump -u root -p blog_db > backup.sql
```

### 日志查看
```bash
# 查看部署日志
tail -f /var/log/blog-deploy.log

# 查看应用日志
tail -f /opt/blog/logs/app/app.log

# 查看 Nginx 日志
tail -f /opt/blog/logs/nginx/access.log
```

## 故障排除

### 常见问题

1. **容器无法启动**
   ```bash
   # 检查容器日志
   docker compose -f docker-compose.prod.yml logs backend
   
   # 检查端口占用
   netstat -tlnp | grep :3001
   ```

2. **数据库连接失败**
   ```bash
   # 检查 MySQL 服务
   systemctl status mysql
   
   # 检查数据库连接
   mysql -u root -p -e "SELECT 1;"
   ```

3. **SSL 证书问题**
   ```bash
   # 重新生成证书
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /opt/blog/config/ssl/privkey.pem \
     -out /opt/blog/config/ssl/fullchain.pem
   ```

4. **磁盘空间不足**
   ```bash
   # 检查磁盘使用
   df -h
   
   # 清理 Docker 镜像
   docker system prune -f
   
   # 清理旧备份
   find /opt/blog/data/backups -mtime +30 -delete
   ```

### 紧急恢复

如果服务出现严重问题，可以使用以下步骤恢复：

1. **停止所有服务**
   ```bash
   docker compose -f docker-compose.prod.yml down
   systemctl stop nginx mysql
   ```

2. **从最新备份恢复**
   ```bash
   # 恢复数据库
   zcat /opt/blog/data/backups/database/latest.sql.gz | mysql -u root -p blog_db
   
   # 恢复文件
   tar -xzf /opt/blog/data/backups/uploads/latest.tar.gz -C /opt/blog/data/
   ```

3. **重新启动服务**
   ```bash
   systemctl start mysql
   docker compose -f docker-compose.prod.yml up -d
   systemctl start nginx
   ```

## 安全建议

1. **定期更新系统**
   ```bash
   apt update && apt upgrade -y
   ```

2. **修改默认密码**
   - 修改 MySQL root 密码
   - 修改应用数据库密码
   - 修改 Redis 密码
   - 修改 JWT 密钥

3. **配置防火墙**
   ```bash
   ufw enable
   ufw allow ssh
   ufw allow 80/tcp
   ufw allow 443/tcp
   ```

4. **启用日志监控**
   - 定期检查访问日志
   - 监控异常登录尝试
   - 设置磁盘空间告警

5. **备份策略**
   - 每日自动备份数据库
   - 每周备份完整文件
   - 定期测试恢复流程

## 性能优化

1. **数据库优化**
   - 调整 MySQL 缓冲区大小
   - 启用查询缓存
   - 定期优化表结构

2. **缓存优化**
   - 调整 Redis 内存限制
   - 配置适当的过期策略
   - 启用 Nginx 缓存

3. **系统优化**
   - 调整文件描述符限制
   - 优化内核参数
   - 配置 swap 空间

## 联系支持

如果遇到问题，请检查：
1. 部署日志：`/var/log/blog-deploy.log`
2. 应用日志：`/opt/blog/logs/`
3. 系统日志：`/var/log/syslog`

或联系技术支持团队。