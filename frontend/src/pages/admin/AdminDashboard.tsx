import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BlogStats } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { statsApi } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await statsApi.getStats();
      
      if (response.success) {
        // 将API返回的数据映射到组件需要的格式
        const apiData = response.data;
        setStats({
          totalArticles: apiData.totalArticles || 0,
          publishedArticles: apiData.publishedArticles || 0,
          draftArticles: apiData.draftArticles || 0,
          totalViews: apiData.totalViews || 0,
          totalLikes: apiData.totalLikes || 0,
          totalCategories: apiData.totalCategories || 0,
          totalTags: apiData.totalTags || 0,
          totalSeries: apiData.totalSeries || 0,
        });
      } else {
        throw new Error('获取统计数据失败');
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message || '加载统计数据失败');
      // Use mock data as fallback
      setStats({
        totalArticles: 4,
        publishedArticles: 4,
        draftArticles: 0,
        totalViews: 1250,
        totalLikes: 89,
        totalCategories: 3,
        totalTags: 8,
        totalSeries: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300">
                管理仪表板
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              控制面板
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              欢迎回来！这里是您的博客管理概览和快速操作中心
            </p>
          </div>
          
          <div className="hidden lg:block">
            <div className="w-20 h-20 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/30 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-soft">
              <svg className="w-10 h-10 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 hover:shadow-medium transition-all duration-200 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 text-xs font-medium rounded-full">
              总计
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总文章数</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats?.totalArticles || 0}
            </p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-200 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
              已发布
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">已发布</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats?.publishedArticles || 0}
            </p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-200 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 2C7.44772 2 7 2.44772 7 3C7 3.55228 7.44772 4 8 4H16C16.5523 4 17 3.55228 17 3C17 2.44772 16.5523 2 16 2H8Z" />
                <path fillRule="evenodd" d="M4 5C4 3.89543 4.89543 3 6 3H18C19.1046 3 20 3.89543 20 5V15C20 16.1046 19.1046 17 18 17H6C4.89543 17 4 16.1046 4 15V5ZM6 5H18V15H6V5Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
              草稿
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">草稿</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats?.draftArticles || 0}
            </p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-200 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
              浏览
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总浏览量</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats?.totalViews?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions & System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              快速操作
            </h3>
          </div>
          
          <div className="space-y-3">
            <Link
              to="/admin/articles/new"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-go-50 dark:hover:bg-go-900/20 hover:border-go-300 dark:hover:border-go-600 transition-all duration-200 hover:shadow-medium group"
            >
              <div className="w-10 h-10 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-4 group-hover:bg-go-200 dark:group-hover:bg-go-800 transition-colors">
                <svg className="w-5 h-5 text-go-600 dark:text-go-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">新建文章</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">创建一篇新的博客文章</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-go-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>

            <Link
              to="/admin/articles"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-medium group"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">管理文章</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">查看和编辑所有文章</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>

            <Link
              to="/admin/categories"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:shadow-medium group"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mr-4 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">管理分类</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">组织文章分类</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>

            <Link
              to="/admin/tags"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-medium group"
            >
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mr-4 group-hover:bg-orange-200 dark:group-hover:bg-orange-800 transition-colors">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">管理标签</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">管理文章标签</p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              系统信息
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">分类总数</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {stats?.totalCategories || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">标签总数</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {stats?.totalTags || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">系列总数</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {stats?.totalSeries || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">总点赞数</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {stats?.totalLikes?.toLocaleString() || '0'}
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <Link
                to="/"
                className="flex items-center text-sm text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                查看网站前台
              </Link>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}