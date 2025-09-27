package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"backend/internal/models"
	"backend/internal/services"
)

// StudyHandler 学习系统处理器
type StudyHandler struct {
	db        *gorm.DB
	algorithm *services.StudyAlgorithmService
}

// NewStudyHandler 创建学习系统处理器
func NewStudyHandler(db *gorm.DB) *StudyHandler {
	config := services.StudyAlgorithmConfig{
		Algorithm:              "ebbinghaus",
		EasyFactor:            1.3,
		DifficultyFactor:      0.8,
		MasteryThreshold:      3,
		MinInterval:           1,
		MaxInterval:           365,
		FailurePenalty:        0.2,
		ConsistencyBonus:      0.1,
		PersonalizedAdjustment: true,
	}

	return &StudyHandler{
		db:        db,
		algorithm: services.NewStudyAlgorithmService(config),
	}
}

// 学习计划相关API

// CreateStudyPlan 创建学习计划
func (h *StudyHandler) CreateStudyPlan(c *gin.Context) {
	var req struct {
		Name             string `json:"name" binding:"required"`
		Description      string `json:"description"`
		SpacingAlgorithm string `json:"spacing_algorithm"`
		DifficultyLevel  int    `json:"difficulty_level"`
		DailyGoal        int    `json:"daily_goal"`
		WeeklyGoal       int    `json:"weekly_goal"`
		MonthlyGoal      int    `json:"monthly_goal"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取当前用户ID（从认证中间件获取）
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未找到用户信息"})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户ID格式错误"})
		return
	}

	plan := models.StudyPlan{
		Name:             req.Name,
		Description:      req.Description,
		SpacingAlgorithm: req.SpacingAlgorithm,
		DifficultyLevel:  req.DifficultyLevel,
		DailyGoal:        req.DailyGoal,
		WeeklyGoal:       req.WeeklyGoal,
		MonthlyGoal:      req.MonthlyGoal,
		CreatorID:        userID,
		IsActive:         true,
	}

	if err := h.db.Create(&plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建学习计划失败"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "学习计划创建成功",
		"plan":    plan,
	})
}

// GetStudyPlans 获取学习计划列表
func (h *StudyHandler) GetStudyPlans(c *gin.Context) {
	var plans []models.StudyPlan

	// 查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	isActive := c.DefaultQuery("is_active", "")

	offset := (page - 1) * limit

	query := h.db.Model(&models.StudyPlan{}).Preload("Creator")

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else {
			query = query.Where("is_active = ?", false)
		}
	}

	var total int64
	query.Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&plans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取学习计划失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetStudyPlan 获取单个学习计划详情
func (h *StudyHandler) GetStudyPlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	var plan models.StudyPlan
	if err := h.db.Preload("Creator").Preload("StudyItems").Preload("StudyItems.Article").First(&plan, uint(id)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习计划不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取学习计划失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"plan": plan})
}

// UpdateStudyPlan 更新学习计划
func (h *StudyHandler) UpdateStudyPlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	var req struct {
		Name             string `json:"name"`
		Description      string `json:"description"`
		SpacingAlgorithm string `json:"spacing_algorithm"`
		DifficultyLevel  int    `json:"difficulty_level"`
		DailyGoal        int    `json:"daily_goal"`
		WeeklyGoal       int    `json:"weekly_goal"`
		MonthlyGoal      int    `json:"monthly_goal"`
		IsActive         *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan models.StudyPlan
	if err := h.db.First(&plan, uint(id)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习计划不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找学习计划失败"})
		return
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.SpacingAlgorithm != "" {
		updates["spacing_algorithm"] = req.SpacingAlgorithm
	}
	if req.DifficultyLevel > 0 {
		updates["difficulty_level"] = req.DifficultyLevel
	}
	if req.DailyGoal > 0 {
		updates["daily_goal"] = req.DailyGoal
	}
	if req.WeeklyGoal > 0 {
		updates["weekly_goal"] = req.WeeklyGoal
	}
	if req.MonthlyGoal > 0 {
		updates["monthly_goal"] = req.MonthlyGoal
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := h.db.Model(&plan).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新学习计划失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "学习计划更新成功",
		"plan":    plan,
	})
}

// DeleteStudyPlan 删除学习计划
func (h *StudyHandler) DeleteStudyPlan(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	if err := h.db.Delete(&models.StudyPlan{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除学习计划失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "学习计划删除成功"})
}

// 学习项目相关API

// AddArticleToStudyPlan 添加文章到学习计划
func (h *StudyHandler) AddArticleToStudyPlan(c *gin.Context) {
	planID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	var req struct {
		ArticleID       uint   `json:"article_id" binding:"required"`
		ImportanceLevel int    `json:"importance_level"`
		DifficultyLevel int    `json:"difficulty_level"`
		StudyNotes      string `json:"study_notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查学习计划是否存在
	var plan models.StudyPlan
	if err := h.db.First(&plan, uint(planID)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习计划不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找学习计划失败"})
		return
	}

	// 检查文章是否存在
	var article models.Article
	if err := h.db.First(&article, req.ArticleID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找文章失败"})
		return
	}

	// 检查是否已经添加
	var existingItem models.StudyItem
	if err := h.db.Where("study_plan_id = ? AND article_id = ?", planID, req.ArticleID).First(&existingItem).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "文章已在学习计划中"})
		return
	}

	// 创建学习项目
	studyItem := models.StudyItem{
		StudyPlanID:     uint(planID),
		ArticleID:       req.ArticleID,
		Status:          "new",
		CurrentInterval: 1,
		EaseFactor:      2.5,
		ImportanceLevel: req.ImportanceLevel,
		DifficultyLevel: req.DifficultyLevel,
		StudyNotes:      req.StudyNotes,
	}

	if err := h.db.Create(&studyItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加文章到学习计划失败"})
		return
	}

	// 更新学习计划统计
	h.db.Model(&plan).Update("total_items", gorm.Expr("total_items + 1"))

	c.JSON(http.StatusCreated, gin.H{
		"message":    "文章已添加到学习计划",
		"study_item": studyItem,
	})
}

// GetStudyItems 获取学习项目列表
func (h *StudyHandler) GetStudyItems(c *gin.Context) {
	planID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	var items []models.StudyItem

	// 查询参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	status := c.DefaultQuery("status", "")

	offset := (page - 1) * limit

	query := h.db.Model(&models.StudyItem{}).Where("study_plan_id = ?", planID).Preload("Article")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取学习项目失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// RemoveStudyItem 移除学习项目
func (h *StudyHandler) RemoveStudyItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("item_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习项目ID"})
		return
	}

	var item models.StudyItem
	if err := h.db.First(&item, uint(id)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习项目不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找学习项目失败"})
		return
	}

	if err := h.db.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除学习项目失败"})
		return
	}

	// 更新学习计划统计
	var plan models.StudyPlan
	if err := h.db.First(&plan, item.StudyPlanID).Error; err == nil {
		h.db.Model(&plan).Update("total_items", gorm.Expr("total_items - 1"))
	}

	c.JSON(http.StatusOK, gin.H{"message": "学习项目已移除"})
}

// 学习进度相关API

// RecordStudySession 记录学习会话
func (h *StudyHandler) RecordStudySession(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("item_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习项目ID"})
		return
	}

	var req struct {
		Rating        int    `json:"rating" binding:"required,min=1,max=5"`
		StudyTime     int    `json:"study_time" binding:"required,min=1"`
		Understanding int    `json:"understanding" binding:"min=0,max=10"`
		Retention     int    `json:"retention" binding:"min=0,max=10"`
		Application   int    `json:"application" binding:"min=0,max=10"`
		Confidence    int    `json:"confidence" binding:"min=0,max=10"`
		StudyMethod   string `json:"study_method"`
		Notes         string `json:"notes"`
		KeyPoints     string `json:"key_points"`
		DeviceType    string `json:"device_type"`
		Location      string `json:"location"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取学习项目
	var item models.StudyItem
	if err := h.db.First(&item, uint(id)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习项目不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找学习项目失败"})
		return
	}

	// 构建学习会话数据
	session := services.StudySession{
		StudyItemID:        item.ID,
		CurrentStatus:      item.Status,
		CurrentInterval:    item.CurrentInterval,
		CurrentEaseFactor:  item.EaseFactor,
		ConsecutiveCorrect: item.ConsecutiveCorrect,
		ConsecutiveFailed:  item.ConsecutiveFailed,
		TotalReviews:       item.TotalReviews,
		PersonalRating:     item.PersonalRating,
		DifficultyLevel:    item.DifficultyLevel,
		ImportanceLevel:    item.ImportanceLevel,
	}

	if item.LastReviewedAt != nil {
		session.LastReviewTime = *item.LastReviewedAt
	}

	// 构建学习反馈
	response := services.StudyResponse{
		Rating:        req.Rating,
		StudyTime:     req.StudyTime,
		Understanding: req.Understanding,
		Retention:     req.Retention,
		Application:   req.Application,
		Confidence:    req.Confidence,
		StudyMethod:   req.StudyMethod,
		Notes:         req.Notes,
	}

	// 验证学习反馈
	if err := h.algorithm.ValidateStudyResponse(response); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 计算下次复习时间
	result := h.algorithm.CalculateNextReview(session, response)

	// 记录当前时间
	now := time.Now()

	// 创建学习记录
	studyLog := models.StudyLog{
		StudyItemID:      item.ID,
		ReviewType:       "review",
		Rating:           req.Rating,
		StudyTime:        req.StudyTime,
		Understanding:    req.Understanding,
		Retention:        req.Retention,
		Application:      req.Application,
		Confidence:       req.Confidence,
		StudyMethod:      req.StudyMethod,
		Notes:            req.Notes,
		KeyPoints:        req.KeyPoints,
		DeviceType:       req.DeviceType,
		Location:         req.Location,
		PreviousInterval: item.CurrentInterval,
		NewInterval:      result.NewInterval,
		PreviousEase:     item.EaseFactor,
		NewEase:          result.NewEaseFactor,
	}

	// 确定学习时段
	hour := now.Hour()
	if hour >= 6 && hour < 12 {
		studyLog.TimeOfDay = "morning"
	} else if hour >= 12 && hour < 18 {
		studyLog.TimeOfDay = "afternoon"
	} else if hour >= 18 && hour < 22 {
		studyLog.TimeOfDay = "evening"
	} else {
		studyLog.TimeOfDay = "night"
	}

	if err := h.db.Create(&studyLog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建学习记录失败"})
		return
	}

	// 更新学习项目
	updates := map[string]interface{}{
		"current_interval":    result.NewInterval,
		"ease_factor":        result.NewEaseFactor,
		"next_review_at":     result.NextReviewTime,
		"last_reviewed_at":   now,
		"total_reviews":      gorm.Expr("total_reviews + 1"),
		"total_study_time":   gorm.Expr("total_study_time + ?", req.StudyTime),
		"average_rating":     gorm.Expr("(average_rating * total_reviews + ?) / (total_reviews + 1)", req.Rating),
	}

	// 设置首次学习时间
	if item.FirstStudiedAt == nil {
		updates["first_studied_at"] = now
	}

	// 更新连续正确/失败次数和状态
	if req.Rating >= 3 {
		updates["consecutive_correct"] = gorm.Expr("consecutive_correct + 1")
		updates["consecutive_failed"] = 0
	} else {
		updates["consecutive_failed"] = gorm.Expr("consecutive_failed + 1")
		updates["consecutive_correct"] = 0
	}

	// 更新状态
	if result.ShouldMaster {
		updates["status"] = "mastered"
		updates["mastered_at"] = now
	} else {
		updates["status"] = result.StatusUpdate
	}

	if err := h.db.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新学习项目失败"})
		return
	}

	// 创建下次复习提醒
	reminder := models.StudyReminder{
		StudyItemID:        item.ID,
		ReminderAt:         result.NextReviewTime,
		Status:             "pending",
		ReminderType:       "review",
		Priority:           3,
		Title:              "复习提醒",
		Message:            "该复习这篇文章了！",
		NotificationMethod: "system",
	}

	h.db.Create(&reminder)

	c.JSON(http.StatusOK, gin.H{
		"message":             "学习会话记录成功",
		"study_log":           studyLog,
		"next_review_time":    result.NextReviewTime,
		"new_interval":        result.NewInterval,
		"recommended_time":    result.RecommendedTime,
		"status_update":       result.StatusUpdate,
		"should_master":       result.ShouldMaster,
		"algorithm_confidence": result.Confidence,
	})
}

// GetDueStudyItems 获取到期的学习项目
func (h *StudyHandler) GetDueStudyItems(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "未找到用户信息"})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户ID格式错误"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	includeNew := c.DefaultQuery("include_new", "true") == "true"

	now := time.Now()

	var items []models.StudyItem

	query := h.db.Table("study_items").
		Joins("JOIN study_plans ON study_items.study_plan_id = study_plans.id").
		Where("study_plans.creator_id = ? AND study_plans.is_active = true", userID).
		Preload("Article").
		Preload("StudyPlan")

	// 构建查询条件
	conditions := []string{}
	args := []interface{}{}

	// 到期的复习项目
	conditions = append(conditions, "(study_items.next_review_at IS NOT NULL AND study_items.next_review_at <= ? AND study_items.status != 'mastered')")
	args = append(args, now)

	// 包含新项目
	if includeNew {
		conditions = append(conditions, "(study_items.status = 'new')")
	}

	if len(conditions) > 0 {
		whereClause := "(" + conditions[0]
		for i := 1; i < len(conditions); i++ {
			whereClause += " OR " + conditions[i]
		}
		whereClause += ")"

		query = query.Where(whereClause, args...)
	}

	if err := query.Limit(limit).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取到期学习项目失败"})
		return
	}

	// 使用算法排序
	var sessions []services.StudySession
	for _, item := range items {
		session := services.StudySession{
			StudyItemID:        item.ID,
			CurrentStatus:      item.Status,
			CurrentInterval:    item.CurrentInterval,
			CurrentEaseFactor:  item.EaseFactor,
			ConsecutiveCorrect: item.ConsecutiveCorrect,
			ConsecutiveFailed:  item.ConsecutiveFailed,
			TotalReviews:       item.TotalReviews,
			PersonalRating:     item.PersonalRating,
			DifficultyLevel:    item.DifficultyLevel,
			ImportanceLevel:    item.ImportanceLevel,
		}

		if item.LastReviewedAt != nil {
			session.LastReviewTime = *item.LastReviewedAt
		}

		sessions = append(sessions, session)
	}

	optimizedSessions := h.algorithm.GetOptimalStudySchedule(sessions, limit)

	// 根据优化结果重新排序items
	var optimizedItems []models.StudyItem
	for _, session := range optimizedSessions {
		for _, item := range items {
			if item.ID == session.StudyItemID {
				optimizedItems = append(optimizedItems, item)
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"items": optimizedItems,
		"total": len(optimizedItems),
	})
}

// GetStudyAnalytics 获取学习分析数据
func (h *StudyHandler) GetStudyAnalytics(c *gin.Context) {
	planID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习计划ID"})
		return
	}

	periodType := c.DefaultQuery("period", "daily") // daily, weekly, monthly
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	startDate := time.Now().AddDate(0, 0, -days).Format("2006-01-02")

	var analytics []models.StudyAnalytics
	if err := h.db.Where("study_plan_id = ? AND period_type = ? AND date >= ?", planID, periodType, startDate).
		Order("date ASC").Find(&analytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取学习分析数据失败"})
		return
	}

	// 获取总体统计
	var totalStats struct {
		TotalItems     int64
		CompletedItems int64
		MasteredItems  int64
		TotalStudyTime int64
		AvgRating      float64
	}

	h.db.Model(&models.StudyItem{}).Where("study_plan_id = ?", planID).Count(&totalStats.TotalItems)
	h.db.Model(&models.StudyItem{}).Where("study_plan_id = ? AND status != 'new'", planID).Count(&totalStats.CompletedItems)
	h.db.Model(&models.StudyItem{}).Where("study_plan_id = ? AND status = 'mastered'", planID).Count(&totalStats.MasteredItems)

	h.db.Model(&models.StudyItem{}).Where("study_plan_id = ?", planID).
		Select("COALESCE(SUM(total_study_time), 0) as total_study_time, COALESCE(AVG(average_rating), 0) as avg_rating").
		Scan(&totalStats)

	c.JSON(http.StatusOK, gin.H{
		"analytics":    analytics,
		"total_stats":  totalStats,
		"period_type":  periodType,
		"days":         days,
	})
}

// UpdateStudyItemNotes 更新学习项目笔记
func (h *StudyHandler) UpdateStudyItemNotes(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("item_id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的学习项目ID"})
		return
	}

	var req struct {
		StudyNotes      string `json:"study_notes"`
		WeakPoints      string `json:"weak_points"`
		PersonalRating  int    `json:"personal_rating"`
		ImportanceLevel int    `json:"importance_level"`
		DifficultyLevel int    `json:"difficulty_level"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var item models.StudyItem
	if err := h.db.First(&item, uint(id)).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "学习项目不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查找学习项目失败"})
		return
	}

	updates := make(map[string]interface{})
	if req.StudyNotes != "" {
		updates["study_notes"] = req.StudyNotes
	}
	if req.WeakPoints != "" {
		updates["weak_points"] = req.WeakPoints
	}
	if req.PersonalRating > 0 {
		updates["personal_rating"] = req.PersonalRating
	}
	if req.ImportanceLevel > 0 {
		updates["importance_level"] = req.ImportanceLevel
	}
	if req.DifficultyLevel > 0 {
		updates["difficulty_level"] = req.DifficultyLevel
	}

	if err := h.db.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新学习项目失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "学习项目更新成功",
		"item":    item,
	})
}