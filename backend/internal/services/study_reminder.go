package services

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
	"blog-backend/internal/models"
)

type StudyReminderService struct {
	db *gorm.DB
}

func NewStudyReminderService(db *gorm.DB) *StudyReminderService {
	return &StudyReminderService{db: db}
}

// ReminderType 提醒类型
type ReminderType string

const (
	ReminderTypeReview     ReminderType = "review"     // 复习提醒
	ReminderTypeGoal       ReminderType = "goal"       // 目标提醒
	ReminderTypeOverdue    ReminderType = "overdue"    // 逾期提醒
	ReminderTypeAchievement ReminderType = "achievement" // 成就提醒
)

// StudyReminder 学习提醒结构
type StudyReminder struct {
	ID              uint         `json:"id"`
	UserID          uint         `json:"user_id"`
	StudyItemID     *uint        `json:"study_item_id,omitempty"`
	StudyPlanID     *uint        `json:"study_plan_id,omitempty"`
	Type            ReminderType `json:"type"`
	Title           string       `json:"title"`
	Message         string       `json:"message"`
	Priority        int          `json:"priority"` // 1-5, 5最高
	ScheduledAt     time.Time    `json:"scheduled_at"`
	IsRead          bool         `json:"is_read"`
	IsCompleted     bool         `json:"is_completed"`
	ActionURL       string       `json:"action_url,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
}

// CreateReviewReminders 创建复习提醒
func (s *StudyReminderService) CreateReviewReminders() error {
	// 查找需要复习的学习项目
	var studyItems []models.StudyItem
	now := time.Now()

	err := s.db.Preload("Article").Preload("StudyPlan").
		Where("next_review_at <= ? AND status != 'mastered'", now).
		Find(&studyItems).Error

	if err != nil {
		return fmt.Errorf("查询需要复习的项目失败: %v", err)
	}

	for _, item := range studyItems {
		// 检查是否已经有未读的复习提醒
		var existingReminder models.StudyReminder
		err := s.db.Where("study_item_id = ? AND status = 'pending' AND reminder_type = 'review'",
			item.ID).First(&existingReminder).Error

		if err == gorm.ErrRecordNotFound {
			// 创建新的复习提醒
			reminder := models.StudyReminder{
				StudyItemID:    item.ID,
				ReminderAt:     *item.NextReviewAt,
				Status:         "pending",
				ReminderType:   "review",
				Priority:       s.calculatePriority(item),
				Title:          fmt.Sprintf("复习提醒：%s", item.Article.Title),
				Message:        s.generateReviewMessage(item),
				NotificationMethod: "system",
			}

			if err := s.db.Create(&reminder).Error; err != nil {
				log.Printf("创建复习提醒失败: %v", err)
				continue
			}
		}
	}

	return nil
}

// CreateRemindersForStudyPlan 为学习计划创建提醒（包括新项目）
func (s *StudyReminderService) CreateRemindersForStudyPlan(studyPlanID uint) error {
	// 首先为新的学习项目设置初始复习时间
	if err := s.initializeNewStudyItems(studyPlanID); err != nil {
		return fmt.Errorf("初始化新学习项目失败: %v", err)
	}

	// 然后创建各种类型的提醒
	if err := s.createReviewRemindersForPlan(studyPlanID); err != nil {
		return fmt.Errorf("创建复习提醒失败: %v", err)
	}

	if err := s.createGoalRemindersForPlan(studyPlanID); err != nil {
		return fmt.Errorf("创建目标提醒失败: %v", err)
	}

	return nil
}

// initializeNewStudyItems 为新的学习项目设置初始复习时间
func (s *StudyReminderService) initializeNewStudyItems(studyPlanID uint) error {
	var newItems []models.StudyItem
	err := s.db.Where("study_plan_id = ? AND status = 'new' AND next_review_at IS NULL",
		studyPlanID).Find(&newItems).Error

	if err != nil {
		return err
	}

	now := time.Now()
	for _, item := range newItems {
		// 设置初始复习时间（24小时后开始第一次复习）
		initialReviewTime := now.Add(24 * time.Hour)

		err := s.db.Model(&item).Updates(map[string]interface{}{
			"next_review_at": initialReviewTime,
			"status":        "learning",
		}).Error

		if err != nil {
			log.Printf("更新学习项目失败: %v", err)
			continue
		}
	}

	return nil
}

// createReviewRemindersForPlan 为特定学习计划创建复习提醒
func (s *StudyReminderService) createReviewRemindersForPlan(studyPlanID uint) error {
	var studyItems []models.StudyItem
	now := time.Now()

	err := s.db.Preload("Article").Preload("StudyPlan").
		Where("study_plan_id = ? AND next_review_at <= ? AND status != 'mastered'",
			studyPlanID, now.Add(7*24*time.Hour)). // 查找一周内需要复习的项目
		Find(&studyItems).Error

	if err != nil {
		return err
	}

	for _, item := range studyItems {
		// 检查是否已经有未读的复习提醒
		var existingReminder models.StudyReminder
		err := s.db.Where("study_item_id = ? AND status = 'pending' AND reminder_type = 'review'",
			item.ID).First(&existingReminder).Error

		if err == gorm.ErrRecordNotFound {
			// 创建新的复习提醒
			reminder := models.StudyReminder{
				StudyItemID:    item.ID,
				ReminderAt:     *item.NextReviewAt,
				Status:         "pending",
				ReminderType:   "review",
				Priority:       s.calculatePriority(item),
				Title:          fmt.Sprintf("复习提醒：%s", item.Article.Title),
				Message:        s.generateReviewMessage(item),
				NotificationMethod: "system",
			}

			if err := s.db.Create(&reminder).Error; err != nil {
				log.Printf("创建复习提醒失败: %v", err)
				continue
			}
		}
	}

	return nil
}

// createGoalRemindersForPlan 为特定学习计划创建目标提醒
func (s *StudyReminderService) createGoalRemindersForPlan(studyPlanID uint) error {
	var plan models.StudyPlan
	err := s.db.First(&plan, studyPlanID).Error
	if err != nil {
		return err
	}

	if !plan.IsActive {
		return nil // 非活跃计划不创建目标提醒
	}

	now := time.Now()
	today := now.Format("2006-01-02")

	// 检查今日学习进度
	var todayCount int64
	s.db.Model(&models.StudyLog{}).
		Joins("JOIN study_items ON study_logs.study_item_id = study_items.id").
		Where("study_items.study_plan_id = ? AND DATE(study_logs.created_at) = ?",
			studyPlanID, today).
		Count(&todayCount)

	// 如果未达到每日目标，创建提醒
	if int(todayCount) < plan.DailyGoal {
		remaining := plan.DailyGoal - int(todayCount)

		reminder := models.StudyReminder{
			StudyItemID:    0, // 目标提醒不关联具体项目
			ReminderAt:     now.Add(2 * time.Hour), // 2小时后提醒
			Status:         "pending",
			ReminderType:   "goal",
			Priority:       3,
			Title:          fmt.Sprintf("%s - 每日学习目标提醒", plan.Name),
			Message:        fmt.Sprintf("您今天还需要学习 %d 个项目才能完成每日目标", remaining),
			NotificationMethod: "system",
		}

		// 检查是否已有今日目标提醒
		var existingReminder models.StudyReminder
		err := s.db.Where("reminder_type = 'goal' AND DATE(created_at) = ? AND status = 'pending' AND title LIKE ?",
			today, fmt.Sprintf("%%%s%%", plan.Name)).First(&existingReminder).Error

		if err == gorm.ErrRecordNotFound {
			s.db.Create(&reminder)
		}
	}

	return nil
}

// CreateGoalReminders 创建目标提醒
func (s *StudyReminderService) CreateGoalReminders() error {
	// 查找活跃的学习计划
	var studyPlans []models.StudyPlan
	err := s.db.Where("is_active = true").Find(&studyPlans).Error
	if err != nil {
		return fmt.Errorf("查询学习计划失败: %v", err)
	}

	now := time.Now()
	today := now.Format("2006-01-02")
	
	for _, plan := range studyPlans {
		// 检查今日学习进度
		var todayCount int64
		s.db.Model(&models.StudyLog{}).
			Joins("JOIN study_items ON study_logs.study_item_id = study_items.id").
			Where("study_items.study_plan_id = ? AND DATE(study_logs.created_at) = ?", 
				plan.ID, today).
			Count(&todayCount)
		
		// 如果未达到每日目标，创建提醒
		if int(todayCount) < plan.DailyGoal {
			remaining := plan.DailyGoal - int(todayCount)
			
			reminder := models.StudyReminder{
				StudyItemID:    0, // 目标提醒不关联具体项目
				ReminderAt:     now.Add(time.Hour), // 1小时后提醒
				Status:         "pending",
				ReminderType:   "goal",
				Priority:       3,
				Title:          "每日学习目标提醒",
				Message:        fmt.Sprintf("您今天还需要学习 %d 个项目才能完成每日目标", remaining),
				NotificationMethod: "system",
			}
			
			// 检查是否已有今日目标提醒
			var existingReminder models.StudyReminder
			err := s.db.Where("reminder_type = 'goal' AND DATE(created_at) = ? AND status = 'pending'", 
				today).First(&existingReminder).Error
			
			if err == gorm.ErrRecordNotFound {
				s.db.Create(&reminder)
			}
		}
	}
	
	return nil
}

// CreateOverdueReminders 创建逾期提醒
func (s *StudyReminderService) CreateOverdueReminders() error {
	var overdueItems []models.StudyItem
	now := time.Now()
	threeDaysAgo := now.AddDate(0, 0, -3)
	
	err := s.db.Preload("Article").
		Where("next_review_at < ? AND next_review_at > ? AND status != 'mastered'", 
			threeDaysAgo, now).
		Find(&overdueItems).Error
	
	if err != nil {
		return fmt.Errorf("查询逾期项目失败: %v", err)
	}

	for _, item := range overdueItems {
		overdueDays := int(now.Sub(*item.NextReviewAt).Hours() / 24)
		
		reminder := models.StudyReminder{
			StudyItemID:    item.ID,
			ReminderAt:     now,
			Status:         "pending",
			ReminderType:   "overdue",
			Priority:       4, // 逾期提醒优先级较高
			Title:          fmt.Sprintf("逾期提醒：%s", item.Article.Title),
			Message:        fmt.Sprintf("该项目已逾期 %d 天，建议尽快复习", overdueDays),
			NotificationMethod: "system",
		}
		
		// 检查是否已有逾期提醒
		var existingReminder models.StudyReminder
		err := s.db.Where("study_item_id = ? AND reminder_type = 'overdue' AND status = 'pending'", 
			item.ID).First(&existingReminder).Error
		
		if err == gorm.ErrRecordNotFound {
			s.db.Create(&reminder)
		}
	}
	
	return nil
}

// GetPendingReminders 获取待处理的提醒
func (s *StudyReminderService) GetPendingReminders(userID uint) ([]models.StudyReminder, error) {
	var reminders []models.StudyReminder
	
	// 通过学习计划关联用户
	err := s.db.Preload("StudyItem.Article").
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ? AND study_reminders.status = 'pending' AND study_reminders.reminder_at <= ?", 
			userID, time.Now()).
		Order("study_reminders.priority DESC, study_reminders.reminder_at ASC").
		Find(&reminders).Error
	
	return reminders, err
}

// MarkReminderAsRead 标记提醒为已读
func (s *StudyReminderService) MarkReminderAsRead(reminderID uint) error {
	return s.db.Model(&models.StudyReminder{}).
		Where("id = ?", reminderID).
		Update("status", "read").Error
}

// MarkReminderAsCompleted 标记提醒为已完成
func (s *StudyReminderService) MarkReminderAsCompleted(reminderID uint) error {
	return s.db.Model(&models.StudyReminder{}).
		Where("id = ?", reminderID).
		Updates(map[string]interface{}{
			"status":       "completed",
			"completed_at": time.Now(),
		}).Error
}

// calculatePriority 计算提醒优先级
func (s *StudyReminderService) calculatePriority(item models.StudyItem) int {
	priority := 3 // 默认优先级
	
	// 根据重要程度调整
	priority += item.ImportanceLevel - 3
	
	// 根据连续失败次数调整
	if item.ConsecutiveFailed > 2 {
		priority += 1
	}
	
	// 确保优先级在1-5范围内
	if priority < 1 {
		priority = 1
	}
	if priority > 5 {
		priority = 5
	}
	
	return priority
}

// generateReviewMessage 生成复习消息
func (s *StudyReminderService) generateReviewMessage(item models.StudyItem) string {
	messages := []string{
		fmt.Sprintf("根据%s算法，现在是复习《%s》的最佳时机", 
			s.getAlgorithmName(item.StudyPlan.SpacingAlgorithm), item.Article.Title),
		fmt.Sprintf("您已经学习《%s》%d次，继续巩固知识吧！", 
			item.Article.Title, item.TotalReviews),
		fmt.Sprintf("复习《%s》可以帮助您更好地掌握相关知识", item.Article.Title),
	}
	
	// 根据学习历史选择合适的消息
	if item.TotalReviews == 0 {
		return messages[2]
	} else if item.TotalReviews < 3 {
		return messages[0]
	} else {
		return messages[1]
	}
}

// getAlgorithmName 获取算法中文名称
func (s *StudyReminderService) getAlgorithmName(algorithm string) string {
	switch algorithm {
	case "ebbinghaus":
		return "艾宾浩斯遗忘曲线"
	case "sm2":
		return "SuperMemo 2"
	case "anki":
		return "Anki"
	default:
		return "间隔重复"
	}
}

// StartReminderScheduler 启动提醒调度器
func (s *StudyReminderService) StartReminderScheduler() {
	// 每小时检查一次复习提醒
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				if err := s.CreateReviewReminders(); err != nil {
					log.Printf("创建复习提醒失败: %v", err)
				}
				if err := s.CreateOverdueReminders(); err != nil {
					log.Printf("创建逾期提醒失败: %v", err)
				}
			}
		}
	}()
	
	// 每天早上8点检查目标提醒
	go func() {
		for {
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day(), 8, 0, 0, 0, now.Location())
			if next.Before(now) {
				next = next.Add(24 * time.Hour)
			}
			
			time.Sleep(time.Until(next))
			
			if err := s.CreateGoalReminders(); err != nil {
				log.Printf("创建目标提醒失败: %v", err)
			}
		}
	}()
	
	log.Println("学习提醒调度器已启动")
}
