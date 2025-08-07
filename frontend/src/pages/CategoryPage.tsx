import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { categoriesApi, articlesApi } from '../api';
import { Category, Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const loadCategory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await categoriesApi.getCategoryBySlug(slug);
        setCategory(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '分类加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [slug]);

  const fetchCategoryArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    if (!category) throw new Error('Category not found');
    const response = await articlesApi.getArticlesByCategory(category.id, {
      page,
      limit,
      sortBy: 'published_at',
      sortOrder: 'desc',
    });
    // 转换API返回的数据格式为ArticleList期望的格式
    return {
      items: response.data.articles || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || page,
      limit: response.data.pagination?.limit || limit,
      totalPages: response.data.pagination?.total_pages || 1,
    };
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error || !category) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              分类未找到
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || '请求的分类不存在'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                返回首页
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                浏览所有分类
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Category Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400">
                首页
              </Link>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link to="/categories" className="hover:text-primary-600 dark:hover:text-primary-400">
                分类
              </Link>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900 dark:text-white">{category.name}</span>
            </nav>

            {/* Category Info */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {category.description}
              </p>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              {category.articlesCount || 0} 篇文章
            </div>
          </div>

          {/* Category Icon/Image placeholder */}
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Parent/Child Categories */}
        <div className="flex flex-wrap gap-4">
          {/* Parent Category */}
          {category.parent && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">父分类:</span>
              <Link
                to={`/category/${category.parent.slug}`}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 
                           bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 
                           dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {category.parent.name}
              </Link>
            </div>
          )}

          {/* Child Categories */}
          {category.children && category.children.length > 0 && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">子分类:</span>
              <div className="flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/category/${child.slug}`}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 
                               bg-primary-100 dark:bg-primary-900/30 rounded-full hover:bg-primary-200 
                               dark:hover:bg-primary-900/50 transition-colors"
                  >
                    {child.name}
                    <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Articles List */}
      <ArticleList
        fetchArticles={fetchCategoryArticles}
        variant="default"
        columns={2}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}