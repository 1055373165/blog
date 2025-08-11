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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              标签未找到
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || '请求的标签不存在'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                返回首页
              </Link>
              <Link
                to="/tags"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                浏览所有标签
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tag Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400">
                首页
              </Link>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link to="/tags" className="hover:text-primary-600 dark:hover:text-primary-400">
                标签
              </Link>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900 dark:text-white">{tag.name}</span>
            </nav>

            {/* Tag Info */}
            <div className="flex items-center mb-4">
              <div
                className="inline-flex items-center px-4 py-2 text-lg font-semibold text-white rounded-full mr-4"
                style={{ backgroundColor: tag.color || '#6366f1' }}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                #{tag.name}
              </div>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                {tag.articles_count || 0} 篇文章
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300">
              浏览所有标记为 "#{tag.name}" 的文章，探索相关主题的深度内容。
            </p>
          </div>

          {/* Tag Visual */}
          <div className="hidden md:block ml-8">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${tag.color || '#6366f1'}20`, borderColor: tag.color || '#6366f1' }}
            >
              <svg className="w-10 h-10" fill={tag.color || '#6366f1'} viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tag Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tag.articles_count || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              相关文章
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {tag.created_at ? new Date(tag.created_at).getFullYear() || '未知' : '未知'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              创建年份
            </div>
          </div>
          <div className="text-center">
            <div 
              className="inline-block w-8 h-8 rounded-full"
              style={{ backgroundColor: tag.color || '#6366f1' }}
            />
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              标签色彩
            </div>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <ArticleList
        fetchArticles={fetchTagArticles}
        variant="default"
        columns={2}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}