-- 学习系统相关表结构 - PostgreSQL版本

-- 创建学习计划表
CREATE TABLE IF NOT EXISTS study_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- 学习算法配置
    spacing_algorithm VARCHAR(50) DEFAULT 'ebbinghaus',
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),

    -- 目标设置
    daily_goal INTEGER DEFAULT 5,
    weekly_goal INTEGER DEFAULT 30,
    monthly_goal INTEGER DEFAULT 120,

    -- 统计字段
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    mastered_items INTEGER DEFAULT 0,

    -- 外键
    creator_id INTEGER NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_study_plans_creator ON study_plans(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_active ON study_plans(is_active);

-- 创建学习项目表
CREATE TABLE IF NOT EXISTS study_items (
    id SERIAL PRIMARY KEY,
    study_plan_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,

    -- 学习状态
    status VARCHAR(20) DEFAULT 'new',
    current_interval INTEGER DEFAULT 1,
    ease_factor DECIMAL(4,2) DEFAULT 2.5,
    consecutive_correct INTEGER DEFAULT 0,
    consecutive_failed INTEGER DEFAULT 0,

    -- 时间记录
    next_review_at TIMESTAMP NULL,
    last_reviewed_at TIMESTAMP NULL,
    first_studied_at TIMESTAMP NULL,
    mastered_at TIMESTAMP NULL,

    -- 学习统计
    total_reviews INTEGER DEFAULT 0,
    total_study_time INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,

    -- 刻意练习数据
    weak_points TEXT,
    study_notes TEXT,
    personal_rating INTEGER DEFAULT 0,
    importance_level INTEGER DEFAULT 3,
    difficulty_level INTEGER DEFAULT 3,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE (study_plan_id, article_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_study_items_plan ON study_items(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_items_article ON study_items(article_id);
CREATE INDEX IF NOT EXISTS idx_study_items_status ON study_items(status);
CREATE INDEX IF NOT EXISTS idx_study_items_next_review ON study_items(next_review_at);
CREATE INDEX IF NOT EXISTS idx_study_items_mastered ON study_items(mastered_at);

-- 创建学习记录表
CREATE TABLE IF NOT EXISTS study_logs (
    id SERIAL PRIMARY KEY,
    study_item_id INTEGER NOT NULL,

    -- 本次学习信息
    review_type VARCHAR(20) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    study_time INTEGER NOT NULL,
    completion BOOLEAN DEFAULT TRUE,

    -- 学习方式和内容
    study_method VARCHAR(50),
    study_materials TEXT,
    notes TEXT,
    key_points TEXT,

    -- 学习效果评估
    understanding INTEGER DEFAULT 0 CHECK (understanding >= 0 AND understanding <= 10),
    retention INTEGER DEFAULT 0 CHECK (retention >= 0 AND retention <= 10),
    application INTEGER DEFAULT 0 CHECK (application >= 0 AND application <= 10),
    confidence INTEGER DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 10),

    -- 间隔重复算法数据
    previous_interval INTEGER,
    new_interval INTEGER,
    previous_ease DECIMAL(4,2),
    new_ease DECIMAL(4,2),

    -- 环境和设备信息
    device_type VARCHAR(50),
    location VARCHAR(100),
    time_of_day VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_item_id) REFERENCES study_items(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_study_logs_item ON study_logs(study_item_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_type ON study_logs(review_type);
CREATE INDEX IF NOT EXISTS idx_study_logs_created ON study_logs(created_at);

-- 创建学习提醒表
CREATE TABLE IF NOT EXISTS study_reminders (
    id SERIAL PRIMARY KEY,
    study_item_id INTEGER NOT NULL,
    reminder_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',

    -- 提醒类型和内容
    reminder_type VARCHAR(20) DEFAULT 'review',
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    title VARCHAR(255),
    message TEXT,

    -- 提醒方式
    notification_method VARCHAR(50) DEFAULT 'system',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(100),

    -- 执行信息
    sent_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    snooze_until TIMESTAMP NULL,
    attempt_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_item_id) REFERENCES study_items(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_study_reminders_item ON study_reminders(study_item_id);
CREATE INDEX IF NOT EXISTS idx_study_reminders_time ON study_reminders(reminder_at);
CREATE INDEX IF NOT EXISTS idx_study_reminders_status ON study_reminders(status);

-- 创建学习分析表
CREATE TABLE IF NOT EXISTS study_analytics (
    id SERIAL PRIMARY KEY,
    study_plan_id INTEGER NOT NULL,
    date VARCHAR(10) NOT NULL,
    period_type VARCHAR(10) NOT NULL,

    -- 基础学习统计
    items_reviewed INTEGER DEFAULT 0,
    study_time INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,

    -- 学习进度统计
    new_items INTEGER DEFAULT 0,
    reviewed_items INTEGER DEFAULT 0,
    mastered_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,

    -- 效率和质量指标
    efficiency_score DECIMAL(5,2) DEFAULT 0,
    retention_rate DECIMAL(5,2) DEFAULT 0,
    progress_velocity DECIMAL(5,2) DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0,

    -- 目标达成情况
    daily_goal_achieved BOOLEAN DEFAULT FALSE,
    weekly_goal_progress DECIMAL(5,2) DEFAULT 0,
    monthly_goal_progress DECIMAL(5,2) DEFAULT 0,

    -- 学习模式分析
    preferred_study_time VARCHAR(20),
    avg_session_duration INTEGER DEFAULT 0,
    most_used_method VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    UNIQUE (study_plan_id, date, period_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_study_analytics_plan ON study_analytics(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_analytics_date ON study_analytics(date);
CREATE INDEX IF NOT EXISTS idx_study_analytics_period ON study_analytics(period_type);

-- 插入一些默认配置
INSERT INTO configs (key, value, type, description) VALUES
('study_system_enabled', 'true', 'bool', '是否启用学习系统'),
('default_spacing_algorithm', 'ebbinghaus', 'string', '默认间隔重复算法'),
('max_daily_reminders', '10', 'int', '每日最大提醒数量'),
('study_session_timeout', '3600', 'int', '学习会话超时时间(秒)'),
('mastery_threshold', '3', 'int', '掌握阈值(连续正确次数)'),
('difficulty_adjustment_factor', '0.2', 'string', '难度调整因子')
ON CONFLICT (key) DO NOTHING;