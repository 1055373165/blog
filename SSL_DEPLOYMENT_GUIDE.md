# SSL证书部署与验证指南

## 📋 部署前检查清单

### ✅ 已完成配置
- [x] SSL证书文件已正确放置在 `/config/ssl/` 目录
- [x] Docker容器SSL映射路径已修复
- [x] Nginx SSL配置已优化
- [x] HTTP到HTTPS重定向已配置
- [x] 安全头配置已加强
- [x] DH参数文件已生成

### 📁 证书文件结构
```
config/ssl/
├── fullchain.pem    # SSL证书链（由godepth.top_bundle.pem复制）
├── privkey.pem      # 私钥文件（由godepth.top.key复制）
└── dhparam.pem      # DH参数文件（新生成）
```

### 🔧 关键配置修复

#### 1. Docker映射路径
```yaml
# docker-compose.prod.yml 中的正确映射
volumes:
  - ./config/ssl:/etc/nginx/ssl:ro  # 映射ssl目录，非conf.d
```

#### 2. 证书文件名标准化
- `godepth.top_bundle.pem` → `fullchain.pem`
- `godepth.top.key` → `privkey.pem`

#### 3. SSL安全配置增强
- 启用TLS 1.2和1.3
- 优化加密套件
- 启用SSL Stapling
- 添加DH参数

## 🚀 部署步骤

### 1. 停止当前服务
```bash
cd /Users/smy/project/newblog/blog
./stop-server.sh
```

### 2. 构建并启动服务
```bash
# 使用生产配置启动
./start-prod.sh
```

### 3. 验证容器启动状态
```bash
docker-compose -f docker-compose.prod.yml ps
```

## 🔍 SSL验证方法

### 1. 本地证书验证
```bash
# 验证证书文件完整性
openssl x509 -in config/ssl/fullchain.pem -text -noout | grep -E "(Subject:|Not Before|Not After|DNS:)"

# 验证私钥匹配
openssl rsa -in config/ssl/privkey.pem -check -noout
```

### 2. HTTPS连接测试
```bash
# 测试HTTPS连接
curl -I https://godepth.top/health
curl -I http://www.godepth.top/health

# 验证HTTP重定向
curl -I http://godepth.top/health
curl -I http://www.godepth.top/health
```

### 3. SSL配置质量测试
```bash
# 使用SSL Labs测试（在线工具）
# https://www.ssllabs.com/ssltest/analyze.html?d=godepth.top

# 本地SSL测试工具
nmap --script ssl-enum-ciphers -p 443 godepth.top
```

### 4. 浏览器验证
1. 访问 https://godepth.top
2. 检查地址栏显示安全锁图标
3. 点击锁图标查看证书详情
4. 确认证书有效期：2025-08-12 到 2025-11-09

### 5. HTTP重定向验证
1. 访问 http://godepth.top
2. 确认自动重定向到 https://godepth.top
3. 检查地址栏URL变更

## 🛠️ 故障排除

### 证书错误问题
```bash
# 检查Nginx错误日志
docker-compose -f docker-compose.prod.yml logs nginx

# 检查SSL文件权限
ls -la config/ssl/

# 验证Nginx配置语法
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

### 常见问题解决

#### 问题1: "SSL certificate not found"
**原因**: 证书文件路径不正确
**解决**: 确认文件存在于 `config/ssl/` 目录

#### 问题2: "SSL handshake failed"
**原因**: 证书与私钥不匹配
**解决**: 重新验证证书和私钥对应关系

#### 问题3: "Certificate expired"
**原因**: 证书已过期
**解决**: 更新SSL证书文件

#### 问题4: "Connection timed out"
**原因**: 防火墙阻止443端口
**解决**: 确保443端口开放

## 📊 证书信息

- **域名**: godepth.top, www.godepth.top
- **证书颁发机构**: TrustAsia DV TLS RSA CA 2025
- **有效期**: 2025-08-12 至 2025-11-09
- **证书类型**: DV (域名验证)
- **加密算法**: RSA 2048位

## 🔒 安全配置特性

- **TLS版本**: 仅支持TLS 1.2和1.3
- **HSTS**: 启用2年有效期
- **安全头**: X-Frame-Options, X-Content-Type-Options等
- **SSL Stapling**: 启用OCSP装订
- **完美前向保密**: 支持PFS加密套件
- **DH参数**: 2048位自定义参数

## 📈 性能优化

- **SSL会话缓存**: 10MB共享缓存
- **Keep-Alive**: 启用连接复用
- **GZIP压缩**: 启用静态资源压缩
- **缓存控制**: 静态资源1年缓存

## 🔄 证书更新流程

当证书即将过期时（建议提前30天）：

1. **获取新证书**
   ```bash
   # 备份旧证书
   cp config/ssl/fullchain.pem config/ssl/fullchain.pem.backup
   cp config/ssl/privkey.pem config/ssl/privkey.pem.backup
   ```

2. **更新证书文件**
   ```bash
   # 替换新证书
   cp new_certificate.pem config/ssl/fullchain.pem
   cp new_private.key config/ssl/privkey.pem
   ```

3. **重启服务**
   ```bash
   # 重新加载Nginx配置
   docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

4. **验证更新**
   ```bash
   # 验证新证书
   openssl x509 -in config/ssl/fullchain.pem -text -noout | grep "Not After"
   ```

## 📞 支持联系

如遇到SSL配置问题：
1. 检查本指南的故障排除部分
2. 查看Nginx错误日志
3. 验证证书文件完整性
4. 确认Docker容器网络连通性

---
**最后更新**: 2025-08-29
**配置状态**: ✅ 生产就绪