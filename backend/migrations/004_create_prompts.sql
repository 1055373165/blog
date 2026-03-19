-- 创建提示词表
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    tags TEXT,
    applicable_models TEXT,
    parent_id INTEGER REFERENCES prompts(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_prompts_slug ON prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_parent ON prompts(parent_id);
CREATE INDEX IF NOT EXISTS idx_prompts_author ON prompts(author_id);
CREATE INDEX IF NOT EXISTS idx_prompts_sort ON prompts(parent_id, sort_order, updated_at DESC);

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
