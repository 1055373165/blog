# CI/CD 部署指南

推送到 `main` 分支后，GitHub Actions 自动构建 Docker 镜像并部署到服务器。  
服务器**不再需要 `git pull`**，只需拉取预构建的镜像。

## 架构

```
push main → GitHub Actions
  ├─ 构建 frontend Docker 镜像 → ghcr.io
  ├─ 构建 backend  Docker 镜像 → ghcr.io
  └─ SSH 到服务器
       ├─ docker compose pull
       └─ docker compose up -d
```

## 一、配置 GitHub Secrets

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret 名称          | 说明                                    | 示例                           |
|----------------------|----------------------------------------|-------------------------------|
| `SERVER_HOST`        | 服务器 IP 或域名                         | `1.2.3.4`                     |
| `SERVER_USER`        | SSH 用户名                              | `root`                        |
| `SSH_PRIVATE_KEY`    | SSH 私钥（完整内容，包括 BEGIN/END 行）     | `-----BEGIN OPENSSH...`       |
| `VITE_API_BASE_URL`  | 前端 API 地址                            | `https://www.godepth.top/api` |
| `GHCR_PAT`          | GitHub Personal Access Token（`read:packages` 权限） | `ghp_xxxx`              |

### 生成 GHCR_PAT

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 **Generate new token (classic)**
3. 勾选 `read:packages` 和 `write:packages` 权限
4. 生成后复制，添加到仓库 Secrets 中作为 `GHCR_PAT`

## 二、服务器初始化（只需执行一次）

服务器项目已在 `/root/blog`，`.env.prod` 已存在，只需确认以下几项：

```bash
# 1. 确认目录存在
mkdir -p ~/blog_assets/uploads ~/blog_assets/search_index

# 2. 确认 .env.prod 存在
cat ~/blog/.env.prod

# 3. 测试 GHCR 登录
echo "你的GHCR_PAT" | docker login ghcr.io -u 1055373165 --password-stdin
```

## 三、手动部署（可选）

如果需要手动部署而不通过 CI：

```bash
cd ~/blog

# 拉取最新镜像
docker compose pull

# 重启服务
docker compose up -d --remove-orphans

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f --tail=50
```

## 四、回滚

```bash
cd ~/blog

# 使用特定 commit SHA 的镜像
export FRONTEND_IMAGE=ghcr.io/1055373165/blog-frontend:abc1234
export BACKEND_IMAGE=ghcr.io/1055373165/blog-backend:abc1234
docker compose up -d
```

## 五、GitHub Actions 手动触发

除了 push 自动触发，也可以手动运行：  
仓库 → Actions → Build & Deploy → Run workflow
