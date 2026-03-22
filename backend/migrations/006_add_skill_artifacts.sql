ALTER TABLE IF EXISTS skills
    ADD COLUMN IF NOT EXISTS anthropic_config TEXT,
    ADD COLUMN IF NOT EXISTS supporting_files TEXT;
