import React, { memo, useMemo, useCallback } from 'react';
import { Quote } from '../../types';
import { useResponsive, useTouch } from '../../hooks/useResponsive';

interface QuoteCardProps {
  quote: Quote;
  onClick: (quote: Quote) => void;
  className?: string;
  style?: React.CSSProperties;
  isFocused?: boolean;
  tabIndex?: number;
  'data-quote-id'?: string;
}

// 预计算的分类相关数据，避免每次渲染时重复计算
const CATEGORY_COLORS = {
  programming: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  architecture: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  management: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  philosophy: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  design: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
} as const;

const CATEGORY_ICONS = {
  programming: '💻',
  architecture: '🏗️',
  management: '👥',
  philosophy: '🧠',
  design: '🎨',
} as const;

const CATEGORY_LABELS = {
  programming: '编程智慧',
  architecture: '架构思维',
  management: '管理哲学',
  philosophy: '人生哲理',
  design: '设计美学',
} as const;

const DIFFICULTY_LABELS = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
} as const;

function QuoteCard({ 
  quote, 
  onClick, 
  className = '', 
  style,
  isFocused = false,
  tabIndex = 0,
  ...props
}: QuoteCardProps) {
  const { isMobile } = useResponsive();
  const isTouch = useTouch();
  
  // Memoize computed values to prevent recalculation on every render
  const categoryColor = useMemo(() => {
    return CATEGORY_COLORS[quote.category] || CATEGORY_COLORS.programming;
  }, [quote.category]);
  
  const categoryIcon = useMemo(() => {
    return CATEGORY_ICONS[quote.category] || '💡';
  }, [quote.category]);
  
  const categoryLabel = useMemo(() => {
    return CATEGORY_LABELS[quote.category] || '技术箴言';
  }, [quote.category]);
  
  const difficultyLabel = useMemo(() => {
    return quote.difficulty ? DIFFICULTY_LABELS[quote.difficulty] : '';
  }, [quote.difficulty]);
  
  // Memoize truncated text for performance
  const truncatedText = useMemo(() => {
    return quote.text.length > 50 ? `${quote.text.substring(0, 50)}...` : quote.text;
  }, [quote.text]);
  
  // Memoize displayed tags to avoid recalculation
  const displayTags = useMemo(() => {
    const maxTags = isMobile ? 2 : 3;
    return {
      visible: quote.tags.slice(0, maxTags),
      remaining: Math.max(0, quote.tags.length - maxTags)
    };
  }, [quote.tags, isMobile]);
  
  // Memoize aria-label to avoid string concatenation on every render
  const ariaLabel = useMemo(() => {
    return `箴言：${truncatedText}，作者：${quote.author}，分类：${categoryLabel}${quote.difficulty ? `，难度：${difficultyLabel}` : ''}`;
  }, [truncatedText, quote.author, categoryLabel, quote.difficulty, difficultyLabel]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    onClick(quote);
  }, [onClick, quote]);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(quote);
    }
  }, [onClick, quote]);

  return (
    <div
      className={`
        group cursor-pointer transform transition-all duration-300 
        ${isTouch ? 'active:scale-95' : 'hover:scale-105 hover:shadow-lg active:scale-95'}
        focus:outline-none focus:ring-4 focus:ring-primary-500/50 focus:border-primary-500
        bg-white dark:bg-gray-800 rounded-xl shadow-soft 
        border border-gray-200 dark:border-gray-700
        ${isMobile ? 'p-4' : 'p-6'} h-full flex flex-col
        ${isFocused ? 'ring-4 ring-primary-500/50 border-primary-500 shadow-lg' : ''}
        ${className}
      `}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role="button"
      aria-label={ariaLabel}
      aria-describedby={`quote-${quote.id}-description`}
      {...props}
    >
      {/* 分类标签 */}
      <div className="flex items-center justify-between mb-4">
        <span 
          className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${categoryColor}
          `}
          aria-label={`分类：${categoryLabel}`}
        >
          <span className="mr-1" aria-hidden="true">{categoryIcon}</span>
          {categoryLabel}
        </span>
        
        {quote.difficulty && (
          <span 
            className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
            aria-label={`难度：${difficultyLabel}`}
            title={`难度：${difficultyLabel}`}
          >
            {difficultyLabel}
          </span>
        )}
      </div>

      {/* 箴言内容 */}
      <blockquote className="flex-1 mb-4">
        <p className={`text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic ${
          isMobile ? 'text-base' : 'text-lg'
        }`}>
          "{quote.text}"
        </p>
      </blockquote>

      {/* 作者信息 */}
      <footer className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-gray-900 dark:text-white ${
              isMobile ? 'text-sm' : 'text-base'
            } truncate`}>
              {quote.author}
            </p>
            {quote.source && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                {quote.source}
              </p>
            )}
          </div>
          
          {/* 展开指示器 */}
          <div className="text-primary-500 group-hover:text-primary-600 transition-colors" aria-hidden="true">
            <svg className="w-4 h-4 transform group-hover:scale-110 transition-transform" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* 标签 - 移动端优化 */}
        {displayTags.visible.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3" role="list" aria-label="相关标签">
            {displayTags.visible.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                role="listitem"
              >
                #{tag}
              </span>
            ))}
            {displayTags.remaining > 0 && (
              <span 
                className="text-xs text-gray-400 px-2 py-1"
                role="listitem"
                aria-label={`还有 ${displayTags.remaining} 个标签`}
              >
                +{displayTags.remaining}
              </span>
            )}
          </div>
        )}

      {/* 隐藏的描述，供屏幕阅读器使用 */}
      <div id={`quote-${quote.id}-description`} className="sr-only">
        {quote.source && `来源：${quote.source}。`}
        标签：{quote.tags.join('、')}。
        按回车键或空格键打开详细信息。
      </div>
      </footer>
    </div>
  );
}

// Memoize the component with custom comparison
export default memo(QuoteCard, (prevProps, nextProps) => {
  // Only re-render if relevant props have changed
  return (
    prevProps.quote.id === nextProps.quote.id &&
    prevProps.quote.text === nextProps.quote.text &&
    prevProps.quote.author === nextProps.quote.author &&
    prevProps.quote.category === nextProps.quote.category &&
    prevProps.quote.difficulty === nextProps.quote.difficulty &&
    prevProps.quote.tags.length === nextProps.quote.tags.length &&
    prevProps.quote.tags.every((tag, i) => tag === nextProps.quote.tags[i]) &&
    prevProps.isFocused === nextProps.isFocused &&
    prevProps.tabIndex === nextProps.tabIndex &&
    prevProps.className === nextProps.className
  );
});