import { apiClient } from './client';
import { useState, useEffect } from 'react';

export interface StudyReminder {
  id: number;
  type: 'review' | 'goal' | 'overdue' | 'achievement' | 'manual';
  title: string;
  message: string;
  priority: number;
  scheduled_at: string;
  status: 'pending' | 'read' | 'completed';
  study_item?: {
    id: number;
    article: {
      id: number;
      title: string;
      slug: string;
    };
  };
  created_at: string;
}

export interface ReminderStats {
  total_reminders: number;
  pending_reminders: number;
  completed_today: number;
  overdue_reminders: number;
}

export interface CreateReminderRequest {
  study_item_id?: number;
  title: string;
  message: string;
  reminder_at: string;
  priority?: number;
}

export const reminderApi = {
  // 获取提醒列表
  getReminders: async (params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/reminders?${searchParams}`);
    return response.data;
  },

  // 获取未读数量
  getUnreadCount: async () => {
    const response = await apiClient.get('/reminders/unread-count');
    return response.data;
  },

  // 获取统计信息
  getStats: async (): Promise<ReminderStats> => {
    const response = await apiClient.get('/reminders/stats');
    return response.data as ReminderStats;
  },

  // 标记为已读
  markAsRead: async (reminderId: number) => {
    const response = await apiClient.post(`/reminders/${reminderId}/read`);
    return response.data;
  },

  // 标记为完成
  markAsCompleted: async (reminderId: number) => {
    const response = await apiClient.post(`/reminders/${reminderId}/complete`);
    return response.data;
  },

  // 批量标记为已读
  batchMarkAsRead: async (reminderIds: number[]) => {
    const response = await apiClient.post('/reminders/batch-read', {
      reminder_ids: reminderIds
    });
    return response.data;
  },

  // 创建手动提醒
  createReminder: async (data: CreateReminderRequest) => {
    const response = await apiClient.post('/reminders', data);
    return response.data;
  },

  // 删除提醒
  deleteReminder: async (reminderId: number) => {
    const response = await apiClient.delete(`/reminders/${reminderId}`);
    return response.data;
  }
};

// 提醒通知 Hook
export const useReminderNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);

  const fetchUnreadCount = async () => {
    try {
      const data = await reminderApi.getUnreadCount();
      setUnreadCount((data as any).unread_count || 0);
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  };

  const fetchLatestReminders = async () => {
    try {
      const data = await reminderApi.getReminders({ 
        status: 'pending', 
        limit: 10 
      });
      setReminders((data as any).reminders || []);
    } catch (error) {
      console.error('获取最新提醒失败:', error);
    }
  };

  const markAsRead = async (reminderId: number) => {
    try {
      await reminderApi.markAsRead(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记已读失败:', error);
      throw error;
    }
  };

  const markAsCompleted = async (reminderId: number) => {
    try {
      await reminderApi.markAsCompleted(reminderId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('标记完成失败:', error);
      throw error;
    }
  };

  const batchMarkAsRead = async () => {
    try {
      const reminderIds = reminders.map(r => r.id);
      await reminderApi.batchMarkAsRead(reminderIds);
      setReminders([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('批量标记失败:', error);
      throw error;
    }
  };

  // 定期刷新未读数量
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  return {
    unreadCount,
    reminders,
    fetchLatestReminders,
    markAsRead,
    markAsCompleted,
    batchMarkAsRead,
    refreshUnreadCount: fetchUnreadCount
  };
};
