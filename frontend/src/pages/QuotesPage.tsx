import React, { useState, useCallback, useMemo } from 'react';
import { Quote, QuoteFilters, QuoteCategory } from '../types';
import QuoteGrid from '../components/quotes/QuoteGrid';
import QuoteFiltersComponent from '../components/quotes/QuoteFilters';
import QuoteDetailModal from '../components/quotes/QuoteDetailModal';
import { useQuotes } from '../hooks/useQuotes';
import { QuoteErrorBoundary } from '../components/ErrorBoundary';

export default function QuotesPage() {
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotesWithLikes, setQuotesWithLikes] = useState<Quote[]>([]);
  
  // 暂时禁用性能监控，避免性能开销
  // const performanceMetrics = process.env.NODE_ENV === 'development' 
  //   ? usePerformanceMonitor('QuotesPage')
  //   : { renderCount: 0, lastRenderDuration: 0 };
  const performanceMetrics = { renderCount: 0, lastRenderDuration: 0 };
  
  // 直接使用过滤器，不使用防抖
  const { quotes, loading, error, refetch, retryCount } = useQuotes(filters);
  
  // 初始化点赞状态
  React.useEffect(() => {
    const quotesWithInitialLikes = quotes.map(quote => ({
      ...quote,
      isLiked: quote.isLiked ?? false,
      likesCount: quote.likesCount ?? 0
    }));
    setQuotesWithLikes(quotesWithInitialLikes);
  }, [quotes]);
  
  // 智能视图模式选择 - 暂时禁用以避免额外的重新渲染
  // const optimalViewMode = useOptimalViewMode(quotes, viewMode, userViewModePreference);
  
  // 处理过滤器变化 - 使用useCallback避免重新创建
  const handleFiltersChange = useCallback((newFilters: QuoteFilters) => {
    setFilters(newFilters);
  }, []);

  // 处理箴言点击 - 使用useCallback避免重新创建
  const handleQuoteClick = useCallback((quote: Quote) => {
    setSelectedQuote(quote);
  }, []);
  
  // 处理点赞功能
  const handleLike = useCallback((quoteId: string, isLiked: boolean) => {
    setQuotesWithLikes(prevQuotes => 
      prevQuotes.map(quote => {
        if (quote.id === quoteId) {
          const newLikesCount = isLiked 
            ? (quote.likesCount ?? 0) + 1 
            : Math.max((quote.likesCount ?? 0) - 1, 0);
          return {
            ...quote,
            isLiked,
            likesCount: newLikesCount
          };
        }
        return quote;
      })
    );
    
    // 更新selectedQuote以便Modal显示最新状态
    setSelectedQuote(prevSelected => {
      if (prevSelected && prevSelected.id === quoteId) {
        const newLikesCount = isLiked 
          ? (prevSelected.likesCount ?? 0) + 1 
          : Math.max((prevSelected.likesCount ?? 0) - 1, 0);
        return {
          ...prevSelected,
          isLiked,
          likesCount: newLikesCount
        };
      }
      return prevSelected;
    });
  }, []);
  
  // 移除键盘导航功能以避免与用户登录功能冲突
  const focusedQuoteId = null;
  const announcementText = '';

  // 处理详情关闭 - 使用useCallback避免重新创建
  const handleDetailClose = useCallback(() => {
    setSelectedQuote(null);
  }, []);


  // 优化的统计信息计算 - 使用更高效的算法
  const { authorsCount, categoriesCount, availableCategories, availableTags } = useMemo(() => {
    if (quotesWithLikes.length === 0) {
      return {
        authorsCount: 0,
        categoriesCount: 0,
        availableCategories: [],
        availableTags: []
      };
    }
    
    const authorsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const tagsSet = new Set<string>();
    
    // 单次遍历计算所有统计信息
    for (const quote of quotesWithLikes) {
      authorsSet.add(quote.author);
      categoriesSet.add(quote.category);
      for (const tag of quote.tags) {
        tagsSet.add(tag);
      }
    }
    
    return {
      authorsCount: authorsSet.size,
      categoriesCount: categoriesSet.size,
      availableCategories: Array.from(categoriesSet) as QuoteCategory[],
      availableTags: Array.from(tagsSet)
    };
  }, [quotesWithLikes]);



  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载箴言中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">加载失败</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          
          {/* 重试控制 */}
          <div className="space-y-3">
            <button
              onClick={refetch}
              disabled={retryCount > 0}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors"
            >
              {retryCount > 0 ? `重试中... (${retryCount}/3)` : '重新加载'}
            </button>
            
            {retryCount >= 3 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                多次重试失败，请检查网络连接或稍后再试
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
      role="main"
      aria-label="技术箴言页面"
    >
      
      {/* 屏幕阅读器宣布区域 */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {announcementText}
      </div>
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <header className="mb-8" role="banner">
          <div className="text-center mb-6">
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              汇聚技术大师的智慧，用简练的话语点亮编程之路
            </p>
          </div>

          {/* 统计信息 - 使用useMemo优化计算 */}
          <div className="flex justify-center items-center gap-8 mb-6 text-sm text-gray-500 dark:text-gray-400">
            <span>共 {quotesWithLikes.length} 条箴言</span>
            <span>•</span>
            <span>来自 {authorsCount} 位大师</span>
            <span>•</span>
            <span>涵盖 {categoriesCount} 个领域</span>
          </div>


          {/* 过滤器 */}
          <section aria-label="箴言过滤选项" className="space-y-4">
            <QuoteFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableCategories={availableCategories}
              availableTags={availableTags}
            />

            {/* 统计信息 */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <span>当前显示 {quotesWithLikes.length} 条箴言</span>
              {process.env.NODE_ENV === 'development' && performanceMetrics.renderCount > 0 && (
                <>
                  <span className="hidden lg:inline">•</span>
                  <span className="hidden lg:inline text-xs">
                    渲染: {performanceMetrics.renderCount}次
                    {performanceMetrics.lastRenderDuration > 0 &&
                      ` (${performanceMetrics.lastRenderDuration.toFixed(1)}ms)`}
                  </span>
                </>
              )}
            </div>
          </section>
        </header>

        {/* 内容区域 */}
        <main id="main-content" role="main" aria-label="箴言列表">
          <QuoteErrorBoundary>
            {quotesWithLikes.length === 0 ? (
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
          ) : (
            <>
              {/* 箴言网格展示 */}
              <QuoteGrid
                quotes={quotesWithLikes}
                onQuoteClick={handleQuoteClick}
                focusedQuoteId={focusedQuoteId}
              />
              
            </>
            )}
          </QuoteErrorBoundary>
        </main>
      </div>

      {/* 翻书动画详情模态框 */}
      <QuoteDetailModal
        quote={selectedQuote}
        isOpen={!!selectedQuote}
        onClose={handleDetailClose}
        onLike={handleLike}
        quotes={quotesWithLikes}
        onNavigateToQuote={setSelectedQuote}
      />
      
    </div>
  );
}