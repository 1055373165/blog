import React, { useRef, useEffect, useState } from 'react';
import { Quote } from '../../types';
import { useVirtualization } from '../../hooks/useVirtualization';

interface VirtualizedQuoteDetailedListViewProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

const ITEM_HEIGHT = 320; // 每个详细卡片的估算高度

export default function VirtualizedQuoteDetailedListView({ 
  quotes, 
  onQuoteClick, 
  focusedQuoteId 
}: VirtualizedQuoteDetailedListViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // 监听容器尺寸变化
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const viewportHeight = window.innerHeight;
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const availableHeight = viewportHeight - containerTop - 100; // 留一些边距
        setContainerHeight(Math.max(400, availableHeight));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const { visibleItems, totalHeight, handleScroll } = useVirtualization(quotes, {
    itemHeight: ITEM_HEIGHT,
    containerHeight,
    overscan: 3,
  });

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

  // 其他辅助函数（复用原组件的逻辑）
  const getDifficultyIcon = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🌿';
      case 'advanced': return '🌳';
      default: return '❓';
    }
  };

  const getDifficultyLabel = (difficulty?: Quote['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return '入门级';
      case 'intermediate': return '中级';
      case 'advanced': return '高级';
      default: return '未知';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      programming: '💻', architecture: '🏗️', management: '📊',
      philosophy: '🤔', design: '🎨', security: '🔒', engineering: '⚙️'
    };
    return icons[category] || '📝';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      programming: '编程', architecture: '架构', management: '管理',
      philosophy: '哲学', design: '设计', security: '安全', engineering: '工程'
    };
    return labels[category] || category;
  };

  if (quotes.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* 性能信息显示 */}
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
        <span>显示 {visibleItems.length} / {quotes.length} 条箴言</span>
        <span>• 虚拟化渲染优化</span>
      </div>

      {/* 虚拟化容器 */}
      <div
        ref={containerRef}
        className="relative overflow-auto rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
        role="list"
        aria-label="箴言详细列表视图（虚拟化）"
      >
        {/* 总高度占位符 */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ index, item: quote, style }) => (
            <article
              key={quote.id}
              style={style}
              className={`
                group px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
                hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer
                transition-all duration-200 ease-in-out
                ${focusedQuoteId === quote.id 
                  ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : ''
                }
              `}
              onClick={() => onQuoteClick(quote)}
              tabIndex={focusedQuoteId === quote.id ? 0 : -1}
              data-quote-id={quote.id}
              role="listitem"
            >
              {/* 头部区域 */}
              <header className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  {/* 序号和分类图标 */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-lg" role="img" aria-label={`分类: ${getCategoryLabel(quote.category)}`}>
                      {getCategoryIcon(quote.category)}
                    </span>
                  </div>
                  
                  {/* 作者和来源信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {quote.author}
                    </h3>
                    {quote.source && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                        出处: {quote.source}
                      </p>
                    )}
                  </div>
                </div>

                {/* 标签区域 */}
                <div className="flex gap-2 flex-shrink-0">
                  {/* 难度标签 */}
                  {quote.difficulty && (
                    <div className={`
                      flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border
                      ${getDifficultyColor(quote.difficulty)}
                    `}>
                      <span role="img" aria-hidden="true">
                        {getDifficultyIcon(quote.difficulty)}
                      </span>
                      <span className="hidden sm:inline">
                        {getDifficultyLabel(quote.difficulty)}
                      </span>
                    </div>
                  )}
                  
                  {/* 分类标签 */}
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-md text-xs font-medium">
                    {getCategoryLabel(quote.category)}
                  </div>
                </div>
              </header>

              {/* 箴言内容 */}
              <blockquote className="relative mb-4">
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed italic pl-4 border-l-2 border-primary-300 dark:border-primary-600">
                  "{quote.text}"
                </p>
              </blockquote>

              {/* 中文解释（截断显示） */}
              {quote.chineseExplanation && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {quote.chineseExplanation.length > 100 
                      ? `${quote.chineseExplanation.substring(0, 100)}...`
                      : quote.chineseExplanation
                    }
                  </p>
                </div>
              )}

              {/* 标签云（限制显示数量） */}
              {quote.tags && quote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {quote.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                  {quote.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded text-xs">
                      +{quote.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 展开指示器 */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}