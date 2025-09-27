package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"blog-backend/internal/models"
	"blog-backend/internal/services"
	"gorm.io/gorm"
)

type ReminderHandler struct {
	db              *gorm.DB
	reminderService *services.StudyReminderService
}

func NewReminderHandler(db *gorm.DB) *ReminderHandler {
	return &ReminderHandler{
		db:              db,
		reminderService: services.NewStudyReminderService(db),
	}
}

// GetReminders 获取用户的提醒列表
func (h *ReminderHandler) GetReminders(c *gin.Context) {
	// 管理员后台功能，无需身份验证，默认使用管理员ID
	userID := uint(1) // 默认管理员ID

	// 查询参数
	status := c.DefaultQuery("status", "pending")
	reminderType := c.DefaultQuery("type", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var reminders []models.StudyReminder
	var total int64

	query := h.db.Model(&models.StudyReminder{}).
		Preload("StudyItem.Article").
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ?", userID)

	if status != "all" {
		query = query.Where("study_reminders.status = ?", status)
	}

	if reminderType != "" {
		query = query.Where("study_reminders.reminder_type = ?", reminderType)
	}

	// 获取总数
	query.Count(&total)

	// 获取分页数据
	err := query.Order("study_reminders.priority DESC, study_reminders.reminder_at ASC").
		Offset(offset).Limit(limit).Find(&reminders).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取提醒列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reminders": reminders,
		"total":     total,
		"page":      page,
		"limit":     limit,
		"has_more":  total > int64(page*limit),
	})
}

// GetUnreadCount 获取未读提醒数量
func (h *ReminderHandler) GetUnreadCount(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	var count int64
	err := h.db.Model(&models.StudyReminder{}).
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ? AND study_reminders.status = 'pending'", userID).
		Count(&count).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取未读数量失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

// MarkAsRead 标记提醒为已读
func (h *ReminderHandler) MarkAsRead(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的提醒ID"})
		return
	}

	// 验证提醒是否属于当前用户
	var reminder models.StudyReminder
	err = h.db.Preload("StudyItem.StudyPlan").First(&reminder, uint(reminderID)).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "提醒不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找提醒失败"})
		return
	}

	// 检查权限
	if reminder.StudyItem.ID != 0 && reminder.StudyItem.StudyPlan.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限操作此提醒"})
		return
	}

	// 标记为已读
	err = h.reminderService.MarkReminderAsRead(uint(reminderID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "标记已读失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已标记为已读"})
}

// MarkAsCompleted 标记提醒为已完成
func (h *ReminderHandler) MarkAsCompleted(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的提醒ID"})
		return
	}

	// 验证权限（同上）
	var reminder models.StudyReminder
	err = h.db.Preload("StudyItem.StudyPlan").First(&reminder, uint(reminderID)).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "提醒不存在"})
		return
	}

	if reminder.StudyItem.ID != 0 && reminder.StudyItem.StudyPlan.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "无权限操作此提醒"})
		return
	}

	// 标记为已完成
	err = h.reminderService.MarkReminderAsCompleted(uint(reminderID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "标记完成失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "已标记为完成"})
}

// BatchMarkAsRead 批量标记为已读
func (h *ReminderHandler) BatchMarkAsRead(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	var req struct {
		ReminderIDs []uint `json:"reminder_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 批量更新
	err := h.db.Model(&models.StudyReminder{}).
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_reminders.id IN ? AND study_plans.creator_id = ?", req.ReminderIDs, userID).
		Update("status", "read").Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "批量标记失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "批量标记成功"})
}

// CreateManualReminder 创建手动提醒
func (h *ReminderHandler) CreateManualReminder(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	var req struct {
		StudyItemID *uint  `json:"study_item_id"`
		Title       string `json:"title" binding:"required"`
		Message     string `json:"message" binding:"required"`
		ReminderAt  string `json:"reminder_at" binding:"required"`
		Priority    int    `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 解析时间
	reminderTime, err := time.Parse("2006-01-02T15:04:05Z07:00", req.ReminderAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "时间格式错误"})
		return
	}

	// 如果指定了学习项目，验证权限
	if req.StudyItemID != nil {
		var studyItem models.StudyItem
		err := h.db.Preload("StudyPlan").First(&studyItem, *req.StudyItemID).Error
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习项目不存在"})
			return
		}
		if studyItem.StudyPlan.CreatorID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "无权限操作此学习项目"})
			return
		}
	}

	// 创建提醒
	reminder := models.StudyReminder{
		StudyItemID:        func() uint {
			if req.StudyItemID != nil {
				return *req.StudyItemID
			}
			return 0
		}(),
		ReminderAt:         reminderTime,
		Status:             "pending",
		ReminderType:       "manual",
		Priority:           req.Priority,
		Title:              req.Title,
		Message:            req.Message,
		NotificationMethod: "system",
	}

	if err := h.db.Create(&reminder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建提醒失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "提醒创建成功",
		"reminder": reminder,
	})
}

// GetReminderStats 获取提醒统计
func (h *ReminderHandler) GetReminderStats(c *gin.Context) {
	// 管理员后台功能，无需身份验证
	userID := uint(1) // 默认管理员ID

	var stats struct {
		TotalReminders    int64 `json:"total_reminders"`
		PendingReminders  int64 `json:"pending_reminders"`
		CompletedToday    int64 `json:"completed_today"`
		OverdueReminders  int64 `json:"overdue_reminders"`
	}

	baseQuery := h.db.Model(&models.StudyReminder{}).
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ?", userID)

	// 总提醒数
	baseQuery.Count(&stats.TotalReminders)

	// 待处理提醒数
	baseQuery.Where("study_reminders.status = 'pending'").Count(&stats.PendingReminders)

	// 今日完成数
	today := time.Now().Format("2006-01-02")
	h.db.Model(&models.StudyReminder{}).
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ? AND study_reminders.status = 'completed' AND DATE(study_reminders.completed_at) = ?", 
			userID, today).
		Count(&stats.CompletedToday)

	// 逾期提醒数
	h.db.Model(&models.StudyReminder{}).
		Joins("LEFT JOIN study_items ON study_reminders.study_item_id = study_items.id").
		Joins("LEFT JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ? AND study_reminders.status = 'pending' AND study_reminders.reminder_at < ?", 
			userID, time.Now()).
		Count(&stats.OverdueReminders)

	c.JSON(http.StatusOK, stats)
}
