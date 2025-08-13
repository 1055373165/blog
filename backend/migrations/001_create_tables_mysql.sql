-- MySQL兼容的数据库表结构

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#007bff',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 创建系列表
CREATE TABLE IF NOT EXISTS series (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- 创建文章表
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    featured_image TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    author_id INT NOT NULL,
    category_id INT,
    series_id INT,
    series_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL
);

-- 创建文章标签关联表
CREATE TABLE IF NOT EXISTS article_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    tag_id INT NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_tag (article_id, tag_id)
);

-- 创建文章浏览记录表
CREATE TABLE IF NOT EXISTS article_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 创建文章点赞表
CREATE TABLE IF NOT EXISTS article_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    ip VARCHAR(45) NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_like (article_id, ip)
);

-- 创建搜索索引表
CREATE TABLE IF NOT EXISTS search_indexes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    content_vector TEXT,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 创建搜索统计表
CREATE TABLE IF NOT EXISTS search_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    result_count INT DEFAULT 0,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建配置表
CREATE TABLE IF NOT EXISTS configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) UNIQUE NOT NULL,
    `value` TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建索引

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_admin ON users(is_admin);

-- 分类表索引
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- 标签表索引
CREATE INDEX idx_tags_slug ON tags(slug);

-- 系列表索引
CREATE INDEX idx_series_slug ON series(slug);

-- 文章表索引
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_series ON articles(series_id, series_order);
CREATE INDEX idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX idx_articles_slug ON articles(slug);

-- 文章全文搜索索引 (MySQL FULLTEXT)
ALTER TABLE articles ADD FULLTEXT(title, content);

-- 文章浏览表索引
CREATE INDEX idx_article_views_article ON article_views(article_id);
CREATE INDEX idx_article_views_date ON article_views(viewed_at);

-- 文章点赞表索引
CREATE INDEX idx_article_likes_article ON article_likes(article_id);

-- 搜索索引表索引
CREATE INDEX idx_search_indexes_article ON search_indexes(article_id);

-- 配置表索引
CREATE INDEX idx_configs_key ON configs(`key`);

-- 搜索统计表索引
CREATE INDEX idx_search_statistics_query ON search_statistics(query);
CREATE INDEX idx_search_statistics_searched_at ON search_statistics(searched_at);