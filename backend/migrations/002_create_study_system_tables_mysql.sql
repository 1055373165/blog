-- 学习系统相关表结构 - MySQL兼容版本

-- 创建学习计划表
CREATE TABLE IF NOT EXISTS study_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '学习计划名称',
    description TEXT COMMENT '学习计划描述',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',

    -- 学习算法配置
    spacing_algorithm VARCHAR(50) DEFAULT 'ebbinghaus' COMMENT '间隔算法类型',
    difficulty_level INT DEFAULT 3 CHECK (difficulty_level >= 1 AND difficulty_level <= 5) COMMENT '难度等级',

    -- 目标设置
    daily_goal INT DEFAULT 5 COMMENT '每日学习目标数量',
    weekly_goal INT DEFAULT 30 COMMENT '每周学习目标数量',
    monthly_goal INT DEFAULT 120 COMMENT '每月学习目标数量',

    -- 统计字段
    total_items INT DEFAULT 0 COMMENT '总学习项目数',
    completed_items INT DEFAULT 0 COMMENT '已完成项目数',
    mastered_items INT DEFAULT 0 COMMENT '已掌握项目数',

    -- 外键
    creator_id BIGINT UNSIGNED NOT NULL COMMENT '创建者ID',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_study_plans_creator (creator_id),
    INDEX idx_study_plans_active (is_active)
) COMMENT='学习计划表';

-- 创建学习项目表
CREATE TABLE IF NOT EXISTS study_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    study_plan_id BIGINT UNSIGNED NOT NULL COMMENT '学习计划ID',
    article_id BIGINT UNSIGNED NOT NULL COMMENT '文章ID',

    -- 学习状态
    status VARCHAR(20) DEFAULT 'new' COMMENT '学习状态',
    current_interval INT DEFAULT 1 COMMENT '当前间隔天数',
    ease_factor DECIMAL(4,2) DEFAULT 2.5 COMMENT 'SM2算法简易因子',
    consecutive_correct INT DEFAULT 0 COMMENT '连续正确次数',
    consecutive_failed INT DEFAULT 0 COMMENT '连续失败次数',

    -- 时间记录
    next_review_at TIMESTAMP NULL COMMENT '下次复习时间',
    last_reviewed_at TIMESTAMP NULL COMMENT '最后复习时间',
    first_studied_at TIMESTAMP NULL COMMENT '首次学习时间',
    mastered_at TIMESTAMP NULL COMMENT '掌握时间',

    -- 学习统计
    total_reviews INT DEFAULT 0 COMMENT '总复习次数',
    total_study_time INT DEFAULT 0 COMMENT '总学习时间(秒)',
    average_rating DECIMAL(3,2) DEFAULT 0 COMMENT '平均难度评分',

    -- 刻意练习数据
    weak_points TEXT COMMENT '薄弱知识点',
    study_notes TEXT COMMENT '学习笔记',
    personal_rating INT DEFAULT 0 COMMENT '个人掌握度评分1-10',
    importance_level INT DEFAULT 3 COMMENT '重要程度1-5',
    difficulty_level INT DEFAULT 3 COMMENT '难度等级1-5',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY uk_study_plan_article (study_plan_id, article_id),
    INDEX idx_study_items_plan (study_plan_id),
    INDEX idx_study_items_article (article_id),
    INDEX idx_study_items_status (status),
    INDEX idx_study_items_next_review (next_review_at),
    INDEX idx_study_items_mastered (mastered_at)
) COMMENT='学习项目表';

-- 创建学习记录表
CREATE TABLE IF NOT EXISTS study_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    study_item_id BIGINT UNSIGNED NOT NULL COMMENT '学习项目ID',

    -- 本次学习信息
    review_type VARCHAR(20) NOT NULL COMMENT '复习类型',
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5) COMMENT '难度评级1-5',
    study_time INT NOT NULL COMMENT '本次学习时间(秒)',
    completion BOOLEAN DEFAULT TRUE COMMENT '是否完成学习',

    -- 学习方式和内容
    study_method VARCHAR(50) COMMENT '学习方法',
    study_materials TEXT COMMENT '学习材料记录',
    notes TEXT COMMENT '本次学习笔记',
    key_points TEXT COMMENT '关键知识点',

    -- 学习效果评估
    understanding INT DEFAULT 0 CHECK (understanding >= 0 AND understanding <= 10) COMMENT '理解程度0-10',
    retention INT DEFAULT 0 CHECK (retention >= 0 AND retention <= 10) COMMENT '记忆保持度0-10',
    application INT DEFAULT 0 CHECK (application >= 0 AND application <= 10) COMMENT '应用能力0-10',
    confidence INT DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 10) COMMENT '信心程度0-10',

    -- 间隔重复算法数据
    previous_interval INT COMMENT '之前间隔',
    new_interval INT COMMENT '新间隔',
    previous_ease DECIMAL(4,2) COMMENT '之前简易因子',
    new_ease DECIMAL(4,2) COMMENT '新简易因子',

    -- 环境和设备信息
    device_type VARCHAR(50) COMMENT '设备类型',
    location VARCHAR(100) COMMENT '学习地点',
    time_of_day VARCHAR(20) COMMENT '学习时段',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_item_id) REFERENCES study_items(id) ON DELETE CASCADE,
    INDEX idx_study_logs_item (study_item_id),
    INDEX idx_study_logs_type (review_type),
    INDEX idx_study_logs_created (created_at)
) COMMENT='学习记录表';

-- 创建学习提醒表
CREATE TABLE IF NOT EXISTS study_reminders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    study_item_id BIGINT UNSIGNED NOT NULL COMMENT '学习项目ID',
    reminder_at TIMESTAMP NOT NULL COMMENT '提醒时间',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '提醒状态',

    -- 提醒类型和内容
    reminder_type VARCHAR(20) DEFAULT 'review' COMMENT '提醒类型',
    priority INT DEFAULT 3 CHECK (priority >= 1 AND priority <= 5) COMMENT '提醒优先级',
    title VARCHAR(255) COMMENT '提醒标题',
    message TEXT COMMENT '提醒内容',

    -- 提醒方式
    notification_method VARCHAR(50) DEFAULT 'system' COMMENT '通知方式',
    is_recurring BOOLEAN DEFAULT FALSE COMMENT '是否重复',
    recurrence_pattern VARCHAR(100) COMMENT '重复模式',

    -- 执行信息
    sent_at TIMESTAMP NULL COMMENT '发送时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    snooze_until TIMESTAMP NULL COMMENT '推迟到',
    attempt_count INT DEFAULT 0 COMMENT '尝试次数',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_item_id) REFERENCES study_items(id) ON DELETE CASCADE,
    INDEX idx_study_reminders_item (study_item_id),
    INDEX idx_study_reminders_time (reminder_at),
    INDEX idx_study_reminders_status (status)
) COMMENT='学习提醒表';

-- 创建学习分析表
CREATE TABLE IF NOT EXISTS study_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    study_plan_id BIGINT UNSIGNED NOT NULL COMMENT '学习计划ID',
    date VARCHAR(10) NOT NULL COMMENT '日期YYYY-MM-DD',
    period_type VARCHAR(10) NOT NULL COMMENT '周期类型',

    -- 基础学习统计
    items_reviewed INT DEFAULT 0 COMMENT '复习项目数',
    study_time INT DEFAULT 0 COMMENT '总学习时间(秒)',
    session_count INT DEFAULT 0 COMMENT '学习会话数',
    average_rating DECIMAL(3,2) DEFAULT 0 COMMENT '平均评分',
    completion_rate DECIMAL(5,2) DEFAULT 0 COMMENT '完成率',

    -- 学习进度统计
    new_items INT DEFAULT 0 COMMENT '新学习项目',
    reviewed_items INT DEFAULT 0 COMMENT '复习项目',
    mastered_items INT DEFAULT 0 COMMENT '掌握项目',
    failed_items INT DEFAULT 0 COMMENT '失败项目',

    -- 效率和质量指标
    efficiency_score DECIMAL(5,2) DEFAULT 0 COMMENT '学习效率分数',
    retention_rate DECIMAL(5,2) DEFAULT 0 COMMENT '知识保持率',
    progress_velocity DECIMAL(5,2) DEFAULT 0 COMMENT '进步速度',
    consistency_score DECIMAL(5,2) DEFAULT 0 COMMENT '学习一致性',

    -- 目标达成情况
    daily_goal_achieved BOOLEAN DEFAULT FALSE COMMENT '每日目标达成',
    weekly_goal_progress DECIMAL(5,2) DEFAULT 0 COMMENT '周目标进度',
    monthly_goal_progress DECIMAL(5,2) DEFAULT 0 COMMENT '月目标进度',

    -- 学习模式分析
    preferred_study_time VARCHAR(20) COMMENT '偏好学习时间',
    avg_session_duration INT DEFAULT 0 COMMENT '平均学习时长',
    most_used_method VARCHAR(50) COMMENT '最常用学习方法',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
    UNIQUE KEY uk_study_analytics_plan_date (study_plan_id, date, period_type),
    INDEX idx_study_analytics_plan (study_plan_id),
    INDEX idx_study_analytics_date (date),
    INDEX idx_study_analytics_period (period_type)
) COMMENT='学习分析表';

-- 插入一些默认配置
INSERT IGNORE INTO configs (`key`, `value`, `type`, description) VALUES
('study_system_enabled', 'true', 'bool', '是否启用学习系统'),
('default_spacing_algorithm', 'ebbinghaus', 'string', '默认间隔重复算法'),
('max_daily_reminders', '10', 'int', '每日最大提醒数量'),
('study_session_timeout', '3600', 'int', '学习会话超时时间(秒)'),
('mastery_threshold', '3', 'int', '掌握阈值(连续正确次数)'),
('difficulty_adjustment_factor', '0.2', 'string', '难度调整因子');