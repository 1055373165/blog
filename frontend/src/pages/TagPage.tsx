import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tagsApi, articlesApi } from '../api';
import { Tag, Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const loadTag = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await tagsApi.getTagBySlug(slug);
        setTag(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '标签加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadTag();
  }, [slug]);

  const fetchTagArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    if (!tag) throw new Error('Tag not found');
    const response = await articlesApi.getArticlesByTag(tag.id.toString(), {
      page,
      limit,
      sort_by: 'published_at',
      sort_order: 'desc',
    });
    // 转换API返回的数据格式为ArticleList期望的格式
    return {
      items: response.data.articles || response.data.items || [],
      total: response.data.pagination?.total || response.data.total || 0,
      page: response.data.pagination?.page || response.data.page || page,
      limit: response.data.pagination?.limit || response.data.limit || limit,
      totalPages: response.data.pagination?.total_pages || response.data.totalPages || 1,
    };
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error || !tag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              标签未找到
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error || '请求的标签不存在或已被删除'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn btn-primary">
                返回首页
              </Link>
              <Link to="/tags" className="btn btn-outline">
                浏览所有标签
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
            <Link to="/tags" className="hover:text-go-600 dark:hover:text-go-400 transition-colors">
              标签
            </Link>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 dark:text-white">{tag.name}</span>
          </nav>

          {/* Tag Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-soft"
                  style={{ backgroundColor: `${tag.color || '#14b8a6'}20` }}
                >
                  <svg className="w-6 h-6" fill={tag.color || '#14b8a6'} viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 mb-2">
                    标签
                  </span>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <div
                  className="inline-flex items-center px-4 py-2 text-lg font-semibold text-white rounded-xl mr-4 shadow-soft"
                  style={{ backgroundColor: tag.color || '#14b8a6' }}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  #{tag.name}
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {tag.name}
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                浏览所有标记为 "#{tag.name}" 的文章，探索相关主题的深度内容。
              </p>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium">{tag.articles_count || 0}</span>
                <span className="ml-1">篇文章</span>
              </div>
            </div>

            {/* Large Tag Visual */}
            <div className="hidden lg:block">
              <div 
                className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-soft"
                style={{ 
                  background: `linear-gradient(135deg, ${tag.color || '#14b8a6'}20, ${tag.color || '#14b8a6'}40)`,
                  border: `2px solid ${tag.color || '#14b8a6'}30`
                }}
              >
                <svg className="w-12 h-12" fill={tag.color || '#14b8a6'} viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tag Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {tag.articles_count || 0}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                相关文章
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {tag.created_at ? new Date(tag.created_at).getFullYear() || '未知' : '未知'}
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                创建年份
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <div 
                  className="w-6 h-6 rounded-lg shadow-soft"
                  style={{ backgroundColor: tag.color || '#14b8a6' }}
                />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                自定义
              </div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                标签色彩
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <ArticleList
          fetchArticles={fetchTagArticles}
          variant="default"
          columns={2}
          initialPage={1}
          pageSize={20}
        />
      </div>
    </>
  );
}