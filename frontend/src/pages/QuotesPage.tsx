import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Quote, QuoteFilters, ViewMode } from '../types';
import QuoteGrid from '../components/quotes/QuoteGrid';
import QuoteListView from '../components/quotes/QuoteListView';
import QuoteDetailedListView from '../components/quotes/QuoteDetailedListView';
import QuoteMasonryView from '../components/quotes/QuoteMasonryView';
import QuoteFiltersComponent from '../components/quotes/QuoteFilters';
import ViewModeSelector from '../components/quotes/ViewModeSelector';
import QuoteDetailModal from '../components/quotes/QuoteDetailModal';
import { useQuotes } from '../hooks/useQuotes';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { usePerformanceMonitor, useOptimalViewMode } from '../hooks/usePerformanceOptimization';
import { QuoteErrorBoundary } from '../components/ErrorBoundary';

export default function QuotesPage() {
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [userViewModePreference, setUserViewModePreference] = useState<ViewMode>();
  
  // 暂时禁用性能监控，避免性能开销
  // const performanceMetrics = process.env.NODE_ENV === 'development' 
  //   ? usePerformanceMonitor('QuotesPage')
  //   : { renderCount: 0, lastRenderDuration: 0 };
  const performanceMetrics = { renderCount: 0, lastRenderDuration: 0 };
  
  // 直接使用过滤器，不使用防抖
  const { quotes, loading, error, refetch, retryCount } = useQuotes(filters);
  
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
  
  // 键盘导航
  const {
    focusedQuoteId,
    handleKeyDown,
    setFocusedQuoteId,
    announcementText,
  } = useKeyboardNavigation({
    quotes,
    onQuoteSelect: handleQuoteClick,
    isFloatingMode: false, // 始终为静态模式
  });

  // 处理详情关闭 - 使用useCallback避免重新创建
  const handleDetailClose = useCallback(() => {
    setSelectedQuote(null);
    // 恢复键盘焦点到之前选中的箴言
    if (focusedQuoteId) {
      setTimeout(() => {
        const element = document.querySelector(`[data-quote-id="${focusedQuoteId}"]`) as HTMLElement;
        if (element) {
          element.focus();
        }
      }, 100);
    }
  }, [focusedQuoteId]);

  // 处理视图模式更改
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    setUserViewModePreference(newMode);
  }, []);

  // 优化的统计信息计算 - 使用更高效的算法
  const { authorsCount, categoriesCount, availableCategories, availableTags } = useMemo(() => {
    if (quotes.length === 0) {
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
    for (const quote of quotes) {
      authorsSet.add(quote.author);
      categoriesSet.add(quote.category);
      for (const tag of quote.tags) {
        tagsSet.add(tag);
      }
    }
    
    return {
      authorsCount: authorsSet.size,
      categoriesCount: categoriesSet.size,
      availableCategories: Array.from(categoriesSet),
      availableTags: Array.from(tagsSet)
    };
  }, [quotes]);

  // 优化的键盘快捷键处理 - 减少依赖项
  const handleViewModeKeyDown = useCallback((event: KeyboardEvent) => {
    // 防止在模态框打开或输入框聚焦时处理
    if (document.querySelector('[role="dialog"]') || 
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    // 缓存视图模式数组
    const viewModes: ViewMode[] = ['grid', 'list', 'detailed', 'masonry'];
    
    switch (event.key) {
      case '1':
        if (!event.ctrlKey && !event.altKey && !event.metaKey && !focusedQuoteId) {
          event.preventDefault();
          handleViewModeChange('grid');
        }
        break;
      case '2':
        if (!event.ctrlKey && !event.altKey && !event.metaKey && !focusedQuoteId) {
          event.preventDefault();
          handleViewModeChange('list');
        }
        break;
      case '3':
        if (!event.ctrlKey && !event.altKey && !event.metaKey && !focusedQuoteId) {
          event.preventDefault();
          handleViewModeChange('detailed');
        }
        break;
      case '4':
        if (!event.ctrlKey && !event.altKey && !event.metaKey && !focusedQuoteId) {
          event.preventDefault();
          handleViewModeChange('masonry');
        }
        break;
      case 'v':
      case 'V':
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          const currentIndex = viewModes.indexOf(viewMode);
          const nextIndex = (currentIndex + 1) % viewModes.length;
          handleViewModeChange(viewModes[nextIndex]);
        }
        break;
    }
  }, [viewMode, handleViewModeChange, focusedQuoteId]);

  // 优化的键盘事件监听 - 使用单一处理函数
  const combinedKeyHandler = useCallback((event: KeyboardEvent) => {
    handleKeyDown(event);
    handleViewModeKeyDown(event);
  }, [handleKeyDown, handleViewModeKeyDown]);
  
  useEffect(() => {
    document.addEventListener('keydown', combinedKeyHandler);
    return () => {
      document.removeEventListener('keydown', combinedKeyHandler);
    };
  }, [combinedKeyHandler]);

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
      {/* 跳过导航链接 */}
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              技术箴言
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              汇聚技术大师的智慧，用简练的话语点亮编程之路
            </p>
          </div>

          {/* 统计信息 - 使用useMemo优化计算 */}
          <div className="flex justify-center items-center gap-8 mb-6 text-sm text-gray-500 dark:text-gray-400">
            <span>共 {quotes.length} 条箴言</span>
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

            {/* 视图模式选择器 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <ViewModeSelector
                currentMode={viewMode}
                onModeChange={handleViewModeChange}
                className="flex-shrink-0"
              />
              
              {/* 统计信息增强 */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>当前显示 {quotes.length} 条箴言</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {viewMode === 'grid' ? '网格视图' :
                   viewMode === 'list' ? '列表视图' :
                   viewMode === 'detailed' ? '详细视图' : '瀑布流视图'}
                </span>
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
            </div>
          </section>
        </header>

        {/* 内容区域 */}
        <main id="main-content" role="main" aria-label="箴言列表">
          <QuoteErrorBoundary>
            {quotes.length === 0 ? (
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
              {/* 静态展示：根据视图模式选择组件 */}
              <div id={`quotes-content-${viewMode}`} role="tabpanel" aria-labelledby={`view-mode-${viewMode}`}>
                {viewMode === 'grid' && (
                  <QuoteGrid 
                    quotes={quotes}
                    onQuoteClick={handleQuoteClick}
                    focusedQuoteId={focusedQuoteId}
                  />
                )}
                {viewMode === 'list' && (
                  <QuoteListView
                    quotes={quotes}
                    onQuoteClick={handleQuoteClick}
                    focusedQuoteId={focusedQuoteId}
                  />
                )}
                {viewMode === 'detailed' && (
                  <QuoteDetailedListView
                    quotes={quotes}
                    onQuoteClick={handleQuoteClick}
                    focusedQuoteId={focusedQuoteId}
                  />
                )}
                {viewMode === 'masonry' && (
                  <QuoteMasonryView
                    quotes={quotes}
                    onQuoteClick={handleQuoteClick}
                    focusedQuoteId={focusedQuoteId}
                  />
                )}
              </div>
              
              {/* 键盘导航说明 */}
              <section 
                className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                aria-labelledby="keyboard-help-title"
              >
                <h3 id="keyboard-help-title" className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  🎹 键盘导航帮助
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-200">
                  <div>
                    <h4 className="font-medium mb-2">基础导航</h4>
                    <ul className="space-y-1">
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">方向键</kbd> 在箴言间导航</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">回车/空格</kbd> 打开详情</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Esc</kbd> 关闭详情</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">快捷操作</h4>
                    <ul className="space-y-1">
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">Home/End</kbd> 跳转首尾</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">数字键</kbd> 快速跳转</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">F</kbd> 聚焦搜索框</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">?</kbd> 显示帮助</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">视图模式</h4>
                    <ul className="space-y-1">
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">1-4</kbd> 快速切换视图</li>
                      <li><kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">V</kbd> 循环切换视图</li>
                      <li className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        1=网格 2=列表 3=详细 4=瀑布流
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
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
      />
      
      {/* 页面级别的键盘导航说明 */}
      <div className="sr-only" aria-live="polite">
        使用方向键在箴言间导航，按回车键或空格键查看详情，按问号键获取帮助。
      </div>
    </div>
  );
}