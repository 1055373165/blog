import React from 'react';
import { Quote } from '../../types';

interface QuoteDetailedListViewProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

export default function QuoteDetailedListView({ quotes, onQuoteClick, focusedQuoteId }: QuoteDetailedListViewProps) {
  // 难度颜色映射
  const getDifficultyColor = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  // 难度图标
  const getDifficultyIcon = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '🌱';
      case 'intermediate':
        return '🌿';
      case 'advanced':
        return '🌳';
      default:
        return '❓';
    }
  };

  // 难度标签
  const getDifficultyLabel = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '入门级';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  // 分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'programming':
        return '💻';
      case 'architecture':
        return '🏗️';
      case 'management':
        return '📊';
      case 'philosophy':
        return '🤔';
      case 'design':
        return '🎨';
      case 'security':
        return '🔒';
      case 'engineering':
        return '⚙️';
      default:
        return '📝';
    }
  };

  // 获取分类标签
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'programming':
        return '编程';
      case 'architecture':
        return '架构';
      case 'management':
        return '管理';
      case 'philosophy':
        return '哲学';
      case 'design':
        return '设计';
      case 'security':
        return '安全';
      case 'engineering':
        return '工程';
      default:
        return category;
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div 
      className="space-y-6"
      role="list"
      aria-label="箴言详细列表视图"
    >
      {quotes.map((quote, index) => (
        <article
          key={quote.id}
          role="listitem"
          className={`
            group relative p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
            hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-lg
            transition-all duration-300 ease-in-out cursor-pointer
            ${focusedQuoteId === quote.id 
              ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-600 shadow-lg' 
              : ''
            }
          `}
          onClick={() => onQuoteClick(quote)}
          tabIndex={focusedQuoteId === quote.id ? 0 : -1}
          data-quote-id={quote.id}
        >
          {/* 头部区域 */}
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              {/* 序号和分类图标 */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl text-lg font-bold">
                  {index + 1}
                </div>
                <span className="text-2xl" role="img" aria-label={`分类: ${getCategoryLabel(quote.category)}`}>
                  {getCategoryIcon(quote.category)}
                </span>
              </div>
              
              {/* 作者和来源信息 */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {quote.author}
                </h3>
                {quote.source && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    出处: {quote.source}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  创建于 {formatDate(quote.createdAt)}
                </div>
              </div>
            </div>

            {/* 标签区域 */}
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              {/* 难度标签 */}
              {quote.difficulty && (
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border
                  ${getDifficultyColor(quote.difficulty)}
                `}>
                  <span className="text-lg" role="img" aria-hidden="true">
                    {getDifficultyIcon(quote.difficulty)}
                  </span>
                  <span className="text-sm font-medium">
                    {getDifficultyLabel(quote.difficulty)}
                  </span>
                </div>
              )}
              
              {/* 分类标签 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium">
                  {getCategoryLabel(quote.category)}
                </span>
              </div>
            </div>
          </header>

          {/* 箴言内容 */}
          <blockquote className="relative mb-6">
            <div className="absolute -left-2 -top-2 text-4xl text-primary-200 dark:text-primary-800 font-serif">"</div>
            <div className="absolute -right-2 -bottom-2 text-4xl text-primary-200 dark:text-primary-800 font-serif">"</div>
            <p className="text-gray-800 dark:text-gray-200 text-base leading-relaxed italic font-medium relative z-10 pl-6 pr-6">
              {quote.text}
            </p>
          </blockquote>

          {/* 中文解释 */}
          {quote.chineseExplanation && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                深度解析
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {quote.chineseExplanation}
              </p>
            </div>
          )}

          {/* 标签云 */}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                相关标签:
              </span>
              {quote.tags.map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-sm transition-colors duration-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 悬浮效果指示器 */}
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-xl"></div>
          
          {/* 展开箭头 */}
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </article>
      ))}
      
      {/* 空状态 */}
      {quotes.length === 0 && (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-6">
            <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            暂无匹配的箴言
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            试试调整搜索条件或清除过滤器，探索更多精彩的技术箴言
          </p>
        </div>
      )}
    </div>
  );
}