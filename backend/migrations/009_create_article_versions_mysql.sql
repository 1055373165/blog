-- 009_create_article_versions_mysql.sql
-- 文章版本快照表：每次 content 变更前自动 snapshot 旧版本，
-- 用户也可手动「设为稳定版本」生成 is_stable=1 的永久版本。
-- 设计目标：以后再有 bug / 误操作清空 content，都能从这里 1-click 恢复。

CREATE TABLE IF NOT EXISTS article_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT UNSIGNED NOT NULL,

    version_no INT NOT NULL,                       -- 1, 2, 3 ... 单调递增
    label VARCHAR(100) NOT NULL DEFAULT '',        -- 用户备注，如 "稳定版"
    is_stable TINYINT(1) NOT NULL DEFAULT 0,       -- 是否手动标记为稳定版，永不被自动清理
    is_autosave TINYINT(1) NOT NULL DEFAULT 1,     -- 是否系统自动 snapshot 产生

    -- 文章主体快照（与 articles 表关键字段一一对应）
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt LONGTEXT,
    content LONGTEXT NOT NULL,
    cover_image LONGTEXT,
    meta_title LONGTEXT,
    meta_description LONGTEXT,
    meta_keywords LONGTEXT,

    created_by BIGINT UNSIGNED NOT NULL,           -- 触发本次 snapshot 的用户 id
    created_at DATETIME NOT NULL,

    UNIQUE KEY uk_article_version (article_id, version_no),
    INDEX idx_versions_article_created (article_id, created_at DESC),
    INDEX idx_versions_article_stable (article_id, is_stable, version_no DESC),
    CONSTRAINT fk_versions_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
