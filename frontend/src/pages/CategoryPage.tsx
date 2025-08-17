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
      sort_by: 'published_at',
      sort_order: 'desc',
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              分类未找到
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error || '请求的分类不存在或已被删除'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn btn-primary">
                返回首页
              </Link>
              <Link to="/categories" className="btn btn-outline">
                浏览所有分类
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section with Gradient Background */}
      <div className="bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link to="/" className="hover:text-go-600 dark:hover:text-go-400 transition-colors">
              首页
            </Link>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link to="/categories" className="hover:text-go-600 dark:hover:text-go-400 transition-colors">
              分类
            </Link>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 dark:text-white">{category.name}</span>
          </nav>

          {/* Category Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 mb-2">
                    分类
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {category.name}
              </h1>
              
              {category.description && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium">{category.articles_count || 0}</span>
                <span className="ml-1">篇文章</span>
              </div>
            </div>

            {/* Large Category Icon */}
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/30 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="w-12 h-12 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Relationships */}
      {(category.parent || (category.children && category.children.length > 0)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
          <div className="card p-6">
            <div className="flex flex-wrap gap-6">
              {/* Parent Category */}
              {category.parent && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">父分类</span>
                  <Link
                    to={`/category/${category.parent.slug}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                               bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 
                               dark:hover:bg-gray-600 transition-all duration-200 hover:shadow-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {category.parent.name}
                  </Link>
                </div>
              )}

              {/* Child Categories */}
              {category.children && category.children.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">子分类</span>
                  <div className="flex flex-wrap gap-2">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        to={`/category/${child.slug}`}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-go-700 dark:text-go-300 
                                   bg-go-100 dark:bg-go-900/30 rounded-lg hover:bg-go-200 
                                   dark:hover:bg-go-900/50 transition-all duration-200 hover:shadow-medium"
                      >
                        {child.name}
                        <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <ArticleList
          fetchArticles={fetchCategoryArticles}
          variant="default"
          columns={2}
          initialPage={1}
          pageSize={20}
        />
      </div>
    </>
  );
}