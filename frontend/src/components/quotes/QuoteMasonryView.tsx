import React, { useEffect, useRef, useState } from 'react';
import { Quote } from '../../types';

interface QuoteMasonryViewProps {
  quotes: Quote[];
  onQuoteClick: (quote: Quote) => void;
  focusedQuoteId?: string | null;
}

export default function QuoteMasonryView({ quotes, onQuoteClick, focusedQuoteId }: QuoteMasonryViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  // 响应式列数调整
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setColumns(1); // 手机
      } else if (width < 1024) {
        setColumns(2); // 平板
      } else if (width < 1280) {
        setColumns(3); // 小桌面
      } else {
        setColumns(4); // 大桌面
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // 将引用分配到列中
  const distributeQuotes = () => {
    const columnArray: Quote[][] = Array.from({ length: columns }, () => []);
    
    quotes.forEach((quote, index) => {
      const columnIndex = index % columns;
      columnArray[columnIndex].push(quote);
    });
    
    return columnArray;
  };

  const quotesColumns = distributeQuotes();

  // 获取卡片高度样式（基于内容长度）
  const getCardHeightClass = (quote: Quote) => {
    const textLength = quote.text.length;
    const hasExplanation = !!quote.chineseExplanation;
    const tagCount = quote.tags?.length || 0;
    
    // 基础高度 + 内容长度 + 解释 + 标签数量
    const scoreBase = 200;
    const scoreText = textLength * 0.8;
    const scoreExplanation = hasExplanation ? 60 : 0;
    const scoreTags = tagCount * 15;
    
    const totalScore = scoreBase + scoreText + scoreExplanation + scoreTags;
    
    if (totalScore < 280) {
      return 'min-h-[280px]';
    } else if (totalScore < 360) {
      return 'min-h-[360px]';
    } else if (totalScore < 440) {
      return 'min-h-[440px]';
    } else {
      return 'min-h-[520px]';
    }
  };

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

  // 分类颜色映射
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'programming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'architecture':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'management':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300';
      case 'philosophy':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
      case 'design':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300';
      case 'security':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'engineering':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // 获取分类图标
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

  const QuoteCard = ({ quote }: { quote: Quote }) => (
    <div
      className={`
        group relative break-inside-avoid mb-6 p-5 
        bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
        hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-xl
        transition-all duration-300 ease-in-out cursor-pointer
        ${getCardHeightClass(quote)}
        ${focusedQuoteId === quote.id 
          ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-600 shadow-xl' 
          : ''
        }
      `}
      onClick={() => onQuoteClick(quote)}
      tabIndex={focusedQuoteId === quote.id ? 0 : -1}
      data-quote-id={quote.id}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={`分类: ${quote.category}`}>
            {getCategoryIcon(quote.category)}
          </span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              {quote.author}
            </h3>
            {quote.source && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {quote.source}
              </p>
            )}
          </div>
        </div>
        
        {/* 右上角标签 */}
        <div className="flex flex-col gap-2">
          {quote.difficulty && (
            <span className={`
              px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
              ${getDifficultyColor(quote.difficulty)}
            `}>
              {quote.difficulty === 'beginner' ? '入门' : 
               quote.difficulty === 'intermediate' ? '中级' : '高级'}
            </span>
          )}
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
            ${getCategoryColor(quote.category)}
          `}>
            {quote.category}
          </span>
        </div>
      </div>

      {/* 箴言内容 */}
      <blockquote className="relative mb-4">
        <div className="absolute -left-1 -top-1 text-2xl text-primary-200 dark:text-primary-800 font-serif leading-none">"</div>
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed italic pl-4 pr-2">
          {quote.text}
        </p>
        <div className="absolute -right-1 -bottom-1 text-2xl text-primary-200 dark:text-primary-800 font-serif leading-none">"</div>
      </blockquote>

      {/* 中文解释 */}
      {quote.chineseExplanation && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {quote.chineseExplanation.length > 120 
              ? `${quote.chineseExplanation.substring(0, 120)}...` 
              : quote.chineseExplanation}
          </p>
        </div>
      )}

      {/* 标签 */}
      {quote.tags && quote.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quote.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
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

      {/* 悬浮效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-100/0 dark:from-primary-900/0 dark:to-primary-800/0 group-hover:from-primary-50/30 group-hover:to-primary-100/30 dark:group-hover:from-primary-900/20 dark:group-hover:to-primary-800/20 transition-all duration-300 rounded-xl pointer-events-none"></div>
      
      {/* 点击指示器 */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center justify-center w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="w-full"
      role="list"
      aria-label="箴言瀑布流视图"
    >
      {quotes.length === 0 ? (
        // 空状态
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
      ) : (
        // 瀑布流布局
        <div className={`grid gap-6 ${
          columns === 1 ? 'grid-cols-1' :
          columns === 2 ? 'grid-cols-2' :
          columns === 3 ? 'grid-cols-3' :
          'grid-cols-4'
        }`}>
          {quotesColumns.map((columnQuotes, columnIndex) => (
            <div key={columnIndex} className="space-y-0" role="group">
              {columnQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}