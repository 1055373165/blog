import { apiClient } from './client';

// 学习计划相关类型
export interface StudyPlan {
  id: number;
  name: string;
  description: string;
  spacing_algorithm: string;
  difficulty_level: number;
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
  total_items: number;
  completed_items: number;
  mastered_items: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  study_items?: StudyItem[];
}

export interface StudyItem {
  id: number;
  study_plan_id: number;
  article_id: number;
  status: 'new' | 'learning' | 'review' | 'mastered' | 'suspended';
  current_interval: number;
  ease_factor: number;
  consecutive_correct: number;
  consecutive_failed: number;
  next_review_at?: string;
  last_reviewed_at?: string;
  first_studied_at?: string;
  mastered_at?: string;
  total_reviews: number;
  total_study_time: number;
  average_rating: number;
  weak_points?: string;
  study_notes?: string;
  personal_rating: number;
  importance_level: number;
  difficulty_level: number;
  created_at: string;
  updated_at: string;
  article: {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    reading_time: number;
    created_at: string;
  };
  study_plan?: StudyPlan;
  study_logs?: StudyLog[];
}

export interface StudyLog {
  id: number;
  study_item_id: number;
  review_type: string;
  rating: number;
  study_time: number;
  completion: boolean;
  study_method?: string;
  study_materials?: string;
  notes?: string;
  key_points?: string;
  understanding: number;
  retention: number;
  application: number;
  confidence: number;
  previous_interval?: number;
  new_interval?: number;
  previous_ease?: number;
  new_ease?: number;
  device_type?: string;
  location?: string;
  time_of_day?: string;
  created_at: string;
}

export interface StudyReminder {
  id: number;
  study_item_id: number;
  reminder_at: string;
  status: 'pending' | 'sent' | 'completed' | 'skipped' | 'cancelled';
  reminder_type: string;
  priority: number;
  title?: string;
  message?: string;
  notification_method: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  sent_at?: string;
  completed_at?: string;
  snooze_until?: string;
  attempt_count: number;
  created_at: string;
}

export interface StudyAnalytics {
  id: number;
  study_plan_id: number;
  date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  items_reviewed: number;
  study_time: number;
  session_count: number;
  average_rating: number;
  completion_rate: number;
  new_items: number;
  reviewed_items: number;
  mastered_items: number;
  failed_items: number;
  efficiency_score: number;
  retention_rate: number;
  progress_velocity: number;
  consistency_score: number;
  daily_goal_achieved: boolean;
  weekly_goal_progress: number;
  monthly_goal_progress: number;
  preferred_study_time?: string;
  avg_session_duration: number;
  most_used_method?: string;
  created_at: string;
}

// 请求/响应类型
export interface CreateStudyPlanRequest {
  name: string;
  description?: string;
  spacing_algorithm?: string;
  difficulty_level?: number;
  daily_goal?: number;
  weekly_goal?: number;
  monthly_goal?: number;
}

export interface UpdateStudyPlanRequest {
  name?: string;
  description?: string;
  spacing_algorithm?: string;
  difficulty_level?: number;
  daily_goal?: number;
  weekly_goal?: number;
  monthly_goal?: number;
  is_active?: boolean;
}

export interface AddArticleToStudyPlanRequest {
  article_id: number;
  importance_level?: number;
  difficulty_level?: number;
  study_notes?: string;
}

export interface RecordStudySessionRequest {
  rating: number;
  study_time: number;
  understanding?: number;
  retention?: number;
  application?: number;
  confidence?: number;
  study_method?: string;
  notes?: string;
  key_points?: string;
  device_type?: string;
  location?: string;
}

export interface UpdateStudyItemNotesRequest {
  study_notes?: string;
  weak_points?: string;
  personal_rating?: number;
  importance_level?: number;
  difficulty_level?: number;
}

export interface StudyPlanListResponse {
  plans: StudyPlan[];
  total: number;
  page: number;
  limit: number;
}

export interface StudyItemListResponse {
  items: StudyItem[];
  total: number;
  page?: number;
  limit?: number;
}

export interface StudyAnalyticsResponse {
  analytics: StudyAnalytics[];
  total_stats: {
    total_items: number;
    completed_items: number;
    mastered_items: number;
    total_study_time: number;
    avg_rating: number;
  };
  period_type: string;
  days: number;
}

export interface StudySessionResponse {
  message: string;
  study_log: StudyLog;
  next_review_time: string;
  new_interval: number;
  recommended_time: number;
  status_update: string;
  should_master: boolean;
  algorithm_confidence: number;
}

// API 函数

// 学习计划管理
export const studyPlanApi = {
  // 获取学习计划列表
  getStudyPlans: async (params?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
  }): Promise<StudyPlanListResponse> => {
    const { data } = await apiClient.get('/study/plans', { params });
    return data;
  },

  // 获取单个学习计划详情
  getStudyPlan: async (id: number): Promise<{ plan: StudyPlan }> => {
    const { data } = await apiClient.get(`/study/plans/${id}`);
    return data;
  },

  // 创建学习计划
  createStudyPlan: async (plan: CreateStudyPlanRequest): Promise<{ message: string; plan: StudyPlan }> => {
    const { data } = await apiClient.post('/study/plans', plan);
    return data;
  },

  // 更新学习计划
  updateStudyPlan: async (id: number, updates: UpdateStudyPlanRequest): Promise<{ message: string; plan: StudyPlan }> => {
    const { data } = await apiClient.put(`/study/plans/${id}`, updates);
    return data;
  },

  // 删除学习计划
  deleteStudyPlan: async (id: number): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/study/plans/${id}`);
    return data;
  },
};

// 学习项目管理
export const studyItemApi = {
  // 添加文章到学习计划
  addArticleToStudyPlan: async (
    planId: number,
    article: AddArticleToStudyPlanRequest
  ): Promise<{ message: string; study_item: StudyItem }> => {
    const { data } = await apiClient.post(`/study/plans/${planId}/articles`, article);
    return data;
  },

  // 获取学习项目列表
  getStudyItems: async (
    planId: number,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ): Promise<StudyItemListResponse> => {
    const { data } = await apiClient.get(`/study/plans/${planId}/items`, { params });
    return data;
  },

  // 移除学习项目
  removeStudyItem: async (itemId: number): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/study/items/${itemId}`);
    return data;
  },

  // 更新学习项目笔记
  updateStudyItemNotes: async (
    itemId: number,
    updates: UpdateStudyItemNotesRequest
  ): Promise<{ message: string; item: StudyItem }> => {
    const { data } = await apiClient.put(`/study/items/${itemId}/notes`, updates);
    return data;
  },
};

// 学习进度管理
export const studyProgressApi = {
  // 记录学习会话
  recordStudySession: async (
    itemId: number,
    session: RecordStudySessionRequest
  ): Promise<StudySessionResponse> => {
    const { data } = await apiClient.post(`/study/items/${itemId}/study`, session);
    return data;
  },

  // 获取到期的学习项目
  getDueStudyItems: async (params?: {
    limit?: number;
    include_new?: boolean;
  }): Promise<StudyItemListResponse> => {
    const { data } = await apiClient.get('/study/due', { params });
    return data;
  },

  // 获取学习分析数据
  getStudyAnalytics: async (
    planId: number,
    params?: {
      period?: 'daily' | 'weekly' | 'monthly';
      days?: number;
    }
  ): Promise<StudyAnalyticsResponse> => {
    const { data } = await apiClient.get(`/study/plans/${planId}/analytics`, { params });
    return data;
  },
};

// 导出所有API
export const studyApi = {
  ...studyPlanApi,
  ...studyItemApi,
  ...studyProgressApi,
};