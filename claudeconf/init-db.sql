-- Blog 数据库初始化脚本
-- MySQL 8.0 版本

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `blog_db` 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE `blog_db`;

-- 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(50) NOT NULL UNIQUE,
    `email` varchar(100) NOT NULL UNIQUE,
    `password_hash` varchar(255) NOT NULL,
    `display_name` varchar(100) DEFAULT NULL,
    `avatar_url` varchar(255) DEFAULT NULL,
    `bio` text,
    `role` enum('admin', 'editor', 'author', 'subscriber') DEFAULT 'subscriber',
    `status` enum('active', 'inactive', 'banned') DEFAULT 'active',
    `email_verified` boolean DEFAULT FALSE,
    `last_login_at` timestamp NULL DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_username` (`username`),
    KEY `idx_email` (`email`),
    KEY `idx_role` (`role`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分类表
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `slug` varchar(100) NOT NULL UNIQUE,
    `description` text,
    `parent_id` int(11) DEFAULT NULL,
    `sort_order` int(11) DEFAULT 0,
    `is_active` boolean DEFAULT TRUE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_sort_order` (`sort_order`),
    KEY `idx_is_active` (`is_active`),
    FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 标签表
DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(50) NOT NULL UNIQUE,
    `slug` varchar(50) NOT NULL UNIQUE,
    `description` text,
    `color` varchar(7) DEFAULT NULL,
    `is_active` boolean DEFAULT TRUE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系列表
DROP TABLE IF EXISTS `series`;
CREATE TABLE `series` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `title` varchar(200) NOT NULL,
    `slug` varchar(200) NOT NULL UNIQUE,
    `description` text,
    `cover_image` varchar(255) DEFAULT NULL,
    `author_id` int(11) NOT NULL,
    `is_active` boolean DEFAULT TRUE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_author_id` (`author_id`),
    KEY `idx_is_active` (`is_active`),
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章表
DROP TABLE IF EXISTS `articles`;
CREATE TABLE `articles` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `title` varchar(255) NOT NULL,
    `slug` varchar(255) NOT NULL UNIQUE,
    `excerpt` text,
    `content` longtext NOT NULL,
    `cover_image` varchar(255) DEFAULT NULL,
    `author_id` int(11) NOT NULL,
    `category_id` int(11) DEFAULT NULL,
    `series_id` int(11) DEFAULT NULL,
    `series_order` int(11) DEFAULT NULL,
    `status` enum('draft', 'published', 'archived', 'deleted') DEFAULT 'draft',
    `is_featured` boolean DEFAULT FALSE,
    `is_top` boolean DEFAULT FALSE,
    `allow_comments` boolean DEFAULT TRUE,
    `view_count` int(11) DEFAULT 0,
    `like_count` int(11) DEFAULT 0,
    `comment_count` int(11) DEFAULT 0,
    `reading_time` int(11) DEFAULT 0,
    `seo_title` varchar(255) DEFAULT NULL,
    `seo_description` text DEFAULT NULL,
    `seo_keywords` text DEFAULT NULL,
    `published_at` timestamp NULL DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_slug` (`slug`),
    KEY `idx_author_id` (`author_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_series_id` (`series_id`),
    KEY `idx_status` (`status`),
    KEY `idx_is_featured` (`is_featured`),
    KEY `idx_is_top` (`is_top`),
    KEY `idx_published_at` (`published_at`),
    KEY `idx_view_count` (`view_count`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`series_id`) REFERENCES `series` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文章标签关联表
DROP TABLE IF EXISTS `article_tags`;
CREATE TABLE `article_tags` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `article_id` int(11) NOT NULL,
    `tag_id` int(11) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_article_tag` (`article_id`, `tag_id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_tag_id` (`tag_id`),
    FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论表
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `article_id` int(11) NOT NULL,
    `parent_id` int(11) DEFAULT NULL,
    `author_name` varchar(100) NOT NULL,
    `author_email` varchar(100) NOT NULL,
    `author_url` varchar(255) DEFAULT NULL,
    `author_ip` varchar(45) DEFAULT NULL,
    `author_user_agent` text DEFAULT NULL,
    `content` text NOT NULL,
    `status` enum('pending', 'approved', 'spam', 'trash') DEFAULT 'pending',
    `is_admin` boolean DEFAULT FALSE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文件上传表
DROP TABLE IF EXISTS `uploads`;
CREATE TABLE `uploads` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `filename` varchar(255) NOT NULL,
    `original_name` varchar(255) NOT NULL,
    `file_path` varchar(500) NOT NULL,
    `file_url` varchar(500) NOT NULL,
    `file_size` bigint(20) DEFAULT NULL,
    `mime_type` varchar(100) DEFAULT NULL,
    `file_type` enum('image', 'document', 'video', 'audio', 'other') DEFAULT 'other',
    `uploader_id` int(11) DEFAULT NULL,
    `upload_ip` varchar(45) DEFAULT NULL,
    `is_used` boolean DEFAULT FALSE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_uploader_id` (`uploader_id`),
    KEY `idx_file_type` (`file_type`),
    KEY `idx_is_used` (`is_used`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统设置表
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `key` varchar(100) NOT NULL UNIQUE,
    `value` longtext,
    `type` enum('string', 'number', 'boolean', 'json', 'text') DEFAULT 'string',
    `group` varchar(50) DEFAULT 'general',
    `description` text,
    `is_public` boolean DEFAULT FALSE,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_key` (`key`),
    KEY `idx_group` (`group`),
    KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 访问日志表
DROP TABLE IF EXISTS `visit_logs`;
CREATE TABLE `visit_logs` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `article_id` int(11) DEFAULT NULL,
    `visitor_ip` varchar(45) NOT NULL,
    `user_agent` text,
    `referer` varchar(500) DEFAULT NULL,
    `page_url` varchar(500) NOT NULL,
    `session_id` varchar(100) DEFAULT NULL,
    `user_id` int(11) DEFAULT NULL,
    `visit_time` timestamp DEFAULT CURRENT_TIMESTAMP,
    `stay_duration` int(11) DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_visitor_ip` (`visitor_ip`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_visit_time` (`visit_time`),
    FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE SET NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户喜欢表
DROP TABLE IF EXISTS `user_likes`;
CREATE TABLE `user_likes` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `article_id` int(11) NOT NULL,
    `visitor_ip` varchar(45) DEFAULT NULL,
    `session_id` varchar(100) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_article` (`user_id`, `article_id`),
    UNIQUE KEY `uk_ip_article` (`visitor_ip`, `article_id`),
    KEY `idx_article_id` (`article_id`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 搜索记录表
DROP TABLE IF EXISTS `search_logs`;
CREATE TABLE `search_logs` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `keyword` varchar(200) NOT NULL,
    `result_count` int(11) DEFAULT 0,
    `visitor_ip` varchar(45) DEFAULT NULL,
    `user_id` int(11) DEFAULT NULL,
    `search_time` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_keyword` (`keyword`),
    KEY `idx_visitor_ip` (`visitor_ip`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_search_time` (`search_time`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认数据

-- 默认管理员用户 (密码: password)
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password_hash`, `display_name`, `role`, `status`, `email_verified`) VALUES
(1, 'admin', 'admin@blog.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', 'active', TRUE);

-- 默认分类
INSERT IGNORE INTO `categories` (`id`, `name`, `slug`, `description`, `sort_order`) VALUES
(1, '技术分享', 'tech', '技术相关的文章分享', 1),
(2, '生活随笔', 'life', '生活感悟和随笔', 2),
(3, '产品思考', 'product', '产品设计和思考', 3),
(4, '学习笔记', 'study', '学习过程中的笔记整理', 4);

-- 默认标签
INSERT IGNORE INTO `tags` (`id`, `name`, `slug`, `color`) VALUES
(1, 'JavaScript', 'javascript', '#f7df1e'),
(2, 'Go', 'golang', '#00add8'),
(3, 'React', 'react', '#61dafb'),
(4, 'Vue', 'vue', '#4fc08d'),
(5, 'MySQL', 'mysql', '#4479a1'),
(6, 'Docker', 'docker', '#2496ed'),
(7, '前端', 'frontend', '#e34c26'),
(8, '后端', 'backend', '#68217a'),
(9, '全栈', 'fullstack', '#f39c12'),
(10, '开源', 'opensource', '#28a745');

-- 默认系统设置
INSERT IGNORE INTO `settings` (`key`, `value`, `type`, `group`, `description`, `is_public`) VALUES
('site_title', 'My Blog', 'string', 'general', '网站标题', TRUE),
('site_description', 'A simple and elegant blog', 'string', 'general', '网站描述', TRUE),
('site_keywords', 'blog,tech,programming', 'string', 'seo', '网站关键词', TRUE),
('site_author', 'Blog Admin', 'string', 'general', '网站作者', TRUE),
('site_logo', '', 'string', 'general', '网站Logo', TRUE),
('site_favicon', '', 'string', 'general', '网站图标', TRUE),
('posts_per_page', '10', 'number', 'display', '每页文章数量', FALSE),
('comments_enabled', 'true', 'boolean', 'comments', '允许评论', TRUE),
('comments_require_approval', 'true', 'boolean', 'comments', '评论需要审核', FALSE),
('registration_enabled', 'false', 'boolean', 'users', '允许用户注册', FALSE),
('analytics_code', '', 'text', 'tracking', '统计代码', FALSE),
('email_notifications', 'true', 'boolean', 'notifications', '邮件通知', FALSE);

-- 创建索引优化查询性能
CREATE INDEX idx_articles_status_published ON articles(status, published_at DESC);
CREATE INDEX idx_articles_category_published ON articles(category_id, status, published_at DESC);
CREATE INDEX idx_articles_author_published ON articles(author_id, status, published_at DESC);
CREATE INDEX idx_comments_article_status ON comments(article_id, status, created_at DESC);
CREATE INDEX idx_visit_logs_article_time ON visit_logs(article_id, visit_time DESC);

-- 创建视图用于统计
CREATE OR REPLACE VIEW `article_stats` AS
SELECT 
    a.id,
    a.title,
    a.slug,
    a.view_count,
    a.like_count,
    a.comment_count,
    a.published_at,
    u.display_name as author_name,
    c.name as category_name,
    COUNT(DISTINCT at.tag_id) as tag_count
FROM articles a
LEFT JOIN users u ON a.author_id = u.id
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN article_tags at ON a.id = at.article_id
WHERE a.status = 'published'
GROUP BY a.id;

-- 创建存储过程用于更新文章统计
DELIMITER //
CREATE PROCEDURE UpdateArticleStats(IN article_id INT)
BEGIN
    DECLARE view_count INT DEFAULT 0;
    DECLARE like_count INT DEFAULT 0;
    DECLARE comment_count INT DEFAULT 0;
    
    -- 计算浏览量
    SELECT COUNT(*) INTO view_count 
    FROM visit_logs 
    WHERE article_id = article_id;
    
    -- 计算喜欢数
    SELECT COUNT(*) INTO like_count 
    FROM user_likes 
    WHERE article_id = article_id;
    
    -- 计算评论数
    SELECT COUNT(*) INTO comment_count 
    FROM comments 
    WHERE article_id = article_id AND status = 'approved';
    
    -- 更新文章统计
    UPDATE articles 
    SET 
        view_count = view_count,
        like_count = like_count,
        comment_count = comment_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = article_id;
END //
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;