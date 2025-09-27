import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, AcademicCapIcon, ChartBarIcon, BookOpenIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { studyPlanApi } from '../../api/study';
import StudyPlanContentManager from '../../components/StudyPlanContentManager';

interface StudyPlan {
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
  creator: {
    name: string;
  };
}

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  reading_time: number;
  created_at: string;
}

const AdminStudyPlans: React.FC = () => {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageContentModal, setShowManageContentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [studyItems, setStudyItems] = useState<any[]>([]);

  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    spacing_algorithm: 'ebbinghaus',
    difficulty_level: 3,
    daily_goal: 5,
    weekly_goal: 30,
    monthly_goal: 120,
  });

  const algorithms = [
    { value: 'ebbinghaus', label: '艾宾浩斯遗忘曲线' },
    { value: 'sm2', label: 'SuperMemo 2' },
    { value: 'anki', label: 'Anki算法' },
  ];

  useEffect(() => {
    fetchStudyPlans();
    fetchArticles();
  }, []);

  const fetchStudyPlans = async () => {
    try {
      const response = await studyPlanApi.getStudyPlans();
      setStudyPlans(response.plans || []);
    } catch (error) {
      console.error('获取学习计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles?limit=100');
      const data = await response.json();
      setArticles(data.data?.articles || []);
    } catch (error) {
      console.error('获取文章列表失败:', error);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studyPlanApi.createStudyPlan(newPlan);
      setShowCreateModal(false);
      setNewPlan({
        name: '',
        description: '',
        spacing_algorithm: 'ebbinghaus',
        difficulty_level: 3,
        daily_goal: 5,
        weekly_goal: 30,
        monthly_goal: 120,
      });
      fetchStudyPlans();
    } catch (error) {
      console.error('创建学习计划失败:', error);
      alert('创建失败，请稍后重试');
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getAlgorithmLabel = (algorithm: string) => {
    return algorithms.find(alg => alg.value === algorithm)?.label || algorithm;
  };

  const handleManageContent = async (plan: StudyPlan) => {
    setSelectedPlan(plan);
    setShowManageContentModal(true);
    // 获取学习计划的内容
    try {
      console.log('Fetching study items for plan:', plan.id);
      const response = await studyPlanApi.getStudyItems(plan.id);
      console.log('Initial study items response:', response);

      // 直接使用 response.items，因为 getStudyItems API 直接返回包含 items 的对象
      if (response && response.items) {
        setStudyItems(response.items);
        console.log('Initial study items count:', response.items.length);
      } else {
        console.warn('Unexpected initial response structure:', response);
        setStudyItems([]);
      }
    } catch (error) {
      console.error('获取学习内容失败:', error);
      setStudyItems([]);
    }
  };

  const handleAddArticleToPlan = async (articleId: number) => {
    if (!selectedPlan) return;

    try {
      console.log('Adding article to plan:', { planId: selectedPlan.id, articleId });

      const addResult = await studyPlanApi.addArticleToStudyPlan(selectedPlan.id, {
        article_id: articleId,
        importance_level: 3,
        difficulty_level: 3
      });

      console.log('Add article result:', addResult);

      // 刷新学习内容列表
      console.log('Fetching updated study items for plan:', selectedPlan.id);
      const response = await studyPlanApi.getStudyItems(selectedPlan.id);
      console.log('Study items response:', response);

      // 直接使用 response.items，因为 getStudyItems API 直接返回包含 items 的对象
      if (response && response.items) {
        setStudyItems(response.items);
        console.log('Updated study items count:', response.items.length);
      } else {
        console.warn('Unexpected response structure:', response);
        setStudyItems([]);
      }

      // 刷新学习计划列表以更新统计
      fetchStudyPlans();

      console.log('Article added successfully');
    } catch (error) {
      console.error('添加文章失败:', error);
      alert('添加文章失败');
    }
  };

  const handleRemoveStudyItem = async (itemId: number) => {
    try {
      await studyPlanApi.removeStudyItem(itemId);

      // 刷新学习内容列表
      if (selectedPlan) {
        const response = await studyPlanApi.getStudyItems(selectedPlan.id);
        setStudyItems(response?.items || []);
      }

      // 刷新学习计划列表以更新统计
      fetchStudyPlans();
    } catch (error) {
      console.error('移除学习项目失败:', error);
      alert('移除失败');
    }
  };

  const handleTogglePlanStatus = async (planId: number, isActive: boolean) => {
    try {
      await studyPlanApi.updateStudyPlan(planId, { is_active: !isActive });
      fetchStudyPlans();
    } catch (error) {
      console.error('更新计划状态失败:', error);
      alert('更新状态失败');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('确定要删除这个学习计划吗？这将删除所有相关的学习项目。')) return;

    try {
      await studyPlanApi.deleteStudyPlan(planId);
      fetchStudyPlans();
    } catch (error) {
      console.error('删除学习计划失败:', error);
      alert('删除失败');
    }
  };

  const handleCloseContentManager = () => {
    setShowManageContentModal(false);
    setSelectedPlan(null);
    setStudyItems([]);
  };

  if (loading) {
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
              <AcademicCapIcon className="w-8 h-8 mr-3 text-blue-600" />
              学习计划管理
            </h1>
            <p className="text-gray-600 mt-2">基于科学间隔重复算法的智能学习系统</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            创建学习计划
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">总学习计划</p>
                <p className="text-2xl font-bold text-gray-900">{studyPlans.length}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">激活计划</p>
                <p className="text-2xl font-bold text-gray-900">
                  {studyPlans.filter(plan => plan.is_active).length}
                </p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">总学习项目</p>
                <p className="text-2xl font-bold text-gray-900">
                  {studyPlans.reduce((sum, plan) => sum + plan.total_items, 0)}
                </p>
              </div>
              <BookOpenIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">已掌握项目</p>
                <p className="text-2xl font-bold text-gray-900">
                  {studyPlans.reduce((sum, plan) => sum + plan.mastered_items, 0)}
                </p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* 学习计划列表 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {studyPlans.map((plan) => (
            <li key={plan.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {plan.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {plan.is_active ? '激活' : '暂停'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getAlgorithmLabel(plan.spacing_algorithm)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                  {/* 学习目标 */}
                  <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                    <span>日目标: {plan.daily_goal}</span>
                    <span>周目标: {plan.weekly_goal}</span>
                    <span>月目标: {plan.monthly_goal}</span>
                  </div>

                  {/* 进度条 */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">学习进度</span>
                      <span className="text-gray-900 font-medium">
                        {plan.completed_items}/{plan.total_items}
                        ({getProgressPercentage(plan.completed_items, plan.total_items)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${getProgressPercentage(plan.completed_items, plan.total_items)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* 掌握进度 */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">掌握进度</span>
                      <span className="text-gray-900 font-medium">
                        {plan.mastered_items}/{plan.total_items}
                        ({getProgressPercentage(plan.mastered_items, plan.total_items)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${getProgressPercentage(plan.mastered_items, plan.total_items)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-3 ml-6">
                  <button
                    onClick={() => handleManageContent(plan)}
                    className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <BookOpenIcon className="w-4 h-4 mr-2" />
                    管理内容
                  </button>
                  <button
                    onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                      plan.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {plan.is_active ? '暂停' : '激活'}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {studyPlans.length === 0 && (
          <div className="text-center py-12">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无学习计划</h3>
            <p className="mt-1 text-sm text-gray-500">开始创建您的第一个学习计划吧</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                创建学习计划
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 创建学习计划模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">创建学习计划</h3>
              <form onSubmit={handleCreatePlan}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    计划名称
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入学习计划名称"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    计划描述
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入计划描述"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    学习算法
                  </label>
                  <select
                    value={newPlan.spacing_algorithm}
                    onChange={(e) => setNewPlan({ ...newPlan, spacing_algorithm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {algorithms.map((alg) => (
                      <option key={alg.value} value={alg.value}>
                        {alg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    难度等级
                  </label>
                  <select
                    value={newPlan.difficulty_level}
                    onChange={(e) => setNewPlan({ ...newPlan, difficulty_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - 很简单</option>
                    <option value={2}>2 - 简单</option>
                    <option value={3}>3 - 中等</option>
                    <option value={4}>4 - 困难</option>
                    <option value={5}>5 - 很困难</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      日目标
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPlan.daily_goal}
                      onChange={(e) => setNewPlan({ ...newPlan, daily_goal: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      周目标
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPlan.weekly_goal}
                      onChange={(e) => setNewPlan({ ...newPlan, weekly_goal: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      月目标
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newPlan.monthly_goal}
                      onChange={(e) => setNewPlan({ ...newPlan, monthly_goal: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 管理学习内容模态框 */}
      {showManageContentModal && selectedPlan && (
        <StudyPlanContentManager
          selectedPlan={selectedPlan}
          studyItems={studyItems}
          articles={articles}
          onAddArticle={handleAddArticleToPlan}
          onRemoveItem={handleRemoveStudyItem}
          onClose={handleCloseContentManager}
          getAlgorithmLabel={getAlgorithmLabel}
        />
      )}
    </div>
  );
};

export default AdminStudyPlans;