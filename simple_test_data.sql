-- 简化的博客测试数据
-- 使用简单的INSERT语句，避免字段顺序问题

-- 1. 插入额外的用户数据
INSERT INTO users (email, name, password, is_admin) VALUES
('john@example.com', '约翰', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false),
('jane@example.com', '简', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false),
('tech@example.com', '技术专家', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false);

-- 2. 插入额外的分类数据
INSERT INTO categories (name, slug, description, parent_id) VALUES
('编程语言', 'programming-languages', '各种编程语言相关内容', 1),
('框架工具', 'frameworks-tools', '开发框架和工具介绍', 1),
('数据库技术', 'database-tech', '数据库相关技术文章', 1),
('个人感悟', 'personal-thoughts', '个人生活感悟和思考', 2),
('旅行记录', 'travel-logs', '旅行见闻和记录', 2);

-- 3. 插入额外的标签数据
INSERT INTO tags (name, slug, color) VALUES
('Vue.js', 'vue-js', '#4FC08D'),
('Node.js', 'node-js', '#339933'),
('Python', 'python', '#3776AB'),
('Docker', 'docker', '#2496ED'),
('Linux', 'linux', '#FCC624'),
('MySQL', 'mysql', '#4479A1'),
('Redis', 'redis', '#DC382D'),
('算法', 'algorithms', '#FF6B6B'),
('架构设计', 'architecture', '#845EC2'),
('性能优化', 'performance', '#FF8066');

-- 4. 插入系列数据
INSERT INTO series (name, slug, description) VALUES
('Go语言入门到精通', 'go-mastery', '从基础到高级的Go语言学习系列'),
('React开发实战', 'react-practice', 'React框架实际项目开发经验分享'),
('数据库优化之路', 'database-optimization', '数据库性能优化实践案例'),
('微服务架构实践', 'microservices-practice', '微服务架构设计与实现');

-- 5. 插入文章数据
INSERT INTO articles (title, slug, content, excerpt, is_published, view_count, like_count, author_id, category_id, series_id, series_order, meta_title, meta_description) VALUES
('Go语言基础语法详解', 'go-basics-syntax', 
'# Go语言基础语法详解\n\nGo语言是Google开发的一种静态强类型、编译型语言。\n\n## 变量声明\n\n```go\nvar name string = "Hello"\nage := 25\n```\n\n## 数据类型\n\nGo语言有以下基本数据类型：\n- 整型：int8, int16, int32, int64\n- 浮点型：float32, float64\n- 布尔型：bool\n- 字符串：string\n\n## 控制结构\n\n```go\nif age >= 18 {\n    fmt.Println("成年人")\n}\n\nfor i := 0; i < 10; i++ {\n    fmt.Println(i)\n}\n```', 
'Go语言基础语法介绍，包括变量声明、数据类型、控制结构等。', 
true, 150, 12, 1, 4, 1, 1, 'Go语言基础语法详解', 'Go语言入门教程'),

('React Hooks完全指南', 'react-hooks-guide',
'# React Hooks完全指南\n\nReact Hooks让我们能在函数组件中使用状态。\n\n## useState\n\n```jsx\nconst [count, setCount] = useState(0);\n```\n\n## useEffect\n\n```jsx\nuseEffect(() => {\n    document.title = `Count: ${count}`;\n}, [count]);\n```\n\n## 自定义Hook\n\n```jsx\nfunction useCounter() {\n    const [count, setCount] = useState(0);\n    const increment = () => setCount(count + 1);\n    return { count, increment };\n}\n```',
'React Hooks使用指南，包括useState、useEffect等。',
true, 89, 8, 2, 5, 2, 1, 'React Hooks指南', 'React开发教程'),

('MySQL索引优化实战', 'mysql-index-optimization',
'# MySQL索引优化实战\n\n索引是提升数据库性能的关键。\n\n## 索引类型\n\n1. 主键索引\n2. 唯一索引\n3. 普通索引\n4. 复合索引\n\n## 创建索引\n\n```sql\nCREATE INDEX idx_user_email ON users(email);\nCREATE INDEX idx_article_category ON articles(category_id, published_at);\n```\n\n## 优化建议\n\n- 为经常查询的字段创建索引\n- 避免过多索引影响写性能\n- 使用复合索引优化复杂查询',
'MySQL索引优化技巧和实战经验分享。',
true, 167, 15, 3, 6, 3, 1, 'MySQL索引优化', '数据库性能优化'),

('程序员的自我修养', 'programmer-cultivation',
'# 程序员的自我修养\n\n技术之外，程序员还需要综合素质的提升。\n\n## 持续学习\n\n- 关注技术趋势\n- 深度学习原理\n- 实践应用知识\n- 知识分享交流\n\n## 编码规范\n\n```javascript\n// 良好的命名\nfunction calculateUserAge(birthDate) {\n    return new Date().getFullYear() - birthDate.getFullYear();\n}\n```\n\n## 团队协作\n\n- 主动沟通\n- 代码审查\n- 文档编写\n- 知识传承',
'程序员职业发展和综合素质提升的思考。',
true, 298, 24, 1, 7, NULL, NULL, '程序员自我修养', '程序员职业发展'),

('JavaScript闭包详解', 'javascript-closures',
'# JavaScript闭包详解\n\n闭包是JavaScript的重要概念。\n\n## 什么是闭包\n\n```javascript\nfunction outer(x) {\n    function inner(y) {\n        return x + y;\n    }\n    return inner;\n}\n\nconst addFive = outer(5);\nconsole.log(addFive(3)); // 8\n```\n\n## 实际应用\n\n### 数据私有化\n```javascript\nfunction createCounter() {\n    let count = 0;\n    return {\n        increment: () => ++count,\n        getCount: () => count\n    };\n}\n```\n\n### 模块模式\n闭包可以创建私有变量和方法。',
'深入理解JavaScript闭包的概念和应用场景。',
true, 201, 16, 3, 3, NULL, NULL, 'JavaScript闭包', 'JavaScript高级概念');

-- 6. 插入文章标签关联数据
-- 注意：这里使用的ID是基于已有数据推算的，实际运行时可能需要调整
INSERT INTO article_tags (article_id, tag_id) VALUES
-- Go语言基础语法 (假设文章ID从现有数据后开始)
((SELECT MAX(id) FROM articles WHERE title='Go语言基础语法详解'), 1), -- Go
((SELECT MAX(id) FROM articles WHERE title='Go语言基础语法详解'), 8), -- 算法

-- React Hooks
((SELECT MAX(id) FROM articles WHERE title='React Hooks完全指南'), 2), -- React  
((SELECT MAX(id) FROM articles WHERE title='React Hooks完全指南'), 5), -- 前端

-- MySQL索引优化
((SELECT MAX(id) FROM articles WHERE title='MySQL索引优化实战'), 4), -- 数据库
((SELECT MAX(id) FROM articles WHERE title='MySQL索引优化实战'), 16), -- MySQL
((SELECT MAX(id) FROM articles WHERE title='MySQL索引优化实战'), 20), -- 性能优化

-- JavaScript闭包
((SELECT MAX(id) FROM articles WHERE title='JavaScript闭包详解'), 5), -- 前端
((SELECT MAX(id) FROM articles WHERE title='JavaScript闭包详解'), 18); -- 算法

-- 7. 插入一些浏览和点赞记录
INSERT INTO article_views (article_id, ip, user_agent) VALUES
((SELECT MAX(id) FROM articles WHERE title='Go语言基础语法详解'), '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
((SELECT MAX(id) FROM articles WHERE title='React Hooks完全指南'), '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
((SELECT MAX(id) FROM articles WHERE title='MySQL索引优化实战'), '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)');

INSERT INTO article_likes (article_id, ip) VALUES
((SELECT MAX(id) FROM articles WHERE title='Go语言基础语法详解'), '192.168.1.100'),
((SELECT MAX(id) FROM articles WHERE title='React Hooks完全指南'), '192.168.1.101'),
((SELECT MAX(id) FROM articles WHERE title='MySQL索引优化实战'), '192.168.1.102');

-- 8. 插入系统配置
INSERT INTO configs (`key`, `value`, description) VALUES
('site_title', '技术博客', '网站标题'),
('site_description', '专注技术分享的个人博客', '网站描述'),
('posts_per_page', '10', '每页文章数量'),
('enable_comments', 'true', '是否启用评论'),
('site_keywords', 'Go,React,数据库,编程', '网站关键词');

-- 9. 插入搜索统计
INSERT INTO search_statistics (query, ip, result_count) VALUES
('Go语言', '192.168.1.100', 2),
('React', '192.168.1.101', 1),
('数据库', '192.168.1.102', 1),
('JavaScript', '192.168.1.103', 1);