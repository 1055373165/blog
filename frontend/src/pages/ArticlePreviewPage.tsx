import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Article } from '../types';
import ArticlePreview from '../components/ArticlePreview';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiClient } from '../api/client';

export default function ArticlePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadArticle(id);
    }
  }, [id]);

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Article>(`/api/articles/${articleId}`);

      if (response.success) {
        setArticle(response.data);
      } else {
        throw new Error(response.error || '文章不存在');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || '文章不存在'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            请检查文章ID是否正确
          </p>
          <Link
            to="/admin/articles"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            返回文章列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Preview Header */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                预览模式 - 此文章{article?.is_published ? '已发布' : '为草稿'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to={`/admin/articles/${article?.id}/edit`}
                className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                编辑文章
              </Link>
              {article?.is_published && (
                <Link
                  to={`/articles/${article?.slug || article?.id}`}
                  className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  查看发布版本
                </Link>
              )}
              <button
                onClick={() => window.close()}
                className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-800 dark:hover:text-yellow-200"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <ArticlePreview
          article={{
            title: article?.title || '',
            content: article?.content || '',
            excerpt: article?.excerpt || '',
            cover_image: article?.cover_image || '',
            category_id: article?.category_id,
            tag_ids: Array.isArray(article?.tags) ? article.tags.map(tag => tag.id) : [],
            series_id: article?.series_id,
            series_order: article?.series_order,
            is_published: article?.is_published || false,
            meta_title: article?.meta_title || '',
            meta_description: article?.meta_description || '',
            meta_keywords: article?.meta_keywords || '',
          }}
        />
      </div>
    </div>
  );
}