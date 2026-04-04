package main

import (
	"context"
	"log"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
)

func main() {
	// 加载配置 (.env 等)
	if err := config.LoadConfig(); err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	// 检查是否启用了 GitHub 资产同步
	if !config.GlobalConfig.AssetSync.Enabled {
		log.Fatalf("错误: GitHub 资产同步未启用，请在环境变量中设置 AI_ASSET_GITHUB_ENABLED=true")
	}

	// 初始化数据库
	if err := database.InitDB(); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	log.Println("--- 开始执行 AI 资产批量导出任务 ---")

	var prompts []models.Prompt
	if err := database.DB.Find(&prompts).Error; err != nil {
		log.Fatalf("读取 Prompt 数据失败: %v", err)
	}

	var skills []models.Skill
	if err := database.DB.Preload("SupportingFiles").Find(&skills).Error; err != nil {
		log.Fatalf("读取 Skill 数据失败: %v", err)
	}

	syncService := services.NewGitHubAssetSyncService(config.GlobalConfig)
	ctx := context.Background()

	// 同步 Prompts
	log.Printf("准备同步 %d 条 Prompt...", len(prompts))
	if len(prompts) > 0 {
		err := syncService.BulkSyncPrompts(ctx, prompts)
		if err != nil {
			log.Fatalf("批量同步 Prompt 失败: %v", err)
		}
		log.Println("Prompt 同步完成！")
	} else {
		log.Println("没有可以同步的 Prompt，已跳过。")
	}

	// 同步 Skills
	log.Printf("准备同步 %d 条 Skill...", len(skills))
	if len(skills) > 0 {
		err := syncService.BulkSyncSkills(ctx, skills)
		if err != nil {
			log.Fatalf("批量同步 Skill 失败: %v", err)
		}
		log.Println("Skill 同步完成！")
	} else {
		log.Println("没有可以同步的 Skill，已跳过。")
	}

	log.Println("--- 批量导出任务执行成功 ---")
}
