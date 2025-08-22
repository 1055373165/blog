import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { tagsApi } from '../api';
import { Tag } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const fetchTags = async (searchParam?: string) => {
    try {
      setLoading(true);
      const [tagsResponse, popularResponse] = await Promise.all([
        tagsApi.getTags({ search: searchParam || undefined }),
        tagsApi.getPopularTags(),
      ]);
      setTags(tagsResponse.data?.tags || []);
      setPopularTags(popularResponse.data || []);
    } catch (err) {
      setError('获取标签失败');
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchTags();
  }, []);

  // Handle search
  const handleSearch = (query: string = searchQuery) => {
    const trimmedQuery = query.trim();
    setActiveSearchQuery(trimmedQuery);
    fetchTags(trimmedQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 按文章数量分组
  const getTagsByPopularity = () => {
    const sorted = [...tags].sort((a, b) => (b.articles_count || 0) - (a.articles_count || 0));
    return {
      hot: sorted.filter(tag => (tag.articles_count || 0) >= 3),
      normal: sorted.filter(tag => (tag.articles_count || 0) > 0 && (tag.articles_count || 0) < 3),
      unused: sorted.filter(tag => (tag.articles_count || 0) === 0),
    };
  };

  const { hot, normal, unused } = getTagsByPopularity();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              加载失败
            </h2>
            <p className="text-red-600 dark:text-red-400">{error}</p>
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
            <span className="text-gray-900 dark:text-white">标签</span>
          </nav>

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 mb-2">
                    标签中心
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                文章标签
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                通过标签快速定位感兴趣的内容，探索相关主题的深度文章
              </p>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-medium">{tags.length}</span>
                <span className="ml-1">个标签</span>
              </div>
            </div>

            {/* Large Tags Icon */}
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/30 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="w-12 h-12 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Section */}
        <div className="-mt-6 mb-8">
          <div className="card p-6">
            <div className="max-w-md mx-auto">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="搜索标签..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-go-500 focus:border-go-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="btn btn-primary px-6 py-3 flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  搜索
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Tags Section */}
        {popularTags.length > 0 && !activeSearchQuery && (
          <div className="mb-12">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    热门标签
                  </h2>
                </div>
                <span className="px-3 py-1 bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 text-sm font-medium rounded-full">
                  {popularTags.length} 个
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/tag/${tag.slug}`}
                    className="group relative inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-medium"
                    style={{
                      backgroundColor: tag.color + '18',
                      color: tag.color,
                      border: `2px solid ${tag.color}35`,
                    }}
                  >
                    <span className="mr-2">#</span>
                    <span>{tag.name}</span>
                    <span 
                      className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: tag.color + '25',
                        color: tag.color,
                        border: `1px solid ${tag.color}40`
                      }}
                    >
                      {tag.articles_count}
                    </span>
                    <div 
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-8 transition-opacity"
                      style={{ backgroundColor: tag.color }}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hot Tags Grid */}
        {hot.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                热门标签
              </h2>
              <span className="ml-3 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                {hot.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {hot.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="group card p-4 transition-all duration-200 hover:shadow-medium hover:-translate-y-0.5"
                  style={{
                    borderLeft: `4px solid ${tag.color}`,
                    backgroundColor: `${tag.color}05`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3 shadow-soft transition-all duration-200 group-hover:scale-110"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span 
                        className="font-medium transition-colors duration-200"
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span 
                        className="text-sm font-medium px-2 py-1 rounded-full transition-all duration-200 group-hover:scale-105"
                        style={{
                          backgroundColor: tag.color + '15',
                          color: tag.color,
                          border: `1px solid ${tag.color}25`
                        }}
                      >
                        {tag.articles_count}
                      </span>
                      <svg 
                        className="w-4 h-4 ml-2 transition-all duration-200 group-hover:translate-x-0.5"
                        style={{ color: tag.color + '80' }}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Normal Tags */}
        {normal.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                所有标签
              </h2>
              <span className="ml-3 px-2 py-1 bg-go-100 dark:bg-go-900/30 text-go-600 dark:text-go-400 text-xs font-medium rounded-full">
                {normal.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {normal.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="group inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-medium"
                  style={{
                    backgroundColor: tag.color + '12',
                    color: tag.color,
                    border: `1px solid ${tag.color}28`,
                  }}
                >
                  <svg className="w-3 h-3 mr-1.5 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {tag.name}
                  <span 
                    className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-200 group-hover:scale-105"
                    style={{
                      backgroundColor: tag.color + '20',
                      color: tag.color,
                      border: `1px solid ${tag.color}35`
                    }}
                  >
                    {tag.articles_count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Unused Tags */}
        {unused.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                未使用标签
              </h2>
              <span className="ml-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                {unused.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unused.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  <svg className="w-3 h-3 mr-1.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tags.length === 0 && !loading && (
          <div className="card p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {activeSearchQuery ? '没有找到匹配的标签' : '暂无标签'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {activeSearchQuery 
                ? '尝试使用不同的关键词搜索，或者浏览下方的推荐标签。' 
                : '还没有创建任何标签，请先添加一些标签来组织您的内容。'
              }
            </p>
            {activeSearchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearchQuery('');
                  fetchTags();
                }}
                className="btn btn-primary"
              >
                清除搜索
              </button>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-12">
          <div className="card p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                标签统计
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                深入了解内容标签的使用情况
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-go-600 dark:text-go-400 mb-1">
                  {tags.length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  总标签数
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {hot.length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  热门标签
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {normal.length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  常用标签
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                  {unused.length}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  未使用标签
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}