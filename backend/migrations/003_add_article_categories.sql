-- 创建文章-分类关联表（如果不存在则创建，用于多对多关系和排序）
-- 注意：GORM 会自动创建基础的 article_categories 表，但我们需要添加 sort_order 字段

-- 添加 sort_order 字段到 article_categories 表
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

-- 添加索引以优化分类内文章排序查询（如果不存在）
DROP PROCEDURE IF EXISTS add_sort_index;

DELIMITER //
CREATE PROCEDURE add_sort_index()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'article_categories' 
        AND INDEX_NAME = 'idx_article_categories_sort'
    ) THEN
        CREATE INDEX idx_article_categories_sort ON article_categories(category_id, sort_order);
    END IF;
END //
DELIMITER ;

CALL add_sort_index();
DROP PROCEDURE IF EXISTS add_sort_index;

-- 迁移现有数据：将 articles.category_id 数据迁移到关联表
-- 只迁移那些 category_id 不为空且尚未在关联表中的文章
INSERT INTO article_categories (article_id, category_id, sort_order)
SELECT id, category_id, 0 
FROM articles 
WHERE category_id IS NOT NULL 
  AND id NOT IN (SELECT article_id FROM article_categories);
