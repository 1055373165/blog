# 现代极简博客系统

一个专注于强大分类和搜索功能的个人博客系统。

## 功能特色

### 🎯 核心功能
- **强大的分类系统**: 多层级分类、标签云、系列文章管理
- **智能搜索**: 全文搜索、高级筛选、相关文章推荐
- **现代化设计**: 极简风格、响应式布局、深色模式
- **优秀的阅读体验**: Markdown支持、代码高亮、阅读进度

### 📚 分类和搜索能力
- 多维度分类：主分类 → 子分类 → 标签
- 全文搜索：支持标题、内容、摘要搜索
- 高级筛选：分类+标签+时间+阅读量等组合筛选
- 智能推荐：基于内容相似度的相关文章推荐
- 搜索统计：热门搜索词和文章阅读统计

## 技术架构

```
blog/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Node.js + Express + TypeScript
├── docker/            # Docker 配置文件
├── docs/              # 项目文档
└── README.md          # 项目说明
```

### 技术栈
- **前端**: React 18, TypeScript, Vite, Tailwind CSS
- **后端**: Node.js, Express, TypeScript, Prisma ORM  
- **数据库**: PostgreSQL, Redis
- **部署**: Docker, Docker Compose, Nginx

## 🚀 快速开始

### 一键启动（推荐）

```bash
# 确保Docker已运行，然后执行：
./start-dev.sh
```

脚本会自动：
- 启动PostgreSQL和Redis数据库
- 安装依赖并启动后端服务 (端口 3001)
- 安装依赖并启动前端服务 (端口 3000)

### 手动启动

#### 开发环境要求
- Node.js >= 18
- Go >= 1.21
- PostgreSQL >= 14
- Redis >= 6 (可选)
- Docker & Docker Compose

#### 1. 启动数据库服务
```bash
# 使用Docker启动数据库
docker-compose up -d postgres redis
```

#### 2. 配置环境变量
```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 根据需要修改配置
```

#### 3. 启动后端服务
```bash
cd backend
make deps    # 安装Go依赖
make dev     # 启动开发服务器
```

#### 4. 启动前端服务
```bash
cd frontend
npm install  # 安装依赖
npm run dev  # 启动开发服务器
```

### 生产部署

```bash
# 构建和启动所有服务
docker-compose --profile production up -d

# 查看服务状态
docker-compose ps
```

### 服务地址

- 🎨 **前端**: http://localhost:3000
- 🔧 **后端API**: http://localhost:3001
- 🗄️ **数据库**: localhost:5432
- 🔴 **Redis**: localhost:6379

### 默认账户

- **管理员**: admin@blog.com / password

## 项目进展

- [x] 项目结构搭建
- [ ] 后端API开发
- [ ] 前端界面开发
- [ ] 搜索功能实现
- [ ] 部署配置

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License