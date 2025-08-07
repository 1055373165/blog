-- 种子数据脚本

-- 插入默认管理员用户
INSERT INTO users (email, name, password, is_admin) VALUES 
('admin@blog.com', '管理员', '$2a$10$N0HDPqPXOLLH2l6YBJHrzu9KlLJH7mKQ0pRY9U9dJf2VF7zPYGF5W', true)
ON CONFLICT (email) DO NOTHING;

-- 插入默认分类
INSERT INTO categories (name, slug, description) VALUES 
('技术分享', 'tech', '技术相关的文章和经验分享'),
('生活随笔', 'life', '生活中的感悟和随笔记录'),
('学习笔记', 'notes', '学习过程中的笔记和总结'),
('项目实战', 'projects', '实际项目开发经验和案例'),
('工具推荐', 'tools', '好用的工具和软件推荐')
ON CONFLICT (slug) DO NOTHING;

-- 插入子分类
INSERT INTO categories (name, slug, description, parent_id) VALUES 
('Go语言', 'golang', 'Go语言相关技术', (SELECT id FROM categories WHERE slug = 'tech')),
('React', 'react', 'React框架相关', (SELECT id FROM categories WHERE slug = 'tech')),
('数据库', 'database', '数据库技术和优化', (SELECT id FROM categories WHERE slug = 'tech')),
('前端开发', 'frontend', '前端开发技术', (SELECT id FROM categories WHERE slug = 'tech')),
('后端开发', 'backend', '后端开发技术', (SELECT id FROM categories WHERE slug = 'tech'))
ON CONFLICT (slug) DO NOTHING;

-- 插入默认标签
INSERT INTO tags (name, slug, color) VALUES 
('Go', 'go', '#00ADD8'),
('React', 'react', '#61DAFB'),
('TypeScript', 'typescript', '#3178C6'),
('JavaScript', 'javascript', '#F7DF1E'),
('Node.js', 'nodejs', '#339933'),
('PostgreSQL', 'postgresql', '#336791'),
('Docker', 'docker', '#2496ED'),
('Gin', 'gin', '#00ADD8'),
('GORM', 'gorm', '#00ADD8'),
('Vite', 'vite', '#646CFF'),
('Tailwind CSS', 'tailwindcss', '#06B6D4'),
('数据库', 'database', '#336791'),
('前端', 'frontend', '#FF6B6B'),
('后端', 'backend', '#4ECDC4'),
('全栈', 'fullstack', '#9B59B6'),
('教程', 'tutorial', '#E67E22'),
('实战', 'practice', '#27AE60'),
('总结', 'summary', '#F39C12'),
('经验', 'experience', '#E74C3C'),
('踩坑', 'pitfalls', '#8E44AD')
ON CONFLICT (slug) DO NOTHING;

-- 插入默认系列
INSERT INTO series (name, slug, description) VALUES 
('Go语言从入门到精通', 'go-tutorial', '完整的Go语言学习系列，从基础语法到高级特性'),
('React实战开发', 'react-practice', '基于React的实际项目开发经验分享'),
('博客系统开发日记', 'blog-development', '记录博客系统的开发过程和技术选型'),
('数据库优化实践', 'database-optimization', '数据库性能优化的实践经验'),
('全栈开发指南', 'fullstack-guide', '前后端一体化开发的完整指南')
ON CONFLICT (slug) DO NOTHING;

-- 插入示例文章
INSERT INTO articles (title, slug, excerpt, content, is_published, published_at, reading_time, author_id, category_id, series_id, series_order) VALUES 
(
    '欢迎来到我的博客',
    'welcome-to-my-blog',
    '这是博客的第一篇文章，介绍了博客的基本功能和使用方法。',
    '# 欢迎来到我的博客

欢迎大家来到我的个人博客！这个博客系统是使用现代化的技术栈开发的：

## 技术栈

### 后端
- **Go** + **Gin** 框架
- **PostgreSQL** 数据库
- **GORM** ORM框架
- **JWT** 身份认证
- **Bleve** 全文搜索

### 前端
- **React 18** + **TypeScript**
- **Vite** 构建工具
- **Tailwind CSS** 样式框架
- **React Query** 状态管理

## 主要功能

1. **文章管理** - 支持Markdown写作，代码高亮
2. **分类标签** - 多层级分类和标签系统
3. **全文搜索** - 智能搜索文章内容
4. **响应式设计** - 完美适配移动端

希望大家喜欢这个博客系统！',
    true,
    NOW(),
    5,
    (SELECT id FROM users WHERE email = 'admin@blog.com'),
    (SELECT id FROM categories WHERE slug = 'tech'),
    NULL,
    NULL
),
(
    'Go语言环境搭建指南',
    'go-setup-guide',
    '详细介绍如何在不同操作系统上安装和配置Go语言开发环境。',
    '# Go语言环境搭建指南

本文将详细介绍如何在Windows、macOS和Linux系统上安装和配置Go语言开发环境。

## 下载Go

访问Go官网 [https://golang.org/dl/](https://golang.org/dl/) 下载最新版本。

### Windows安装

1. 下载Windows安装程序（.msi文件）
2. 双击运行安装程序
3. 按照提示完成安装

### macOS安装

```bash
# 使用Homebrew安装
brew install go

# 或下载pkg文件手动安装
```

### Linux安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install golang-go

# CentOS/RHEL
sudo yum install golang
```

## 环境变量配置

### GOPATH和GOROOT

```bash
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$GOPATH/bin:$GOROOT/bin:$PATH
```

### 验证安装

```bash
go version
go env
```

## 第一个Go程序

创建`hello.go`文件：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

运行程序：

```bash
go run hello.go
```

恭喜！你已经成功搭建Go开发环境。',
    true,
    NOW() - INTERVAL '1 day',
    8,
    (SELECT id FROM users WHERE email = 'admin@blog.com'),
    (SELECT id FROM categories WHERE slug = 'golang'),
    (SELECT id FROM series WHERE slug = 'go-tutorial'),
    1
),
(
    'React Hooks最佳实践',
    'react-hooks-best-practices',
    '总结React Hooks的使用经验和最佳实践，帮助开发者写出更优雅的代码。',
    '# React Hooks最佳实践

React Hooks是React 16.8引入的新特性，让我们可以在函数组件中使用state和其他React特性。

## 基础Hooks

### useState

```jsx
import React, { useState } from ''react'';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

### useEffect

```jsx
import React, { useState, useEffect } from ''react'';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## 自定义Hooks

```jsx
import { useState, useEffect } from ''react'';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener(''resize'', handleResize);
    return () => window.removeEventListener(''resize'', handleResize);
  }, []);

  return width;
}
```

## 最佳实践

1. **遵循Hooks规则** - 只在最顶层调用Hooks
2. **合理分离关注点** - 将相关逻辑组织在一起
3. **自定义Hooks复用** - 抽取可复用的逻辑
4. **依赖数组优化** - 正确使用useEffect的依赖数组

希望这些实践经验对你有帮助！',
    true,
    NOW() - INTERVAL '2 days',
    12,
    (SELECT id FROM users WHERE email = 'admin@blog.com'),
    (SELECT id FROM categories WHERE slug = 'react'),
    (SELECT id FROM series WHERE slug = 'react-practice'),
    1
)
ON CONFLICT (slug) DO NOTHING;

-- 为文章添加标签
INSERT INTO article_tags (article_id, tag_id) VALUES
((SELECT id FROM articles WHERE slug = 'welcome-to-my-blog'), (SELECT id FROM tags WHERE slug = 'go')),
((SELECT id FROM articles WHERE slug = 'welcome-to-my-blog'), (SELECT id FROM tags WHERE slug = 'react')),
((SELECT id FROM articles WHERE slug = 'welcome-to-my-blog'), (SELECT id FROM tags WHERE slug = 'postgresql')),
((SELECT id FROM articles WHERE slug = 'go-setup-guide'), (SELECT id FROM tags WHERE slug = 'go')),
((SELECT id FROM articles WHERE slug = 'go-setup-guide'), (SELECT id FROM tags WHERE slug = 'tutorial')),
((SELECT id FROM articles WHERE slug = 'react-hooks-best-practices'), (SELECT id FROM tags WHERE slug = 'react')),
((SELECT id FROM articles WHERE slug = 'react-hooks-best-practices'), (SELECT id FROM tags WHERE slug = 'javascript')),
((SELECT id FROM articles WHERE slug = 'react-hooks-best-practices'), (SELECT id FROM tags WHERE slug = 'frontend'))
ON CONFLICT DO NOTHING;

-- 插入基本配置
INSERT INTO configs (key, value, type, description) VALUES
('site_title', '我的技术博客', 'string', '网站标题'),
('site_description', '分享技术、记录成长', 'string', '网站描述'),
('site_keywords', 'Go,React,技术博客,全栈开发', 'string', '网站关键词'),
('posts_per_page', '10', 'int', '每页文章数量'),
('allow_comments', 'true', 'bool', '是否允许评论'),
('search_enabled', 'true', 'bool', '是否启用搜索功能'),
('maintenance_mode', 'false', 'bool', '维护模式'),
('theme', 'default', 'string', '当前主题')
ON CONFLICT (key) DO NOTHING;