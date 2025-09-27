import React, { useState } from 'react';
import { PlusIcon, TrashIcon, BookOpenIcon, XMarkIcon, ChartBarIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import SpacingAlgorithmVisualizer from './SpacingAlgorithmVisualizer';

interface StudyPlan {
  id: number;
  name: string;
  spacing_algorithm: string;
}

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  reading_time: number;
}

interface StudyItem {
  id: number;
  article: Article;
  status: string;
  importance_level: number;
  difficulty_level: number;
  next_review_at?: string;
}

interface StudyPlanContentManagerProps {
  selectedPlan: StudyPlan;
  studyItems: StudyItem[];
  articles: Article[];
  onAddArticle: (articleId: number) => void;
  onRemoveItem: (itemId: number) => void;
  onClose: () => void;
  getAlgorithmLabel: (algorithm: string) => string;
}

const StudyPlanContentManager: React.FC<StudyPlanContentManagerProps> = ({
  selectedPlan,
  studyItems,
  articles,
  onAddArticle,
  onRemoveItem,
  onClose,
  getAlgorithmLabel
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'algorithm'>('content');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-5/6 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              管理学习内容 - {selectedPlan.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 标签页导航 */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('content')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpenIcon className="w-5 h-5 inline-block mr-2" />
                学习内容管理
              </button>
              <button
                onClick={() => setActiveTab('algorithm')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'algorithm'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChartBarIcon className="w-5 h-5 inline-block mr-2" />
                算法时间表
              </button>
            </nav>
          </div>

          {/* 学习内容管理标签页 */}
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 可用文章列表 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">可添加的文章</h4>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  {articles.filter(article =>
                    !studyItems.some(item => item.article?.id === article.id)
                  ).map((article) => (
                    <div key={article.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium truncate">
                            <a 
                              href={`/article/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              title="点击查看文章详情"
                            >
                              {article.title}
                            </a>
                          </h5>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center text-xs text-gray-400 mt-2">
                            <span>阅读时长: {article.reading_time}分钟</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onAddArticle(article.id)}
                          className="ml-3 flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                        >
                          <PlusIcon className="w-3 h-3 mr-1" />
                          添加
                        </button>
                      </div>
                    </div>
                  ))}
                  {articles.filter(article =>
                    !studyItems.some(item => item.article?.id === article.id)
                  ).length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>暂无可添加的文章</p>
                      <p className="text-sm">所有文章都已添加到学习计划中</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 已添加的学习项目 */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  学习内容 ({studyItems.length}项)
                </h4>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  {studyItems.map((item) => (
                    <div key={item.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium truncate">
                            <a 
                              href={`/article/${item.article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                              title="点击查看文章详情"
                            >
                              {item.article.title}
                            </a>
                          </h5>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'mastered' ? 'bg-green-100 text-green-800' :
                              item.status === 'learning' ? 'bg-blue-100 text-blue-800' :
                              item.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status === 'new' ? '新项目' :
                               item.status === 'learning' ? '学习中' :
                               item.status === 'review' ? '复习中' :
                               item.status === 'mastered' ? '已掌握' : item.status}
                            </span>
                            <span>重要性: {item.importance_level}/5</span>
                            <span>难度: {item.difficulty_level}/5</span>
                          </div>
                          {item.next_review_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              下次复习: {new Date(item.next_review_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="ml-3 flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3 mr-1" />
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                  {studyItems.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <p>暂无学习内容</p>
                      <p className="text-sm">从左侧添加文章开始学习</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 算法可视化标签页 */}
          {activeTab === 'algorithm' && (
            <div className="space-y-6">
              {/* 算法信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900">当前学习算法</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      查看 <span className="font-medium">{getAlgorithmLabel(selectedPlan.spacing_algorithm)}</span> 的复习时间表
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <AcademicCapIcon className="w-5 h-5" />
                    <span>学习项目: {studyItems.length}</span>
                  </div>
                </div>
              </div>

              {/* 算法可视化组件 */}
              <SpacingAlgorithmVisualizer
                algorithm={selectedPlan.spacing_algorithm as 'ebbinghaus' | 'sm2' | 'anki'}
                itemCount={studyItems.length}
                startDate={new Date()}
                className="w-full"
              />

              {/* 算法对比说明 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <h5 className="font-medium text-blue-900">艾宾浩斯遗忘曲线</h5>
                  </div>
                  <p className="text-sm text-blue-800">
                    固定间隔复习，基于科学的遗忘规律，适合初学者和标准化学习。
                  </p>
                  <div className="mt-2 text-xs text-blue-700">
                    <span className="font-medium">特点:</span> 简单可靠、科学验证
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <h5 className="font-medium text-green-900">SuperMemo 2</h5>
                  </div>
                  <p className="text-sm text-green-800">
                    自适应间隔调整，根据学习难度个性化优化，适合长期深度学习。
                  </p>
                  <div className="mt-2 text-xs text-green-700">
                    <span className="font-medium">特点:</span> 个性化、自适应
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                    <h5 className="font-medium text-purple-900">Anki算法</h5>
                  </div>
                  <p className="text-sm text-purple-800">
                    两阶段学习模式，先强化后维持，适合快速掌握和长期记忆。
                  </p>
                  <div className="mt-2 text-xs text-purple-700">
                    <span className="font-medium">特点:</span> 两阶段、高效率
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlanContentManager;
