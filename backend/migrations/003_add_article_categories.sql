-- 创建文章-分类关联表（如果不存在则创建，用于多对多关系和排序）

-- 首先创建 article_categories 表（如果不存在）
CREATE TABLE IF NOT EXISTS article_categories (
    article_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (article_id, category_id),
    INDEX idx_article_categories_category (category_id),
    INDEX idx_article_categories_sort (category_id, sort_order),
    CONSTRAINT fk_article_categories_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_article_categories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 如果表已存在但没有 sort_order 字段，添加它
-- 使用存储过程处理列是否存在的检查（兼容旧版 MySQL）
DROP PROCEDURE IF EXISTS add_sort_order_column;

DELIMITER //
CREATE PROCEDURE add_sort_order_column()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'article_categories' 
        AND COLUMN_NAME = 'sort_order'
    ) THEN
        ALTER TABLE article_categories ADD COLUMN sort_order INT DEFAULT 0;
    END IF;
END //
DELIMITER ;

CALL add_sort_order_column();
DROP PROCEDURE IF EXISTS add_sort_order_column;

-- 迁移现有数据：将 articles.category_id 数据迁移到关联表
-- 只迁移那些 category_id 不为空且尚未在关联表中的文章
INSERT IGNORE INTO article_categories (article_id, category_id, sort_order)
SELECT id, category_id, 0 
FROM articles 
WHERE category_id IS NOT NULL;
