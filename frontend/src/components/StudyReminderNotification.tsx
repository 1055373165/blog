import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  XMarkIcon, 
  CheckIcon, 
  ClockIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

interface StudyReminder {
  id: number;
  type: 'review' | 'goal' | 'overdue' | 'achievement' | 'manual';
  title: string;
  message: string;
  priority: number;
  scheduled_at: string;
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

interface ReminderStats {
  total_reminders: number;
  pending_reminders: number;
  completed_today: number;
  overdue_reminders: number;
}

const StudyReminderNotification: React.FC = () => {
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 获取提醒列表
  const fetchReminders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reminders?status=pending&limit=10');
      const data = await response.json();
      if (response.ok) {
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('获取提醒失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取未读数量
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/reminders/unread-count');
      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('获取未读数量失败:', error);
    }
  };

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/reminders/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 标记为已读
  const markAsRead = async (reminderId: number) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  // 标记为完成
  const markAsCompleted = async (reminderId: number) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/complete`, {
        method: 'POST',
      });
      if (response.ok) {
        setReminders(prev => prev.filter(r => r.id !== reminderId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        fetchStats(); // 刷新统计
      }
    } catch (error) {
      console.error('标记完成失败:', error);
    }
  };

  // 获取提醒图标
  const getReminderIcon = (type: string, priority: number) => {
    const iconClass = `w-5 h-5 ${priority >= 4 ? 'text-red-500' : priority >= 3 ? 'text-yellow-500' : 'text-blue-500'}`;
    
    switch (type) {
      case 'review':
        return <ClockIcon className={iconClass} />;
      case 'goal':
        return <AcademicCapIcon className={iconClass} />;
      case 'overdue':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'achievement':
        return <TrophyIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <BellIcon className={iconClass} />;
    }
  };

  // 获取提醒类型标签
  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'review': return '复习提醒';
      case 'goal': return '目标提醒';
      case 'overdue': return '逾期提醒';
      case 'achievement': return '成就提醒';
      case 'manual': return '手动提醒';
      default: return '系统提醒';
    }
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchStats();
    
    // 定期刷新未读数量
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showPanel) {
      fetchReminders();
    }
  }, [showPanel]);

  return (
    <div className="relative">
      {/* 提醒铃铛按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        title="学习提醒"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="w-6 h-6 text-blue-600" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* 未读数量徽章 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 提醒面板 */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">学习提醒</h3>
              {stats && (
                <p className="text-sm text-gray-500">
                  {stats.pending_reminders} 条待处理，今日已完成 {stats.completed_today} 条
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 统计卡片 */}
          {stats && (
            <div className="p-4 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <BellIcon className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">待处理</p>
                      <p className="text-lg font-bold text-blue-600">{stats.pending_reminders}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-900">逾期</p>
                      <p className="text-lg font-bold text-red-600">{stats.overdue_reminders}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 提醒列表 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">加载中...</p>
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">暂无待处理的提醒</p>
                <p className="text-sm text-gray-400 mt-1">保持良好的学习习惯！</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getReminderIcon(reminder.type, reminder.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            reminder.type === 'overdue' ? 'bg-red-100 text-red-800' :
                            reminder.type === 'goal' ? 'bg-blue-100 text-blue-800' :
                            reminder.type === 'achievement' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getReminderTypeLabel(reminder.type)}
                          </span>
                          {reminder.priority >= 4 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              高优先级
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {reminder.study_item ? (
                            <a
                              href={`/article/${reminder.study_item.article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {reminder.title}
                            </a>
                          ) : (
                            reminder.title
                          )}
                        </h4>
                        
                        <p className="text-sm text-gray-600 mb-2">{reminder.message}</p>
                        
                        <p className="text-xs text-gray-400">
                          {formatTime(reminder.scheduled_at)}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 flex space-x-1">
                        <button
                          onClick={() => markAsRead(reminder.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="标记为已读"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => markAsCompleted(reminder.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="标记为完成"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部操作 */}
          {reminders.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    // 批量标记为已读
                    const reminderIds = reminders.map(r => r.id);
                    fetch('/api/reminders/batch-read', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reminder_ids: reminderIds })
                    }).then(() => {
                      setReminders([]);
                      setUnreadCount(0);
                    });
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  全部标记为已读
                </button>
                
                <a
                  href="/admin/reminders"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setShowPanel(false)}
                >
                  查看全部 →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 点击外部关闭面板 */}
      {showPanel && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPanel(false)}
        />
      )}
    </div>
  );
};

export default StudyReminderNotification;
