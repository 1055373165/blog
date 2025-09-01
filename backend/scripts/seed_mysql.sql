-- 种子数据脚本 (MySQL版本)

-- 插入默认管理员用户
INSERT IGNORE INTO users (email, name, password, is_admin) VALUES 
('admin@blog.com', '管理员', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true);

-- 插入默认分类
INSERT IGNORE INTO categories (name, slug, description) VALUES 
('技术分享', 'tech', '技术相关的文章和经验分享'),
('生活随笔', 'life', '生活中的感悟和随笔记录'),
('学习笔记', 'notes', '学习过程中的笔记和总结'),
('项目实战', 'projects', '实际项目开发经验和案例'),
('工具推荐', 'tools', '好用的工具和软件推荐');

-- 插入子分类 (分步执行以避免MySQL的子查询限制)
SET @tech_id = (SELECT id FROM categories WHERE slug = 'tech');
INSERT IGNORE INTO categories (name, slug, description, parent_id) VALUES 
('Go语言', 'golang', 'Go语言相关技术', @tech_id),
('React', 'react', 'React框架相关', @tech_id),
('数据库', 'database', '数据库技术和优化', @tech_id),
('前端开发', 'frontend', '前端开发技术', @tech_id),
('后端开发', 'backend', '后端开发技术', @tech_id);

-- 插入默认标签
INSERT IGNORE INTO tags (name, slug, color) VALUES 
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
('踩坑', 'pitfalls', '#8E44AD');

-- 插入默认系列
INSERT IGNORE INTO series (name, slug, description) VALUES 
('Go语言从入门到精通', 'go-tutorial', '完整的Go语言学习系列，从基础语法到高级特性'),
('React实战开发', 'react-practice', '基于React的实际项目开发经验分享'),
('博客系统开发日记', 'blog-development', '记录博客系统的开发过程和技术选型'),
('数据库优化实践', 'database-optimization', '数据库性能优化的实践经验'),
('全栈开发指南', 'fullstack-guide', '前后端一体化开发的完整指南');

-- 插入示例文章
-- 获取必要的ID
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@blog.com');
SET @tech_cat_id = (SELECT id FROM categories WHERE slug = 'tech');
SET @golang_cat_id = (SELECT id FROM categories WHERE slug = 'golang');
SET @react_cat_id = (SELECT id FROM categories WHERE slug = 'react');
SET @go_series_id = (SELECT id FROM series WHERE slug = 'go-tutorial');
SET @react_series_id = (SELECT id FROM series WHERE slug = 'react-practice');

INSERT IGNORE INTO articles (title, slug, excerpt, content, is_published, published_at, reading_time, author_id, category_id, series_id, series_order) VALUES 
(
    '欢迎来到我的博客',
    'welcome-to-my-blog',
    '这是博客的第一篇文章，介绍了博客的基本功能和使用方法。',
    '# 欢迎来到我的博客\n\n欢迎大家来到我的个人博客！这个博客系统是使用现代化的技术栈开发的：\n\n## 技术栈\n\n### 后端\n- **Go** + **Gin** 框架\n- **PostgreSQL** 数据库\n- **GORM** ORM框架\n- **JWT** 身份认证\n- **Bleve** 全文搜索\n\n### 前端\n- **React 18** + **TypeScript**\n- **Vite** 构建工具\n- **Tailwind CSS** 样式框架\n- **React Query** 状态管理\n\n## 主要功能\n\n1. **文章管理** - 支持Markdown写作，代码高亮\n2. **分类标签** - 多层级分类和标签系统\n3. **全文搜索** - 智能搜索文章内容\n4. **响应式设计** - 完美适配移动端\n\n希望大家喜欢这个博客系统！',
    true,
    NOW(),
    5,
    @admin_id,
    @tech_cat_id,
    NULL,
    NULL
),
(
    'Go语言环境搭建指南',
    'go-setup-guide',
    '详细介绍如何在不同操作系统上安装和配置Go语言开发环境。',
    '# Go语言环境搭建指南\n\n本文将详细介绍如何在Windows、macOS和Linux系统上安装和配置Go语言开发环境。\n\n## 下载Go\n\n访问Go官网 [https://golang.org/dl/](https://golang.org/dl/) 下载最新版本。\n\n### Windows安装\n\n1. 下载Windows安装程序（.msi文件）\n2. 双击运行安装程序\n3. 按照提示完成安装\n\n### macOS安装\n\n```bash\n# 使用Homebrew安装\nbrew install go\n\n# 或下载pkg文件手动安装\n```\n\n### Linux安装\n\n```bash\n# Ubuntu/Debian\nsudo apt update\nsudo apt install golang-go\n\n# CentOS/RHEL\nsudo yum install golang\n```\n\n## 环境变量配置\n\n### GOPATH和GOROOT\n\n```bash\nexport GOROOT=/usr/local/go\nexport GOPATH=$HOME/go\nexport PATH=$GOPATH/bin:$GOROOT/bin:$PATH\n```\n\n### 验证安装\n\n```bash\ngo version\ngo env\n```\n\n## 第一个Go程序\n\n创建`hello.go`文件：\n\n```go\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n```\n\n运行程序：\n\n```bash\ngo run hello.go\n```\n\n恭喜！你已经成功搭建Go开发环境。',
    true,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    8,
    @admin_id,
    @golang_cat_id,
    @go_series_id,
    1
),
(
    'React Hooks最佳实践',
    'react-hooks-best-practices',
    '总结React Hooks的使用经验和最佳实践，帮助开发者写出更优雅的代码。',
    '# React Hooks最佳实践\n\nReact Hooks是React 16.8引入的新特性，让我们可以在函数组件中使用state和其他React特性。\n\n## 基础Hooks\n\n### useState\n\n```jsx\nimport React, { useState } from \'react\';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>You clicked {count} times</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me\n      </button>\n    </div>\n  );\n}\n```\n\n### useEffect\n\n```jsx\nimport React, { useState, useEffect } from \'react\';\n\nfunction Example() {\n  const [count, setCount] = useState(0);\n\n  useEffect(() => {\n    document.title = `You clicked ${count} times`;\n  });\n\n  return (\n    <div>\n      <p>You clicked {count} times</p>\n      <button onClick={() => setCount(count + 1)}>\n        Click me\n      </button>\n    </div>\n  );\n}\n```\n\n## 自定义Hooks\n\n```jsx\nimport { useState, useEffect } from \'react\';\n\nfunction useWindowWidth() {\n  const [width, setWidth] = useState(window.innerWidth);\n\n  useEffect(() => {\n    const handleResize = () => setWidth(window.innerWidth);\n    window.addEventListener(\'resize\', handleResize);\n    return () => window.removeEventListener(\'resize\', handleResize);\n  }, []);\n\n  return width;\n}\n```\n\n## 最佳实践\n\n1. **遵循Hooks规则** - 只在最顶层调用Hooks\n2. **合理分离关注点** - 将相关逻辑组织在一起\n3. **自定义Hooks复用** - 抽取可复用的逻辑\n4. **依赖数组优化** - 正确使用useEffect的依赖数组\n\n希望这些实践经验对你有帮助！',
    true,
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    12,
    @admin_id,
    @react_cat_id,
    @react_series_id,
    1
);

-- 为文章添加标签
SET @welcome_article_id = (SELECT id FROM articles WHERE slug = 'welcome-to-my-blog');
SET @go_guide_id = (SELECT id FROM articles WHERE slug = 'go-setup-guide');
SET @react_hooks_id = (SELECT id FROM articles WHERE slug = 'react-hooks-best-practices');
SET @go_tag_id = (SELECT id FROM tags WHERE slug = 'go');
SET @react_tag_id = (SELECT id FROM tags WHERE slug = 'react');
SET @postgresql_tag_id = (SELECT id FROM tags WHERE slug = 'postgresql');
SET @tutorial_tag_id = (SELECT id FROM tags WHERE slug = 'tutorial');
SET @javascript_tag_id = (SELECT id FROM tags WHERE slug = 'javascript');
SET @frontend_tag_id = (SELECT id FROM tags WHERE slug = 'frontend');

INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES
(@welcome_article_id, @go_tag_id),
(@welcome_article_id, @react_tag_id),
(@welcome_article_id, @postgresql_tag_id),
(@go_guide_id, @go_tag_id),
(@go_guide_id, @tutorial_tag_id),
(@react_hooks_id, @react_tag_id),
(@react_hooks_id, @javascript_tag_id),
(@react_hooks_id, @frontend_tag_id);

-- 插入基本配置
INSERT IGNORE INTO configs (key, value, type, description) VALUES
('site_title', '我的技术博客', 'string', '网站标题'),
('site_description', '分享技术、记录成长', 'string', '网站描述'),
('site_keywords', 'Go,React,技术博客,全栈开发', 'string', '网站关键词'),
('posts_per_page', '10', 'int', '每页文章数量'),
('allow_comments', 'true', 'bool', '是否允许评论'),
('search_enabled', 'true', 'bool', '是否启用搜索功能'),
('maintenance_mode', 'false', 'bool', '维护模式'),
('theme', 'default', 'string', '当前主题');