import React from 'react';
import { Quote } from '../../types';

interface QuoteListViewProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

export default function QuoteListView({ quotes, onQuoteClick, focusedQuoteId }: QuoteListViewProps) {
  // 难度颜色映射
  const getDifficultyColor = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // 难度标签
  const getDifficultyLabel = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '入门';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  return (
    <div 
      className="space-y-3"
      role="list"
      aria-label="箴言列表视图"
    >
      {quotes.map((quote, index) => (
        <div
          key={quote.id}
          role="listitem"
          className={`
            group relative p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
            hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md
            transition-all duration-200 ease-in-out cursor-pointer
            ${focusedQuoteId === quote.id 
              ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-600' 
              : ''
            }
          `}
          onClick={() => onQuoteClick(quote)}
          tabIndex={focusedQuoteId === quote.id ? 0 : -1}
          data-quote-id={quote.id}
        >
          {/* 头部信息 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* 序号 */}
              <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-sm font-semibold">
                {index + 1}
              </div>
              
              {/* 作者信息 */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {quote.author}
                </h3>
                {quote.source && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {quote.source}
                  </p>
                )}
              </div>
            </div>

            {/* 右侧标签 */}
            <div className="flex items-center gap-2">
              {/* 难度标签 */}
              {quote.difficulty && (
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${getDifficultyColor(quote.difficulty)}
                `}>
                  {getDifficultyLabel(quote.difficulty)}
                </span>
              )}
              
              {/* 分类标签 */}
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-xs font-medium">
                {quote.category}
              </span>
            </div>
          </div>

          {/* 箴言内容 */}
          <blockquote className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3" style={{ fontFamily: 'var(--font-body)', fontStyle: 'normal' }}>
            "{quote.text}"
          </blockquote>

          {/* 标签列表 */}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {quote.tags.slice(0, 4).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
              {quote.tags.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded text-xs">
                  +{quote.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* 中文解释预览 */}
          {quote.chineseExplanation && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {quote.chineseExplanation.length > 80 
                ? `${quote.chineseExplanation.substring(0, 80)}...`
                : quote.chineseExplanation
              }
            </p>
          )}

          {/* 悬浮效果指示器 */}
          <div className="absolute inset-y-0 left-0 w-1 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-l-lg"></div>
          
          {/* 展开箭头 */}
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
      
      {/* 空状态 */}
      {quotes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无匹配的箴言
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            试试调整搜索条件或清除过滤器
          </p>
        </div>
      )}
    </div>
  );
}