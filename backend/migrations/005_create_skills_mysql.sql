-- 创建技能表
CREATE TABLE IF NOT EXISTS skills (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    content LONGTEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    tags LONGTEXT,
    parent_id BIGINT UNSIGNED NULL,
    sort_order INT NOT NULL DEFAULT 0,
    author_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_skills_slug (slug),
    INDEX idx_skills_status (status),
    INDEX idx_skills_parent (parent_id),
    INDEX idx_skills_author (author_id),
    INDEX idx_skills_sort (parent_id, sort_order, updated_at),
    CONSTRAINT fk_skills_parent FOREIGN KEY (parent_id) REFERENCES skills(id) ON DELETE SET NULL,
    CONSTRAINT fk_skills_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
