# 博客系统部署指南

## 部署到阿里云服务器 (Ubuntu 22.04)

### 1. 服务器准备

确保你的阿里云服务器满足以下要求：
- 操作系统: Ubuntu 22.04 x86_64
- 内存: 最少 2GB (推荐 4GB+)
- 存储: 最少 20GB (推荐 40GB+)
- 域名: 已解析到服务器IP (`www.godepth.top`)

### 2. 快速部署

```bash
# 1. 登录服务器
ssh your_user@your_server_ip

# 2. 克隆项目到服务器
git clone <your-repo-url> /tmp/blog
cd /tmp/blog

# 3. 移动到部署目录
sudo mkdir -p /opt
sudo mv /tmp/blog /opt/blog
sudo chown -R $USER:$USER /opt/blog
cd /opt/blog

# 4. 配置环境变量
cp .env.prod .env.prod.backup
nano .env.prod

# 必须修改以下配置:
# POSTGRES_PASSWORD=your_strong_postgres_password_here
# REDIS_PASSWORD=your_strong_redis_password_here  
# JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long

# 5. 修改部署脚本中的邮箱地址
nano deploy.sh
# 找到这行: EMAIL="your-email@example.com"
# 修改为你的邮箱地址用于SSL证书通知

# 6. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 3. 部署过程说明

部署脚本会自动完成以下操作：

#### 系统环境
- ✅ 检查Ubuntu 22.04系统
- ✅ 安装Docker和Docker Compose  
- ✅ 安装必要依赖 (git, curl, wget等)

#### 安全配置
- ✅ 配置UFW防火墙 (开放80/443/22端口)
- ✅ 配置Fail2ban防暴力破解
- ✅ 生成SSL证书 (Let's Encrypt)
- ✅ 设置证书自动续期

#### 应用部署
- ✅ 创建项目目录结构
- ✅ 构建Docker镜像
- ✅ 启动所有服务 (Nginx, 前端, 后端, PostgreSQL, Redis)
- ✅ 配置反向代理和SSL

#### 运维配置
- ✅ 设置日志轮转
- ✅ 配置自动备份 (每天2点)
- ✅ 设置服务监控 (每5分钟)

### 4. 验证部署

部署完成后，访问以下地址验证：

- 🌐 **网站首页**: https://www.godepth.top
- ⚙️ **管理后台**: https://www.godepth.top/admin
- 🔍 **API健康检查**: https://www.godepth.top/api/health

### 5. 管理命令

```bash
# 进入项目目录
cd /opt/blog

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重新部署
./update.sh

# 查看系统资源使用
docker stats

# 进入容器调试
docker exec -it blog_backend_prod /bin/sh
docker exec -it blog_postgres_prod psql -U blog_user -d blog_db
```

### 6. 文件结构

```
/opt/blog/
├── backend/                 # 后端Go代码
├── frontend/               # 前端React代码
├── docker/                 # Docker配置
│   └── nginx/
│       ├── nginx.prod.conf
│       ├── conf.d/
│       └── ssl/            # SSL证书
├── data/                   # 持久化数据
│   ├── uploads/           # 上传文件
│   └── search_index/      # 搜索索引
├── logs/                  # 日志文件
│   ├── nginx/
│   └── app/
├── docker-compose.prod.yml # 生产环境Docker配置
├── .env.prod             # 环境变量
├── deploy.sh            # 部署脚本
├── update.sh            # 更新脚本
└── DEPLOYMENT.md        # 部署文档
```

### 7. 备份和恢复

#### 自动备份
- 数据库每天凌晨2点自动备份
- 备份保存在 `/opt/backups/`
- 自动清理7天前的备份

#### 手动备份
```bash
# 备份数据库
docker exec blog_postgres_prod pg_dump -U blog_user -d blog_db > backup.sql

# 备份上传文件  
tar -czf uploads_backup.tar.gz -C /opt/blog/data uploads/

# 备份配置文件
cp /opt/blog/.env.prod /opt/blog/docker-compose.prod.yml ~/config_backup/
```

#### 恢复备份
```bash
# 恢复数据库
docker exec -i blog_postgres_prod psql -U blog_user -d blog_db < backup.sql

# 恢复上传文件
tar -xzf uploads_backup.tar.gz -C /opt/blog/data/
```

### 8. 故障排除

#### 常见问题

**1. 域名无法访问**
```bash
# 检查域名解析
dig www.godepth.top

# 检查防火墙状态  
sudo ufw status

# 检查Nginx状态
docker-compose -f docker-compose.prod.yml logs nginx
```

**2. SSL证书问题**
```bash
# 手动更新证书
sudo certbot renew

# 检查证书有效期
openssl x509 -in /opt/blog/docker/nginx/ssl/fullchain.pem -text -noout
```

**3. 数据库连接问题**
```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml logs postgres

# 进入数据库容器
docker exec -it blog_postgres_prod psql -U blog_user -d blog_db
```

**4. 服务启动失败**
```bash
# 查看详细日志
docker-compose -f docker-compose.prod.yml logs

# 检查容器状态
docker ps -a

# 重新构建
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 9. 性能优化

#### 系统优化
```bash
# 调整系统参数
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'net.core.somaxconn=65535' | sudo tee -a /etc/sysctl.conf

# 应用配置
sudo sysctl -p
```

#### 监控
```bash
# 查看系统资源
htop
df -h
free -h

# 查看Docker资源使用
docker stats

# 查看服务状态
systemctl status docker
systemctl status fail2ban
```

### 10. 安全建议

- ✅ 定期更新系统补丁
- ✅ 修改SSH默认端口
- ✅ 禁用root登录
- ✅ 使用密钥登录
- ✅ 定期检查日志
- ✅ 监控服务状态
- ✅ 备份重要数据

### 11. 更新部署

```bash
cd /opt/blog

# 拉取最新代码
git pull origin main

# 使用更新脚本
./update.sh

# 或手动更新
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache  
docker-compose -f docker-compose.prod.yml up -d
```

### 12. 联系支持

如果遇到问题，请检查：
1. 服务日志: `/opt/blog/logs/`
2. 系统日志: `/var/log/blog-deploy.log`
3. Docker状态: `docker-compose ps`

---

**🎉 部署完成后记得:**
1. 修改默认密码
2. 配置管理员账户  
3. 测试所有功能
4. 设置定期备份检查