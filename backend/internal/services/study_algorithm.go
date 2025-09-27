package services

import (
	"fmt"
	"math"
	"time"
)

// StudyAlgorithmConfig 学习算法配置
type StudyAlgorithmConfig struct {
	Algorithm                string  `json:"algorithm"`                  // 算法类型: "ebbinghaus", "sm2", "anki"
	EasyFactor              float64 `json:"easy_factor"`               // 简单因子
	DifficultyFactor        float64 `json:"difficulty_factor"`         // 难度因子
	MasteryThreshold        int     `json:"mastery_threshold"`         // 掌握阈值
	MinInterval             int     `json:"min_interval"`              // 最小间隔(天)
	MaxInterval             int     `json:"max_interval"`              // 最大间隔(天)
	FailurePenalty          float64 `json:"failure_penalty"`           // 失败惩罚因子
	ConsistencyBonus        float64 `json:"consistency_bonus"`         // 一致性奖励因子
	PersonalizedAdjustment  bool    `json:"personalized_adjustment"`   // 是否启用个性化调整
}

// StudyResult 学习结果
type StudyResult struct {
	NewInterval     int       `json:"new_interval"`      // 新的间隔天数
	NewEaseFactor   float64   `json:"new_ease_factor"`   // 新的简易因子
	NextReviewTime  time.Time `json:"next_review_time"`  // 下次复习时间
	StatusUpdate    string    `json:"status_update"`     // 状态更新
	ShouldMaster    bool      `json:"should_master"`     // 是否应该标记为掌握
	Confidence      float64   `json:"confidence"`        // 算法信心度
	RecommendedTime int       `json:"recommended_time"`  // 推荐学习时间(分钟)
}

// StudySession 学习会话数据
type StudySession struct {
	StudyItemID        uint      `json:"study_item_id"`
	CurrentStatus      string    `json:"current_status"`
	CurrentInterval    int       `json:"current_interval"`
	CurrentEaseFactor  float64   `json:"current_ease_factor"`
	ConsecutiveCorrect int       `json:"consecutive_correct"`
	ConsecutiveFailed  int       `json:"consecutive_failed"`
	TotalReviews       int       `json:"total_reviews"`
	LastReviewTime     time.Time `json:"last_review_time"`
	PersonalRating     int       `json:"personal_rating"`     // 个人评分 1-10
	DifficultyLevel    int       `json:"difficulty_level"`    // 难度等级 1-5
	ImportanceLevel    int       `json:"importance_level"`    // 重要程度 1-5
}

// StudyResponse 学习反馈
type StudyResponse struct {
	Rating        int    `json:"rating"`         // 用户评分 1-5 (1=完全不记得, 5=完全记得)
	StudyTime     int    `json:"study_time"`     // 实际学习时间(秒)
	Understanding int    `json:"understanding"`  // 理解程度 0-10
	Retention     int    `json:"retention"`      // 记忆保持度 0-10
	Application   int    `json:"application"`    // 应用能力 0-10
	Confidence    int    `json:"confidence"`     // 信心程度 0-10
	StudyMethod   string `json:"study_method"`   // 学习方法
	Notes         string `json:"notes"`          // 学习笔记
}

// StudyAlgorithmService 学习算法服务
type StudyAlgorithmService struct {
	config StudyAlgorithmConfig
}

// NewStudyAlgorithmService 创建学习算法服务实例
func NewStudyAlgorithmService(config StudyAlgorithmConfig) *StudyAlgorithmService {
	// 设置默认配置
	if config.EasyFactor == 0 {
		config.EasyFactor = 1.3
	}
	if config.DifficultyFactor == 0 {
		config.DifficultyFactor = 0.8
	}
	if config.MasteryThreshold == 0 {
		config.MasteryThreshold = 3
	}
	if config.MinInterval == 0 {
		config.MinInterval = 1
	}
	if config.MaxInterval == 0 {
		config.MaxInterval = 365
	}
	if config.FailurePenalty == 0 {
		config.FailurePenalty = 0.2
	}
	if config.ConsistencyBonus == 0 {
		config.ConsistencyBonus = 0.1
	}

	return &StudyAlgorithmService{config: config}
}

// CalculateNextReview 计算下次复习时间
func (s *StudyAlgorithmService) CalculateNextReview(session StudySession, response StudyResponse) StudyResult {
	switch s.config.Algorithm {
	case "sm2":
		return s.calculateSM2(session, response)
	case "anki":
		return s.calculateAnki(session, response)
	default:
		return s.calculateEbbinghaus(session, response)
	}
}

// calculateEbbinghaus 艾宾浩斯遗忘曲线算法
func (s *StudyAlgorithmService) calculateEbbinghaus(session StudySession, response StudyResponse) StudyResult {
	result := StudyResult{
		NewEaseFactor: session.CurrentEaseFactor,
		Confidence:    0.7, // 基础信心度
	}

	// 艾宾浩斯基础间隔: 1, 3, 7, 15, 30, 60, 120...
	baseIntervals := []int{1, 3, 7, 15, 30, 60, 120, 240, 480}

	// 根据评分调整
	isCorrect := response.Rating >= 3

	if isCorrect {
		// 正确回答 - 进入下一个间隔
		nextIndex := 0
		for i, interval := range baseIntervals {
			if session.CurrentInterval <= interval {
				nextIndex = i + 1
				break
			}
		}

		if nextIndex >= len(baseIntervals) {
			// 超出预设间隔，使用指数增长
			result.NewInterval = int(float64(session.CurrentInterval) * s.config.EasyFactor)
		} else {
			result.NewInterval = baseIntervals[nextIndex]
		}

		// 根据评分微调间隔
		ratingMultiplier := 0.5 + (float64(response.Rating) * 0.2) // 0.7-1.5
		result.NewInterval = int(float64(result.NewInterval) * ratingMultiplier)

		// 个性化调整
		if s.config.PersonalizedAdjustment {
			result.NewInterval = s.applyPersonalizedAdjustment(result.NewInterval, session, response)
		}

		// 检查是否应该掌握
		if session.ConsecutiveCorrect >= s.config.MasteryThreshold && response.Rating >= 4 {
			result.ShouldMaster = true
			result.StatusUpdate = "mastered"
		} else {
			result.StatusUpdate = "review"
		}

		result.Confidence = 0.8 + float64(response.Rating-3)*0.1 // 0.8-1.0

	} else {
		// 错误回答 - 重置到较短间隔
		result.NewInterval = s.config.MinInterval
		result.StatusUpdate = "learning"
		result.ShouldMaster = false
		result.Confidence = 0.3 + float64(response.Rating)*0.1 // 0.3-0.8

		// 应用失败惩罚
		result.NewEaseFactor = math.Max(1.0, session.CurrentEaseFactor - s.config.FailurePenalty)
	}

	// 应用难度调整
	result.NewInterval = s.applyDifficultyAdjustment(result.NewInterval, session.DifficultyLevel)

	// 应用重要性调整
	result.NewInterval = s.applyImportanceAdjustment(result.NewInterval, session.ImportanceLevel)

	// 限制间隔范围
	result.NewInterval = s.clampInterval(result.NewInterval)

	// 计算下次复习时间
	result.NextReviewTime = time.Now().AddDate(0, 0, result.NewInterval)

	// 推荐学习时间
	result.RecommendedTime = s.calculateRecommendedStudyTime(session, response)

	return result
}

// calculateSM2 SuperMemo 2 算法
func (s *StudyAlgorithmService) calculateSM2(session StudySession, response StudyResponse) StudyResult {
	result := StudyResult{
		NewEaseFactor: session.CurrentEaseFactor,
		Confidence:    0.8,
	}

	if response.Rating >= 3 {
		// 正确回答
		if session.CurrentInterval == 0 {
			result.NewInterval = 1
		} else if session.CurrentInterval == 1 {
			result.NewInterval = 6
		} else {
			result.NewInterval = int(float64(session.CurrentInterval) * session.CurrentEaseFactor)
		}

		// 调整简易因子
		q := float64(response.Rating)
		result.NewEaseFactor = session.CurrentEaseFactor + (0.1 - (5-q)*(0.08+(5-q)*0.02))

		// 检查掌握状态
		if session.ConsecutiveCorrect >= s.config.MasteryThreshold && response.Rating >= 4 {
			result.ShouldMaster = true
			result.StatusUpdate = "mastered"
		} else {
			result.StatusUpdate = "review"
		}

		result.Confidence = 0.9

	} else {
		// 错误回答
		result.NewInterval = 1
		result.NewEaseFactor = math.Max(1.3, session.CurrentEaseFactor - s.config.FailurePenalty)
		result.StatusUpdate = "learning"
		result.ShouldMaster = false
		result.Confidence = 0.4
	}

	// 限制简易因子范围
	if result.NewEaseFactor < 1.3 {
		result.NewEaseFactor = 1.3
	}

	// 个性化和其他调整
	if s.config.PersonalizedAdjustment {
		result.NewInterval = s.applyPersonalizedAdjustment(result.NewInterval, session, response)
	}

	result.NewInterval = s.applyDifficultyAdjustment(result.NewInterval, session.DifficultyLevel)
	result.NewInterval = s.applyImportanceAdjustment(result.NewInterval, session.ImportanceLevel)
	result.NewInterval = s.clampInterval(result.NewInterval)

	result.NextReviewTime = time.Now().AddDate(0, 0, result.NewInterval)
	result.RecommendedTime = s.calculateRecommendedStudyTime(session, response)

	return result
}

// calculateAnki Anki算法（修改版SM2）
func (s *StudyAlgorithmService) calculateAnki(session StudySession, response StudyResponse) StudyResult {
	result := StudyResult{
		NewEaseFactor: session.CurrentEaseFactor,
		Confidence:    0.8,
	}

	// Anki的评分映射: 1=再次, 2=困难, 3=良好, 4=容易, 5=完美
	switch response.Rating {
	case 1: // 再次 - 重新学习
		result.NewInterval = 1
		result.NewEaseFactor = math.Max(1.3, session.CurrentEaseFactor - 0.20)
		result.StatusUpdate = "learning"
		result.Confidence = 0.2

	case 2: // 困难 - 短间隔
		result.NewInterval = max(1, int(float64(session.CurrentInterval) * 0.5))
		result.NewEaseFactor = math.Max(1.3, session.CurrentEaseFactor - 0.15)
		result.StatusUpdate = "learning"
		result.Confidence = 0.4

	case 3: // 良好 - 正常间隔
		if session.CurrentInterval <= 1 {
			result.NewInterval = 6
		} else {
			result.NewInterval = int(float64(session.CurrentInterval) * session.CurrentEaseFactor)
		}
		result.StatusUpdate = "review"
		result.Confidence = 0.7

	case 4: // 容易 - 延长间隔
		if session.CurrentInterval <= 1 {
			result.NewInterval = 4
		} else {
			result.NewInterval = int(float64(session.CurrentInterval) * session.CurrentEaseFactor * s.config.EasyFactor)
		}
		result.NewEaseFactor = session.CurrentEaseFactor + 0.10
		result.StatusUpdate = "review"
		result.Confidence = 0.9

	case 5: // 完美 - 最大延长
		if session.CurrentInterval <= 1 {
			result.NewInterval = 4
		} else {
			result.NewInterval = int(float64(session.CurrentInterval) * session.CurrentEaseFactor * s.config.EasyFactor * 1.2)
		}
		result.NewEaseFactor = session.CurrentEaseFactor + 0.15
		result.StatusUpdate = "review"
		result.Confidence = 1.0

		// 检查掌握状态
		if session.ConsecutiveCorrect >= s.config.MasteryThreshold {
			result.ShouldMaster = true
			result.StatusUpdate = "mastered"
		}
	}

	// 应用调整和限制
	if s.config.PersonalizedAdjustment {
		result.NewInterval = s.applyPersonalizedAdjustment(result.NewInterval, session, response)
	}

	result.NewInterval = s.applyDifficultyAdjustment(result.NewInterval, session.DifficultyLevel)
	result.NewInterval = s.applyImportanceAdjustment(result.NewInterval, session.ImportanceLevel)
	result.NewInterval = s.clampInterval(result.NewInterval)

	// 限制简易因子
	if result.NewEaseFactor > 3.0 {
		result.NewEaseFactor = 3.0
	}

	result.NextReviewTime = time.Now().AddDate(0, 0, result.NewInterval)
	result.RecommendedTime = s.calculateRecommendedStudyTime(session, response)

	return result
}

// applyPersonalizedAdjustment 应用个性化调整
func (s *StudyAlgorithmService) applyPersonalizedAdjustment(interval int, session StudySession, response StudyResponse) int {
	adjustment := 1.0

	// 基于学习效果的调整
	effectivenessScore := float64(response.Understanding + response.Retention + response.Application + response.Confidence) / 40.0
	adjustment *= (0.7 + effectivenessScore * 0.6) // 0.7-1.3

	// 基于学习时间的调整
	if response.StudyTime > 0 {
		// 学习时间越长，可能需要更多复习
		timeRatio := float64(response.StudyTime) / 600.0 // 以10分钟为基准
		if timeRatio > 1.5 {
			adjustment *= 0.9 // 学习时间过长，稍微缩短间隔
		} else if timeRatio < 0.5 {
			adjustment *= 1.1 // 学习时间较短，可以延长间隔
		}
	}

	// 基于个人评分的调整
	personalAdjustment := float64(session.PersonalRating) / 10.0 // 0.0-1.0
	adjustment *= (0.8 + personalAdjustment * 0.4) // 0.8-1.2

	return int(float64(interval) * adjustment)
}

// applyDifficultyAdjustment 应用难度调整
func (s *StudyAlgorithmService) applyDifficultyAdjustment(interval int, difficultyLevel int) int {
	// 难度等级: 1=很简单, 2=简单, 3=中等, 4=困难, 5=很困难
	difficultyMultiplier := []float64{1.3, 1.15, 1.0, 0.85, 0.7}

	if difficultyLevel >= 1 && difficultyLevel <= 5 {
		return int(float64(interval) * difficultyMultiplier[difficultyLevel-1])
	}

	return interval
}

// applyImportanceAdjustment 应用重要性调整
func (s *StudyAlgorithmService) applyImportanceAdjustment(interval int, importanceLevel int) int {
	// 重要程度: 1=不重要, 2=一般, 3=重要, 4=很重要, 5=极重要
	importanceMultiplier := []float64{1.2, 1.1, 1.0, 0.9, 0.8}

	if importanceLevel >= 1 && importanceLevel <= 5 {
		return int(float64(interval) * importanceMultiplier[importanceLevel-1])
	}

	return interval
}

// clampInterval 限制间隔范围
func (s *StudyAlgorithmService) clampInterval(interval int) int {
	if interval < s.config.MinInterval {
		return s.config.MinInterval
	}
	if interval > s.config.MaxInterval {
		return s.config.MaxInterval
	}
	return interval
}

// calculateRecommendedStudyTime 计算推荐学习时间
func (s *StudyAlgorithmService) calculateRecommendedStudyTime(session StudySession, response StudyResponse) int {
	baseTime := 15 // 基础15分钟

	// 根据难度调整
	difficultyMultiplier := float64(session.DifficultyLevel) * 0.3 // 0.3-1.5

	// 根据重要性调整
	importanceMultiplier := float64(session.ImportanceLevel) * 0.2 // 0.2-1.0

	// 根据上次学习效果调整
	if response.Understanding > 0 {
		effectivenessAdjustment := 1.0 - (float64(response.Understanding) / 20.0) // 理解度高则减少时间
		difficultyMultiplier *= effectivenessAdjustment
	}

	recommendedTime := float64(baseTime) * (1.0 + difficultyMultiplier + importanceMultiplier)

	// 限制在5-60分钟之间
	if recommendedTime < 5 {
		recommendedTime = 5
	}
	if recommendedTime > 60 {
		recommendedTime = 60
	}

	return int(recommendedTime)
}

// GetOptimalStudySchedule 获取最优学习安排
func (s *StudyAlgorithmService) GetOptimalStudySchedule(items []StudySession, dailyLimit int) []StudySession {
	// 按优先级排序学习项目
	// 1. 到期的复习项目优先
	// 2. 重要性高的项目优先
	// 3. 难度适中的项目优先
	// 4. 新项目最后

	type priorityItem struct {
		session  StudySession
		priority float64
	}

	var priorityItems []priorityItem
	now := time.Now()

	for _, item := range items {
		priority := 0.0

		// 计算时间优先级
		if !item.LastReviewTime.IsZero() {
			daysSinceReview := now.Sub(item.LastReviewTime).Hours() / 24
			if daysSinceReview >= float64(item.CurrentInterval) {
				priority += 100 // 已到期项目最高优先级
				priority += daysSinceReview - float64(item.CurrentInterval) // 越过期越优先
			} else {
				priority += 50 - (float64(item.CurrentInterval) - daysSinceReview) // 接近到期的项目
			}
		} else {
			priority += 10 // 新项目基础优先级
		}

		// 重要性加权
		priority += float64(item.ImportanceLevel) * 10

		// 难度调整（中等难度优先）
		difficultyPenalty := math.Abs(float64(item.DifficultyLevel) - 3.0) * 2
		priority -= difficultyPenalty

		// 连续失败的项目需要更多关注
		if item.ConsecutiveFailed > 0 {
			priority += float64(item.ConsecutiveFailed) * 15
		}

		priorityItems = append(priorityItems, priorityItem{
			session:  item,
			priority: priority,
		})
	}

	// 排序：优先级从高到低
	for i := 0; i < len(priorityItems)-1; i++ {
		for j := i + 1; j < len(priorityItems); j++ {
			if priorityItems[i].priority < priorityItems[j].priority {
				priorityItems[i], priorityItems[j] = priorityItems[j], priorityItems[i]
			}
		}
	}

	// 返回前dailyLimit个项目
	var result []StudySession
	limit := min(dailyLimit, len(priorityItems))

	for i := 0; i < limit; i++ {
		result = append(result, priorityItems[i].session)
	}

	return result
}

// ValidateStudyResponse 验证学习反馈
func (s *StudyAlgorithmService) ValidateStudyResponse(response StudyResponse) error {
	if response.Rating < 1 || response.Rating > 5 {
		return fmt.Errorf("评分必须在1-5之间")
	}

	if response.Understanding < 0 || response.Understanding > 10 {
		return fmt.Errorf("理解程度必须在0-10之间")
	}

	if response.Retention < 0 || response.Retention > 10 {
		return fmt.Errorf("记忆保持度必须在0-10之间")
	}

	if response.Application < 0 || response.Application > 10 {
		return fmt.Errorf("应用能力必须在0-10之间")
	}

	if response.Confidence < 0 || response.Confidence > 10 {
		return fmt.Errorf("信心程度必须在0-10之间")
	}

	if response.StudyTime < 0 {
		return fmt.Errorf("学习时间不能为负数")
	}

	return nil
}

// 辅助函数
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}