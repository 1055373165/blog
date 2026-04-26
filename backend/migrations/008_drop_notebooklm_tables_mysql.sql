-- 008_drop_notebooklm_tables_mysql.sql
-- 删除 NotebookLM 导入功能相关的 4 张表（功能已下线）。
-- 这些表此前由 GORM AutoMigrate 自动创建，没有 *_create_*.sql 对应。
-- 顺序: 先删带外键的子表（artifacts / capture_events / import_jobs），最后删父表 notebooks。
-- 使用 DROP TABLE IF EXISTS 保证幂等：未创建过这些表的环境（如全新 DB）也能安全执行。

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notebooklm_capture_events;
DROP TABLE IF EXISTS notebooklm_import_artifacts;
DROP TABLE IF EXISTS notebooklm_import_jobs;
DROP TABLE IF EXISTS notebooklm_notebooks;

SET FOREIGN_KEY_CHECKS = 1;
