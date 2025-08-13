-- 清理现有数据并插入全新的测试数据
-- 注意：这会删除所有现有数据，请谨慎使用

-- 清理所有表数据（保持表结构）
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE article_likes;
TRUNCATE TABLE article_views;
TRUNCATE TABLE article_tags;
TRUNCATE TABLE search_indexes;
TRUNCATE TABLE search_statistics;
TRUNCATE TABLE articles;
TRUNCATE TABLE series;
TRUNCATE TABLE tags;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
TRUNCATE TABLE configs;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. 插入用户数据
INSERT INTO users (email, name, password, is_admin) VALUES
('admin@blog.com', '管理员', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true),
('john@example.com', '约翰·技术', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false),
('jane@example.com', '简·设计师', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false),
('tech@example.com', '技术专家', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', false);

-- 2. 插入分类数据
INSERT INTO categories (name, slug, description, parent_id) VALUES
-- 主分类
('技术分享', 'tech', '技术相关文章', NULL),
('生活随笔', 'life', '生活感悟和随笔', NULL),
('学习笔记', 'notes', '学习过程中的笔记', NULL),
-- 子分类
('编程语言', 'programming', '各种编程语言', 1),
('数据库', 'database', '数据库技术', 1),
('前端技术', 'frontend', '前端开发技术', 1),
('后端技术', 'backend', '后端开发技术', 1),
('个人感悟', 'thoughts', '个人思考', 2);

-- 3. 插入标签数据
INSERT INTO tags (name, slug, color) VALUES
('Go', 'go', '#00ADD8'),
('React', 'react', '#61DAFB'),
('JavaScript', 'javascript', '#F7DF1E'),
('MySQL', 'mysql', '#4479A1'),
('前端', 'frontend-tag', '#FF6B6B'),
('后端', 'backend-tag', '#4ECDC4'),
('数据库', 'database-tag', '#336791'),
('TypeScript', 'typescript', '#3178C6'),
('Vue.js', 'vue', '#4FC08D'),
('Node.js', 'nodejs', '#339933'),
('Python', 'python', '#3776AB'),
('算法', 'algorithm', '#FF8066'),
('架构', 'architecture', '#845EC2'),
('性能优化', 'optimization', '#FF6B9D');

-- 4. 插入系列数据
INSERT INTO series (name, slug, description) VALUES
('Go语言入门', 'go-tutorial', '从零开始学习Go语言'),
('React实战', 'react-practice', 'React项目开发实践'),
('数据库进阶', 'database-advanced', '数据库高级应用'),
('全栈开发', 'fullstack', '全栈开发技能树');

-- 5. 插入文章数据
INSERT INTO articles (title, slug, content, excerpt, is_published, published_at, views_count, likes_count, author_id, category_id, series_id, series_order, meta_title, meta_description) VALUES

-- Go语言文章
('Go语言快速入门', 'go-quick-start',
'# Go语言快速入门

Go是Google开发的开源编程语言，以其简洁性和高效性著称。

## 安装Go

```bash
# macOS
brew install go

# 验证安装
go version
```

## Hello World

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

## 基本语法

### 变量声明
```go
var name string = "Go"
age := 10  // 短变量声明
```

### 函数定义
```go
func add(x, y int) int {
    return x + y
}
```

Go语言语法简洁，学习曲线平缓，非常适合初学者入门。',
'Go语言入门教程，包括安装、基本语法和简单示例。', 
true, NOW(), 245, 18, 2, 4, 1, 1,
'Go语言快速入门教程', 'Go语言基础语法和入门指南'),

('Go并发编程实战', 'go-concurrency',
'# Go并发编程实战

Go的goroutine和channel是其最大特色。

## Goroutines

```go
package main

import (
    "fmt"
    "time"
)

func worker(id int) {
    fmt.Printf("Worker %d starting\\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\\n", id)
}

func main() {
    for i := 1; i <= 3; i++ {
        go worker(i)
    }
    time.Sleep(3 * time.Second)
}
```

## Channels

```go
func main() {
    messages := make(chan string)
    
    go func() {
        messages <- "Hello"
    }()
    
    msg := <-messages
    fmt.Println(msg)
}
```

## Worker Pool模式

```go
func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    
    // 启动workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    // 发送任务
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)
    
    // 收集结果
    for a := 1; a <= 5; a++ {
        <-results
    }
}
```

掌握Go的并发模式对于编写高性能程序至关重要。',
'深入讲解Go语言的并发编程，包括goroutines和channels的实际应用。',
true, NOW(), 187, 14, 2, 4, 1, 2,
'Go并发编程实战教程', 'Go语言goroutines和channels详解'),

-- React文章
('React Hooks深入理解', 'react-hooks-deep-dive',
'# React Hooks深入理解

Hooks改变了我们编写React组件的方式。

## useState原理

```jsx
function Counter() {
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                +1
            </button>
        </div>
    );
}
```

## useEffect详解

```jsx
function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        fetchUser(userId).then(setUser);
    }, [userId]); // 依赖数组
    
    if (!user) return <div>Loading...</div>;
    
    return <div>{user.name}</div>;
}
```

## 自定义Hooks

```jsx
function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
    });
    
    const setStoredValue = (value) => {
        setValue(value);
        localStorage.setItem(key, JSON.stringify(value));
    };
    
    return [value, setStoredValue];
}

// 使用
function App() {
    const [name, setName] = useLocalStorage("name", "");
    
    return (
        <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
        />
    );
}
```

## 性能优化

```jsx
import { memo, useMemo, useCallback } from ''react'';

const ExpensiveComponent = memo(function({ items, onSelect }) {
    const expensiveValue = useMemo(() => {
        return items.reduce((sum, item) => sum + item.value, 0);
    }, [items]);
    
    const handleClick = useCallback((id) => {
        onSelect(id);
    }, [onSelect]);
    
    return (
        <div>
            <p>Total: {expensiveValue}</p>
            {items.map(item => (
                <button 
                    key={item.id}
                    onClick={() => handleClick(item.id)}
                >
                    {item.name}
                </button>
            ))}
        </div>
    );
});
```

React Hooks让函数组件拥有了类组件的所有能力。',
'深入解析React Hooks的原理和最佳实践。',
true, NOW(), 356, 28, 3, 6, 2, 1,
'React Hooks深入理解', 'React Hooks原理和性能优化'),

-- 数据库文章
('MySQL性能调优指南', 'mysql-performance-tuning',
'# MySQL性能调优指南

数据库性能优化是后端开发的重要技能。

## 索引优化

### 查看索引使用情况
```sql
EXPLAIN SELECT * FROM users WHERE email = ''john@example.com'';
```

### 创建合适的索引
```sql
-- 单列索引
CREATE INDEX idx_email ON users(email);

-- 复合索引
CREATE INDEX idx_status_created ON orders(status, created_at);

-- 前缀索引
CREATE INDEX idx_name_prefix ON users(name(10));
```

### 索引优化原则
1. **选择性高的列**：优先为重复值少的列建索引
2. **最左前缀**：复合索引遵循最左前缀原则
3. **避免过多索引**：每个索引都会影响写入性能

## 查询优化

### 避免全表扫描
```sql
-- 不好的查询
SELECT * FROM articles WHERE title LIKE ''%技术%'';

-- 优化后
SELECT * FROM articles 
WHERE MATCH(title, content) AGAINST(''技术'' IN NATURAL LANGUAGE MODE);
```

### 使用LIMIT
```sql
-- 分页查询
SELECT * FROM articles 
WHERE status = ''published''
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

### 子查询优化
```sql
-- 避免相关子查询
SELECT a.* FROM articles a
WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = a.category_id AND c.status = ''active'');

-- 优化为JOIN
SELECT a.* FROM articles a
JOIN categories c ON a.category_id = c.id
WHERE c.status = ''active'';
```

## 配置优化

### InnoDB配置
```ini
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
```

### 查询缓存
```ini
query_cache_type = 1
query_cache_size = 128M
```

## 监控工具

### 慢查询日志
```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = ''ON'';
SET GLOBAL long_query_time = 1;
```

### 性能监控
```sql
-- 查看连接数
SHOW PROCESSLIST;

-- 查看表状态
SHOW TABLE STATUS LIKE ''articles'';

-- 查看索引统计
SHOW INDEX FROM articles;
```

数据库性能优化是一个持续的过程，需要结合实际业务场景。',
'MySQL数据库性能优化实战，包括索引优化、查询优化和配置调优。',
true, NOW(), 198, 16, 4, 5, 3, 1,
'MySQL性能调优实战指南', 'MySQL数据库优化技巧和最佳实践'),

-- 生活随笔
('程序员的工作与生活平衡', 'work-life-balance',
'# 程序员的工作与生活平衡

作为程序员，如何在技术成长和生活质量之间找到平衡？

## 时间管理

### 工作时间
- **专注工作**：工作时间全身心投入，提高效率
- **避免加班成瘾**：适度加班可以，但不要成为习惯
- **学会说不**：对不合理的需求要敢于拒绝

### 学习时间
- **固定学习时间**：每天至少1小时用于学习新技术
- **实践导向**：学习要结合实际项目应用
- **知识输出**：通过博客、分享巩固所学

### 生活时间
- **运动健身**：每周至少3次运动，保持身体健康
- **兴趣爱好**：培养编程之外的兴趣爱好
- **社交活动**：与朋友、家人保持联系

## 职业发展

### 技术路线
```
初级开发者 → 中级开发者 → 高级开发者 → 技术专家
                    ↓
               团队负责人 → 技术经理 → CTO
```

### 技能提升
1. **深度优先**：先在一个领域做精做深
2. **适度拓宽**：了解相关技术栈
3. **软技能**：沟通、协作、领导力也很重要

## 心理健康

### 应对压力
- **分解任务**：大任务分解成小任务逐一解决
- **寻求帮助**：遇到困难主动求助
- **适度休息**：累了就休息，不要硬撑

### 保持学习热情
- **参与开源**：贡献开源项目
- **技术分享**：在团队或社区分享知识
- **持续思考**：思考技术的本质和未来发展

## 实际建议

### 日常习惯
```
08:00 - 09:00  晨练/早餐
09:00 - 12:00  专注工作
12:00 - 13:00  午餐/休息
13:00 - 17:00  继续工作
17:00 - 18:00  学习新技术
18:00 - 19:00  晚餐
19:00 - 21:00  个人时间
21:00 - 22:00  阅读/总结
22:00         休息
```

### 周末安排
- **技术学习**：深入研究感兴趣的技术
- **个人项目**：开发自己的项目
- **户外活动**：爬山、跑步、旅行
- **社交聚会**：与朋友家人聚餐

记住，程序员不仅仅是职业，更是一种生活方式。在追求技术卓越的同时，也要享受生活的美好。',
'分享程序员如何在技术成长和生活质量之间找到平衡的思考和建议。',
true, NOW(), 412, 35, 2, 8, NULL, NULL,
'程序员的工作生活平衡之道', '程序员职业发展和生活质量平衡指南');

-- 6. 插入文章标签关联
INSERT INTO article_tags (article_id, tag_id) VALUES
-- Go语言快速入门
(1, 1),  -- Go
(1, 6),  -- 后端

-- Go并发编程实战
(2, 1),  -- Go
(2, 6),  -- 后端
(2, 14), -- 性能优化

-- React Hooks深入理解
(3, 2),  -- React
(3, 3),  -- JavaScript
(3, 5),  -- 前端

-- MySQL性能调优指南
(4, 4),  -- MySQL
(4, 7),  -- 数据库
(4, 14), -- 性能优化

-- 程序员的工作与生活平衡
(5, 13); -- 架构（用作软技能标签）

-- 7. 插入浏览记录
INSERT INTO article_views (article_id, ip, user_agent) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(1, '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'),
(2, '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, '192.168.1.104', 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36'),
(3, '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(3, '192.168.1.106', 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)'),
(4, '192.168.1.107', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(5, '192.168.1.108', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

-- 8. 插入点赞记录
INSERT INTO article_likes (article_id, ip) VALUES
(1, '192.168.1.100'),
(1, '192.168.1.101'),
(1, '192.168.1.102'),
(2, '192.168.1.103'),
(2, '192.168.1.104'),
(3, '192.168.1.105'),
(3, '192.168.1.106'),
(4, '192.168.1.107'),
(5, '192.168.1.108'),
(5, '192.168.1.109');

-- 9. 插入系统配置
INSERT INTO configs (`key`, `value`, description) VALUES
('site_title', '技术成长之路', '网站标题'),
('site_description', '记录技术学习和个人成长的博客', '网站描述'),
('site_keywords', 'Go语言,React,MySQL,前端,后端,数据库,编程,技术博客', '网站关键词'),
('posts_per_page', '12', '每页显示文章数'),
('enable_search', 'true', '是否启用搜索功能'),
('enable_comments', 'false', '是否启用评论功能'),
('author_name', '技术博主', '作者姓名'),
('author_bio', '全栈开发工程师，热爱技术分享', '作者简介');

-- 10. 插入搜索统计
INSERT INTO search_statistics (query, ip, result_count) VALUES
('Go语言', '192.168.1.201', 2),
('React', '192.168.1.202', 1),
('MySQL', '192.168.1.203', 1),
('性能优化', '192.168.1.204', 2),
('前端开发', '192.168.1.205', 1),
('数据库', '192.168.1.206', 1),
('JavaScript', '192.168.1.207', 1),
('编程', '192.168.1.208', 5);