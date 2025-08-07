import { useState, useEffect } from 'react';
import { Article, PaginatedResponse } from '../types';
import ArticleCard from './ArticleCard';
import LoadingSpinner from './LoadingSpinner';
import Pagination from './Pagination';

type ViewMode = 'card' | 'list' | 'icon' | 'column';

interface ArticleListProps {
  fetchArticles: (page: number, limit: number) => Promise<PaginatedResponse<Article>>;
  title?: string;
  description?: string;
  variant?: 'default' | 'compact' | 'featured';
  columns?: 1 | 2 | 3;
  showCategory?: boolean;
  showTags?: boolean;
  showStats?: boolean;
  showPagination?: boolean;
  initialPage?: number;
  pageSize?: number;
  defaultViewMode?: ViewMode;
  allowViewModeChange?: boolean;
}

export default function ArticleList({
  fetchArticles,
  title,
  description,
  variant = 'default',
  columns = 2,
  showCategory = true,
  showTags = true,
  showStats = true,
  showPagination = true,
  initialPage = 1,
  pageSize = 10,
  defaultViewMode = 'card',
  allowViewModeChange = true,
}: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  const loadArticles = async (page: number, limit: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchArticles(page, limit);
      setArticles(response.items || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
      setCurrentPage(response.page || page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章失败');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles(currentPage, currentPageSize);
  }, [currentPage, currentPageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setCurrentPageSize(newSize);
    setCurrentPage(1);
  };

  const getLayoutClasses = () => {
    if (viewMode === 'list') {
      return 'space-y-4';
    }
    if (viewMode === 'icon') {
      return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4';
    }
    if (viewMode === 'column') {
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
    // card view (default)
    const gridClasses = {
      1: 'grid grid-cols-1 gap-6',
      2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
      3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    };
    return gridClasses[columns];
  };

  const ViewModeToggle = () => {
    if (!allowViewModeChange) return null;

    const modes: { mode: ViewMode; icon: string; title: string }[] = [
      { mode: 'card', icon: '■', title: '卡片视图' },
      { mode: 'list', icon: '☰', title: '列表视图' },
      { mode: 'icon', icon: '⚏', title: '图标视图' },
      { mode: 'column', icon: '|||', title: '分栏视图' },
    ];

    return (
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {modes.map((modeConfig) => (
            <button
              key={modeConfig.mode}
              onClick={() => setViewMode(modeConfig.mode)}
              title={modeConfig.title}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === modeConfig.mode
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${
                modeConfig.mode === modes[0].mode ? 'rounded-l-lg' : ''
              } ${
                modeConfig.mode === modes[modes.length - 1].mode ? 'rounded-r-lg' : ''
              }`}
            >
              {modeConfig.icon}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderArticleItem = (article: Article) => {
    if (viewMode === 'list') {
      return (
        <div key={article.id} className="flex bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
          {article.coverImage && (
            <div className="w-32 h-24 flex-shrink-0">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">
                {article.title}
              </h3>
              {showStats && (
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>👁 {article.viewsCount || 0}</span>
                  <span>❤ {article.likesCount || 0}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {article.excerpt || article.content?.substring(0, 120) + '...'}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                {showCategory && article.category && (
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                    {article.category.name}
                  </span>
                )}
                {showTags && article.tags && article.tags.length > 0 && (
                  <div className="flex gap-1">
                    {article.tags.slice(0, 2).map((tag) => (
                      <span key={tag.id} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (viewMode === 'icon') {
      return (
        <div key={article.id} className="text-center group cursor-pointer">
          <div className="w-16 h-16 mx-auto mb-2 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
            {article.coverImage ? (
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {article.title}
          </h4>
          {showStats && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              👁 {article.viewsCount || 0}
            </p>
          )}
        </div>
      );
    }

    if (viewMode === 'column') {
      return (
        <div key={article.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-sm transition-shadow">
          {article.coverImage && (
            <div className="h-32 overflow-hidden">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer line-clamp-2 mb-2">
              {article.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-3 mb-3">
              {article.excerpt || article.content?.substring(0, 80) + '...'}
            </p>
            <div className="flex items-center justify-between text-xs">
              {showCategory && article.category ? (
                <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                  {article.category.name}
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                </span>
              )}
              {showStats && (
                <span className="text-gray-500 dark:text-gray-400">
                  👁 {article.viewsCount || 0}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default card view
    return (
      <ArticleCard
        key={article.id}
        article={article}
        variant={variant}
        showCategory={showCategory}
        showTags={showTags}
        showStats={showStats}
      />
    );
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            加载失败
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => loadArticles(currentPage, currentPageSize)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无文章
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            还没有发布任何文章，请稍后再来查看。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {(title || description) && (
        <div className="text-center">
          {title && (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>
      )}

      {/* View Mode Toggle */}
      <ViewModeToggle />

      {/* Articles Display */}
      <div className={getLayoutClasses()}>
        {articles.map(renderArticleItem)}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          showSizeChanger={true}
          pageSize={currentPageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Results Info */}
      {total > 0 && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          共找到 {total} 篇文章
        </div>
      )}
    </div>
  );
}