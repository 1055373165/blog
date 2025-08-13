-- 博客测试数据
-- 注意：由于已有默认数据，这里只添加额外的测试数据

-- 1. 插入额外的用户数据 (按GORM表结构顺序: id, created_at, updated_at, deleted_at, email, name, password, avatar, is_admin)
INSERT INTO users (created_at, updated_at, deleted_at, email, name, password, avatar, is_admin) VALUES
(NOW(), NOW(), NULL, 'john@example.com', '约翰', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', false),
(NOW(), NOW(), NULL, 'jane@example.com', '简', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', false),
(NOW(), NOW(), NULL, 'tech@example.com', '技术专家', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', false);

-- 2. 插入额外的分类数据
INSERT INTO categories (name, slug, description, parent_id, created_at, updated_at) VALUES
('编程语言', 'programming-languages', '各种编程语言相关内容', 1, NOW(), NOW()),
('框架工具', 'frameworks-tools', '开发框架和工具介绍', 1, NOW(), NOW()),
('数据库技术', 'database-tech', '数据库相关技术文章', 1, NOW(), NOW()),
('个人感悟', 'personal-thoughts', '个人生活感悟和思考', 2, NOW(), NOW()),
('旅行记录', 'travel-logs', '旅行见闻和记录', 2, NOW(), NOW());

-- 3. 插入额外的标签数据
INSERT INTO tags (name, slug, color, created_at, updated_at) VALUES
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
INSERT INTO series (name, slug, description, created_at, updated_at) VALUES
('Go语言入门到精通', 'go-mastery', '从基础到高级的Go语言学习系列', NOW(), NOW()),
('React开发实战', 'react-practice', 'React框架实际项目开发经验分享', NOW(), NOW()),
('数据库优化之路', 'database-optimization', '数据库性能优化实践案例', NOW(), NOW()),
('微服务架构实践', 'microservices-practice', '微服务架构设计与实现', NOW(), NOW());

-- 5. 插入文章数据
INSERT INTO articles (title, slug, content, excerpt, featured_image, is_published, published_at, view_count, like_count, author_id, category_id, series_id, series_order, meta_title, meta_description, created_at, updated_at) VALUES
-- Go语言系列文章
('Go语言基础语法详解', 'go-basics-syntax', 
'# Go语言基础语法详解

Go语言是Google开发的一种静态强类型、编译型语言。本文将详细介绍Go语言的基础语法。

## 变量声明

在Go中，变量可以通过多种方式声明：

```go
var name string = "Hello"
var age int = 25
// 或者简短声明
name := "Hello"
age := 25
```

## 数据类型

Go语言有以下基本数据类型：

- **整型**：int8, int16, int32, int64, uint8, uint16, uint32, uint64
- **浮点型**：float32, float64
- **布尔型**：bool
- **字符串**：string

## 控制结构

### if语句
```go
if age >= 18 {
    fmt.Println("成年人")
} else {
    fmt.Println("未成年")
}
```

### for循环
```go
for i := 0; i < 10; i++ {
    fmt.Println(i)
}
```

## 函数定义

```go
func add(a int, b int) int {
    return a + b
}
```

Go语言的语法简洁明了，非常适合快速开发和维护。',
'Go语言基础语法介绍，包括变量声明、数据类型、控制结构和函数定义等核心概念。',
'', true, NOW(), 150, 12, 1, 4, 1, 1,
'Go语言基础语法详解 - 入门教程',
'详细介绍Go语言的基础语法，包括变量、数据类型、控制结构等',
NOW(), NOW()),

('Go并发编程：Goroutines和Channels', 'go-concurrency-goroutines-channels',
'# Go并发编程：Goroutines和Channels

Go语言最大的特色之一就是内置的并发支持。通过goroutines和channels，我们可以轻松实现高效的并发程序。

## Goroutines

Goroutine是Go语言中的轻量级线程。启动一个goroutine非常简单：

```go
package main

import (
    "fmt"
    "time"
)

func sayHello() {
    fmt.Println("Hello from goroutine!")
}

func main() {
    go sayHello()  // 启动goroutine
    time.Sleep(1 * time.Second)
    fmt.Println("Main function")
}
```

## Channels

Channel是goroutines之间通信的管道：

```go
func main() {
    ch := make(chan string)
    
    go func() {
        ch <- "Hello Channel!"
    }()
    
    message := <-ch
    fmt.Println(message)
}
```

## 实际应用示例

以下是一个使用goroutines和channels实现并发处理的示例：

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    
    // 启动3个worker
    for i := 1; i <= 3; i++ {
        go worker(i, jobs, results)
    }
    
    // 发送任务
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)
    
    // 收集结果
    for r := 1; r <= 5; r++ {
        <-results
    }
}
```

并发编程是Go语言的核心优势，掌握好goroutines和channels将大大提升程序性能。',
'深入讲解Go语言的并发编程特性，包括Goroutines和Channels的使用方法和实际应用。',
'', true, NOW(), 89, 8, 1, 4, 1, 2,
'Go并发编程教程 - Goroutines和Channels详解',
'学习Go语言的并发编程，掌握Goroutines和Channels的核心概念和实际应用',
NOW(), NOW()),

-- React开发文章
('React Hooks完全指南', 'react-hooks-complete-guide',
'# React Hooks完全指南

React Hooks是React 16.8引入的新特性，让我们能够在函数组件中使用state和其他React特性。

## useState Hook

useState是最基础的Hook，用于在函数组件中添加状态：

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

## useEffect Hook

useEffect让你在函数组件中执行副作用操作：

```jsx
import React, { useState, useEffect } from ''react'';

function Example() {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
        document.title = `You clicked ${count} times`;
        
        // 清理函数
        return () => {
            document.title = ''React App'';
        };
    }, [count]); // 依赖数组
    
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

## 自定义Hook

创建自定义Hook来复用逻辑：

```jsx
function useCounter(initialValue = 0) {
    const [count, setCount] = useState(initialValue);
    
    const increment = () => setCount(count + 1);
    const decrement = () => setCount(count - 1);
    const reset = () => setCount(initialValue);
    
    return { count, increment, decrement, reset };
}

// 使用自定义Hook
function CounterComponent() {
    const { count, increment, decrement, reset } = useCounter(10);
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
            <button onClick={reset}>Reset</button>
        </div>
    );
}
```

React Hooks让函数组件变得更加强大，也让代码复用变得更加简单。',
'全面介绍React Hooks的使用方法，包括useState、useEffect和自定义Hook的实际应用。',
'', true, NOW(), 234, 18, 2, 5, 2, 1,
'React Hooks完全指南 - useState、useEffect详解',
'深入学习React Hooks，掌握现代React开发的核心技能',
NOW(), NOW()),

-- 数据库优化文章
('MySQL索引优化实战', 'mysql-index-optimization',
'# MySQL索引优化实战

数据库索引是提升查询性能的关键技术。本文将通过实际案例讲解MySQL索引优化策略。

## 索引基础

索引是数据库中用于快速定位数据的数据结构，类似于书籍的目录。

### 索引类型

1. **主键索引**：每个表只能有一个主键索引
2. **唯一索引**：保证列值的唯一性
3. **普通索引**：最基本的索引类型
4. **复合索引**：包含多个列的索引

## 创建索引

```sql
-- 创建单列索引
CREATE INDEX idx_user_email ON users(email);

-- 创建复合索引
CREATE INDEX idx_article_category_published 
ON articles(category_id, is_published, published_at);

-- 创建唯一索引
CREATE UNIQUE INDEX uk_user_email ON users(email);
```

## 查询优化实例

### 案例1：优化WHERE查询

**优化前：**
```sql
SELECT * FROM articles WHERE title LIKE ''%技术%'';
```

**优化后：**
```sql
-- 添加全文索引
ALTER TABLE articles ADD FULLTEXT(title, content);

-- 使用全文搜索
SELECT * FROM articles 
WHERE MATCH(title, content) AGAINST(''技术'' IN NATURAL LANGUAGE MODE);
```

### 案例2：优化ORDER BY查询

**优化前：**
```sql
SELECT * FROM articles 
WHERE category_id = 1 
ORDER BY published_at DESC 
LIMIT 10;
```

**优化后：**
```sql
-- 创建复合索引
CREATE INDEX idx_category_published 
ON articles(category_id, published_at DESC);
```

## 索引优化原则

1. **最左前缀原则**：复合索引遵循最左前缀匹配
2. **选择性高的列**：优先为选择性高的列创建索引
3. **避免过多索引**：索引会影响写入性能
4. **定期维护**：使用`OPTIMIZE TABLE`维护索引

## 性能监控

```sql
-- 查看索引使用情况
SHOW INDEX FROM articles;

-- 分析查询执行计划
EXPLAIN SELECT * FROM articles WHERE category_id = 1;

-- 查看慢查询
SHOW VARIABLES LIKE ''slow_query_log'';
```

合理的索引设计是数据库性能优化的基础，需要根据实际查询场景来设计。',
'MySQL索引优化实战指南，包括索引类型、创建方法和查询优化案例。',
'', true, NOW(), 167, 15, 3, 6, 3, 1,
'MySQL索引优化实战 - 数据库性能调优',
'学习MySQL索引优化技巧，提升数据库查询性能和系统响应速度',
NOW(), NOW()),

-- 生活随笔文章
('程序员的自我修养', 'programmer-self-cultivation',
'# 程序员的自我修养

作为一名程序员，除了技术能力，还需要不断提升自己的综合素质。

## 持续学习

技术更新迅速，程序员需要保持学习的习惯：

- **关注技术趋势**：定期阅读技术博客、参加技术会议
- **深度学习**：不仅要会用，还要理解原理
- **实践应用**：通过项目实践巩固所学知识
- **知识分享**：通过写作、演讲分享知识

## 编码规范

良好的编码习惯是专业程序员的基本素养：

```javascript
// 好的命名
function calculateUserAge(birthDate) {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age;
}

// 清晰的注释
/**
 * 计算两个日期之间的天数差
 * @param {Date} startDate 开始日期
 * @param {Date} endDate 结束日期
 * @returns {number} 天数差
 */
function getDaysDifference(startDate, endDate) {
    const timeDifference = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
}
```

## 沟通协作

程序员不是独行侠，需要与团队协作：

- **主动沟通**：遇到问题及时沟通，而不是闭门造车
- **代码审查**：认真对待代码review，互相学习
- **文档编写**：写好技术文档，方便团队协作
- **知识传承**：乐于分享知识，帮助新人成长

## 工作与生活平衡

保持健康的工作生活平衡：

- **适度加班**：避免过度加班影响健康
- **运动锻炼**：定期运动，保持身体健康
- **兴趣爱好**：培养编程以外的兴趣爱好
- **人际关系**：维护好家庭和朋友关系

程序员的成长不仅仅是技术的提升，更是综合素质的全面发展。',
'分享程序员职业发展中的思考，包括学习方法、编码规范、团队协作等方面的经验。',
'', true, NOW(), 298, 24, 1, 7, NULL, NULL,
'程序员的自我修养 - 职业发展思考',
'程序员职业发展指南，涵盖技术学习、编码规范、团队协作等多个方面',
NOW(), NOW()),

-- 旅行记录
('杭州西湖游记', 'hangzhou-west-lake-travel',
'# 杭州西湖游记

"上有天堂，下有苏杭"，这次终于有机会来到杭州，感受西湖的美景。

## 第一天：初识西湖

早上到达杭州，入住酒店后就迫不及待地前往西湖。从酒店到西湖很方便，坐地铁就能到达。

第一眼看到西湖，确实被震撼了。湖水清澈，远山如黛，真的很美。沿着苏堤慢慢走，感受着微风吹过脸颊，心情格外舒畅。

### 苏堤春晓

苏堤是苏东坡在杭州任知州时修建的，全长约2.8公里。走在苏堤上，两侧柳树成荫，湖光山色尽收眼底。

### 断桥残雪

虽然不是雪季，但断桥的风景依然很美。站在桥上，可以看到整个西湖的景色，确实是观景的好地方。

## 第二天：深度游览

第二天租了一辆共享单车，准备更深入地游览西湖。

### 雷峰塔

爬上雷峰塔，可以俯瞰整个西湖。塔内有很多关于白蛇传的故事介绍，很有文化底蕴。

### 三潭印月

坐船游览三潭印月，这是西湖十景之一。三座小石塔矗立在湖中，据说月圆之夜，塔洞中点上蜡烛，可以看到月亮的倒影，非常浪漫。

## 美食体验

杭州的美食也不能错过：

- **西湖醋鱼**：酸甜可口，很有特色
- **东坡肉**：肥而不腻，入口即化
- **龙井虾仁**：清香淡雅，体现了杭帮菜的特色
- **叫化鸡**：外酥内嫩，香味浓郁

## 感想

杭州西湖确实名不虚传，不仅风景优美，更有深厚的文化底蕴。两天的行程虽然短暂，但收获满满。下次有机会一定要再来，体验不同季节的西湖美景。',
'记录杭州西湖两日游的所见所闻，包括著名景点和美食体验。',
'', true, NOW(), 156, 9, 2, 8, NULL, NULL,
'杭州西湖游记 - 两日游记录',
'分享杭州西湖旅游经历，包括景点介绍、美食推荐和个人感想',
NOW(), NOW()),

-- 学习笔记
('深入理解JavaScript闭包', 'javascript-closures-deep-dive',
'# 深入理解JavaScript闭包

闭包是JavaScript中一个重要但又容易让人困惑的概念。本文将深入讲解闭包的原理和应用。

## 什么是闭包

闭包是指一个函数能够访问并操作其外部作用域中的变量，即使这个函数在其外部作用域之外被调用。

```javascript
function outerFunction(x) {
    // 外部函数的变量
    
    function innerFunction(y) {
        // 内部函数访问外部函数的变量
        console.log(x + y);
    }
    
    return innerFunction;
}

const addFive = outerFunction(5);
addFive(3); // 输出: 8
```

## 闭包的形成条件

1. 函数嵌套：内部函数嵌套在外部函数中
2. 内部函数引用外部函数的变量
3. 内部函数被外部函数返回或以其他方式暴露给外部作用域

## 实际应用案例

### 1. 数据私有化

```javascript
function createCounter() {
    let count = 0;
    
    return {
        increment: function() {
            count++;
            return count;
        },
        decrement: function() {
            count--;
            return count;
        },
        getCount: function() {
            return count;
        }
    };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.getCount());  // 2
// count变量无法直接访问，实现了数据私有化
```

### 2. 函数柯里化

```javascript
function multiply(a) {
    return function(b) {
        return a * b;
    };
}

const multiplyByTwo = multiply(2);
console.log(multiplyByTwo(5)); // 10

// 更简洁的箭头函数写法
const add = a => b => a + b;
const addTen = add(10);
console.log(addTen(5)); // 15
```

### 3. 模块模式

```javascript
const Module = (function() {
    let privateVariable = 0;
    
    function privateFunction() {
        console.log("这是私有函数");
    }
    
    return {
        publicMethod: function() {
            privateVariable++;
            privateFunction();
            return privateVariable;
        },
        getPrivateVariable: function() {
            return privateVariable;
        }
    };
})();

Module.publicMethod(); // 1
console.log(Module.getPrivateVariable()); // 1
```

## 常见陷阱

### 循环中的闭包问题

```javascript
// 问题代码
for (var i = 0; i < 5; i++) {
    setTimeout(function() {
        console.log(i); // 输出5个5
    }, 100);
}

// 解决方案1：使用IIFE
for (var i = 0; i < 5; i++) {
    (function(j) {
        setTimeout(function() {
            console.log(j); // 输出0,1,2,3,4
        }, 100);
    })(i);
}

// 解决方案2：使用let
for (let i = 0; i < 5; i++) {
    setTimeout(function() {
        console.log(i); // 输出0,1,2,3,4
    }, 100);
}
```

## 性能考虑

闭包会保持对外部变量的引用，可能导致内存泄漏：

```javascript
function attachListeners() {
    const someData = new Array(1000000).fill(''data'');
    
    document.getElementById(''button'').onclick = function() {
        // 闭包保持对someData的引用
        console.log(''Button clicked'');
    };
    
    // 解决方案：手动清理
    return function cleanup() {
        document.getElementById(''button'').onclick = null;
    };
}
```

理解闭包对于掌握JavaScript非常重要，它是许多高级特性的基础。',
'深入讲解JavaScript闭包的概念、原理和实际应用，包括常见陷阱和性能考虑。',
'', true, NOW(), 201, 16, 3, 3, NULL, NULL,
'JavaScript闭包深入理解 - 概念与实战',
'全面解析JavaScript闭包，从基础概念到实际应用，帮助开发者深入理解这一重要概念',
NOW(), NOW());

-- 6. 插入文章标签关联数据
INSERT INTO article_tags (article_id, tag_id) VALUES
-- Go语言基础语法 (文章ID=1)
(1, 1), -- Go
(1, 8), -- 算法

-- Go并发编程 (文章ID=2)  
(2, 1), -- Go
(2, 10), -- 性能优化

-- React Hooks (文章ID=3)
(3, 2), -- React
(3, 11), -- Vue.js (假设这是前端相关)

-- MySQL索引优化 (文章ID=4)
(4, 4), -- 数据库
(4, 16), -- MySQL
(4, 10), -- 性能优化

-- 程序员修养 (文章ID=5)
(5, 8), -- 算法
(5, 9), -- 架构设计

-- 杭州西湖游记 (文章ID=6)
-- 没有技术标签

-- JavaScript闭包 (文章ID=7)
(7, 5), -- 前端
(7, 8); -- 算法

-- 7. 插入一些文章浏览记录
INSERT INTO article_views (article_id, ip, user_agent, viewed_at) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)', NOW()),
(3, '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, '192.168.1.104', 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(5, '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW());

-- 8. 插入一些点赞记录
INSERT INTO article_likes (article_id, ip, liked_at) VALUES
(1, '192.168.1.100', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, '192.168.1.101', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, '192.168.1.102', NOW()),
(3, '192.168.1.103', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(4, '192.168.1.104', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(5, '192.168.1.105', NOW());

-- 9. 插入系统配置数据
INSERT INTO configs (`key`, `value`, `type`, description, created_at, updated_at) VALUES
('site_title', '技术博客', 'string', '网站标题', NOW(), NOW()),
('site_description', '专注于技术分享和知识传播的个人博客', 'string', '网站描述', NOW(), NOW()),
('posts_per_page', '10', 'int', '每页文章数量', NOW(), NOW()),
('enable_comments', 'true', 'bool', '是否启用评论功能', NOW(), NOW()),
('site_keywords', 'Go,React,数据库,编程,技术博客', 'string', '网站关键词', NOW(), NOW());

-- 更新文章的浏览数和点赞数（与插入的记录保持一致）
UPDATE articles SET view_count = 2, like_count = 2 WHERE id = 1;
UPDATE articles SET view_count = 1, like_count = 1 WHERE id = 2;
UPDATE articles SET view_count = 1, like_count = 1 WHERE id = 3;
UPDATE articles SET view_count = 1, like_count = 1 WHERE id = 4;
UPDATE articles SET view_count = 1, like_count = 1 WHERE id = 5;

-- 添加一些搜索统计数据
INSERT INTO search_statistics (query, ip, user_agent, result_count, searched_at) VALUES
('Go语言', '192.168.1.100', 'Mozilla/5.0', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('React', '192.168.1.101', 'Mozilla/5.0', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('数据库优化', '192.168.1.102', 'Mozilla/5.0', 1, NOW()),
('JavaScript', '192.168.1.103', 'Mozilla/5.0', 1, DATE_SUB(NOW(), INTERVAL 3 HOUR));