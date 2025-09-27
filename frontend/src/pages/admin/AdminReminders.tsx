import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ClockIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { studyApi } from '../../api/study';

interface StudyReminder {
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

interface ReminderStats {
  total_reminders: number;
  pending_reminders: number;
  completed_today: number;
  overdue_reminders: number;
}

const AdminReminders: React.FC = () => {
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudyPlanIntegration, setShowStudyPlanIntegration] = useState(false);
  const [studyPlans, setStudyPlans] = useState<any[]>([]);
  const [generatingReminders, setGeneratingReminders] = useState(false);

  // 获取提醒列表
  const fetchReminders = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter === 'all' ? '' : statusFilter,
        type: typeFilter === 'all' ? '' : typeFilter,
      });

      const response = await fetch(`/api/reminders?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setReminders(data.reminders || []);
        setTotalPages(Math.ceil(data.total / 20));
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('获取提醒失败:', error);
    } finally {
      setLoading(false);
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
        fetchReminders(currentPage);
        fetchStats();
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
        fetchReminders(currentPage);
        fetchStats();
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

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待处理</span>;
      case 'read':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">已读</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已完成</span>;
      default:
        return null;
    }
  };

  // 格式化时间
  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN');
  };

  // 获取学习计划列表
  const fetchStudyPlans = async () => {
    try {
      const response = await studyApi.getStudyPlans();
      setStudyPlans(response.plans || []);
    } catch (error) {
      console.error('获取学习计划失败:', error);
    }
  };

  // 为学习计划生成提醒
  const generateRemindersForPlan = async (planId: number, planName: string) => {
    setGeneratingReminders(true);
    try {
      await studyApi.generateStudyReminders(planId);
      alert(`已为学习计划"${planName}"生成提醒`);
      fetchReminders(); // 刷新提醒列表
    } catch (error) {
      console.error('生成提醒失败:', error);
      alert('生成提醒失败，请稍后重试');
    } finally {
      setGeneratingReminders(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchStats();
    fetchStudyPlans();
  }, [statusFilter, typeFilter]);

  if (loading && reminders.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页头 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BellIcon className="w-8 h-8 mr-3 text-blue-600" />
              学习提醒管理
            </h1>
            <p className="text-gray-600 mt-2">管理您的学习提醒和通知</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowStudyPlanIntegration(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <AcademicCapIcon className="w-5 h-5 mr-2" />
              学习计划集成
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              创建提醒
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">总提醒数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_reminders}</p>
                </div>
                <BellIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">待处理</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_reminders}</p>
                </div>
                <ClockIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">今日完成</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_today}</p>
                </div>
                <CheckIcon className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">逾期提醒</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue_reminders}</p>
                </div>
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选：</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">所有状态</option>
            <option value="pending">待处理</option>
            <option value="read">已读</option>
            <option value="completed">已完成</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">所有类型</option>
            <option value="review">复习提醒</option>
            <option value="goal">目标提醒</option>
            <option value="overdue">逾期提醒</option>
            <option value="achievement">成就提醒</option>
            <option value="manual">手动提醒</option>
          </select>
        </div>
      </div>

      {/* 提醒列表 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {reminders.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无提醒</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter === 'all' ? '您还没有任何提醒' : `没有找到${statusFilter === 'pending' ? '待处理' : statusFilter === 'read' ? '已读' : '已完成'}的提醒`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getReminderIcon(reminder.type, reminder.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusBadge(reminder.status)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          reminder.type === 'overdue' ? 'bg-red-100 text-red-800' :
                          reminder.type === 'goal' ? 'bg-blue-100 text-blue-800' :
                          reminder.type === 'achievement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reminder.type === 'review' ? '复习提醒' :
                           reminder.type === 'goal' ? '目标提醒' :
                           reminder.type === 'overdue' ? '逾期提醒' :
                           reminder.type === 'achievement' ? '成就提醒' :
                           '手动提醒'}
                        </span>
                        {reminder.priority >= 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            高优先级
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
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
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-2">{reminder.message}</p>
                      
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span>提醒时间: {formatDateTime(reminder.scheduled_at)}</span>
                        <span>创建时间: {formatDateTime(reminder.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {reminder.status === 'pending' && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => markAsRead(reminder.id)}
                        className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                        title="标记为已读"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        已读
                      </button>
                      <button
                        onClick={() => markAsCompleted(reminder.id)}
                        className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                        title="标记为完成"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        完成
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchReminders(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => fetchReminders(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  第 <span className="font-medium">{currentPage}</span> 页，共{' '}
                  <span className="font-medium">{totalPages}</span> 页
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => fetchReminders(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 学习计划集成模态框 */}
      {showStudyPlanIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">学习计划集成</h3>
              <button
                onClick={() => setShowStudyPlanIntegration(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                为学习计划自动生成基于间隔重复算法的复习提醒
              </p>

              {studyPlans.length === 0 ? (
                <div className="text-center py-8">
                  <AcademicCapIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无学习计划</p>
                  <p className="text-sm text-gray-400 mt-2">
                    请先创建学习计划才能生成提醒
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">选择学习计划：</h4>
                  {studyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h5 className="font-medium">{plan.name}</h5>
                        <p className="text-sm text-gray-500">
                          {plan.total_items} 个学习项目 • {plan.spacing_algorithm}
                        </p>
                      </div>
                      <button
                        onClick={() => generateRemindersForPlan(plan.id, plan.name)}
                        disabled={generatingReminders}
                        className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {generatingReminders ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <BellIcon className="w-4 h-4 mr-1" />
                        )}
                        生成提醒
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">提醒说明：</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 复习提醒：根据间隔重复算法自动生成</li>
                  <li>• 目标提醒：每日学习进度监控</li>
                  <li>• 逾期提醒：超期未复习项目提醒</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建提醒模态框 */}
      {showCreateModal && (
        <CreateReminderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReminders();
          }}
        />
      )}
    </div>
  );
};

// 创建提醒模态框组件
interface CreateReminderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateReminderModal: React.FC<CreateReminderModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    reminder_at: '',
    priority: 3,
    study_item_id: undefined as number | undefined
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        console.error('创建提醒失败');
      }
    } catch (error) {
      console.error('创建提醒错误:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">创建手动提醒</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提醒标题
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提醒内容
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提醒时间
            </label>
            <input
              type="datetime-local"
              value={formData.reminder_at}
              onChange={(e) => setFormData({ ...formData, reminder_at: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              优先级
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>低</option>
              <option value={2}>较低</option>
              <option value={3}>中等</option>
              <option value={4}>较高</option>
              <option value={5}>高</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '创建中...' : '创建提醒'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminReminders;
