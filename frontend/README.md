# 博客系统前端

这是一个基于 React + TypeScript + Vite + Tailwind CSS 的现代化博客前端系统。

## 功能特性

- ✅ **文章管理** - 完整的文章CRUD功能
- ✅ **Markdown编辑器** - 实时预览、语法高亮、工具栏
- ✅ **高级搜索** - 全文搜索、筛选、搜索建议、保存搜索
- ✅ **分类标签** - 完整的分类和标签系统
- ✅ **管理后台** - 功能完整的后台管理界面
- ✅ **响应式设计** - 支持桌面端和移动端
- ✅ **深色模式** - 自动切换深色/浅色主题
- ✅ **图片上传** - 拖拽上传、进度显示
- ✅ **SEO优化** - 完整的SEO meta信息管理

## 快速开始

### 1. 安装依赖

```bash
yarn install
```

### 2. 启动开发服务器

```bash
yarn dev
```

项目将在 `http://localhost:5173` 启动

### 3. 构建生产版本

```bash
yarn build
```

## 主要功能

### 前台页面
- `/` - 首页，展示最新文章
- `/search` - 高级搜索页面
- `/article/:slug` - 文章详情页

### 管理后台
- `/admin` - 管理首页
- `/admin/articles` - 文章管理
- `/admin/articles/new` - 新建文章（Markdown编辑器）
- `/admin/articles/:id/edit` - 编辑文章

## 技术栈

- React 19 + TypeScript
- Vite + Tailwind CSS
- React Router + React Query
- MDEditor + React Markdown

## 注意事项

当前版本是前端界面，需要配合后端API使用。后端API地址配置在环境变量 `VITE_API_BASE_URL` 中。
