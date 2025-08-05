import { useState, useEffect } from 'react';
import { Article, PaginatedResponse } from '../types';
import ArticleCard from './ArticleCard';
import LoadingSpinner from './LoadingSpinner';
import Pagination from './Pagination';

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
}: ArticleListProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

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

  const getGridClasses = () => {
    const gridClasses = {
      1: 'grid grid-cols-1 gap-6',
      2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
      3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    };
    return gridClasses[columns];
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

      {/* Articles Grid */}
      <div className={getGridClasses()}>
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            variant={variant}
            showCategory={showCategory}
            showTags={showTags}
            showStats={showStats}
          />
        ))}
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