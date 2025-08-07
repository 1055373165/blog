import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        const [tagsResponse, popularResponse] = await Promise.all([
          tagsApi.getTags(),
          tagsApi.getPopularTags(),
        ]);
        setTags(tagsResponse.data.tags || []);
        setPopularTags(popularResponse.data || []);
      } catch (err) {
        setError('获取标签失败');
        console.error('Failed to fetch tags:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // 过滤标签
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按文章数量分组
  const getTagsByPopularity = () => {
    const sorted = [...filteredTags].sort((a, b) => ((b as any).articles_count || 0) - ((a as any).articles_count || 0));
    return {
      hot: sorted.filter(tag => ((tag as any).articles_count || 0) >= 3),
      normal: sorted.filter(tag => ((tag as any).articles_count || 0) > 0 && ((tag as any).articles_count || 0) < 3),
      unused: sorted.filter(tag => ((tag as any).articles_count || 0) === 0),
    };
  };

  const { hot, normal, unused } = getTagsByPopularity();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          文章标签
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          通过标签快速定位感兴趣的内容
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-8">
        <div className="max-w-md mx-auto">
          <div className="relative">
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
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 热门标签 */}
      {popularTags.length > 0 && !searchQuery && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            热门标签
          </h2>
          <div className="flex flex-wrap gap-3">
            {popularTags.map((tag) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.slug}`}
                className="group relative inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: tag.color + '20',
                  color: tag.color,
                  border: `2px solid ${tag.color}40`,
                }}
              >
                <span className="mr-2">#</span>
                <span>{tag.name}</span>
                <span className="ml-2 text-xs opacity-75">
                  {(tag as any).articles_count}
                </span>
                <div 
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity"
                  style={{ backgroundColor: tag.color }}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 热门标签分组 */}
      {hot.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center mb-6">
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
                className="group p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {tag.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(tag as any).articles_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 普通标签 */}
      {normal.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              所有标签
            </h2>
            <span className="ml-3 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {normal.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {normal.map((tag) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.slug}`}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: tag.color + '15',
                  color: tag.color,
                  border: `1px solid ${tag.color}30`,
                }}
              >
                #{tag.name}
                <span className="ml-1.5 text-xs opacity-60">
                  {(tag as any).articles_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 未使用标签 */}
      {unused.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center mb-6">
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
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {filteredTags.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c1.105 0 2 .895 2 2v4c0 1.105-.895 2-2 2H7a2 2 0 01-2-2V5c0-1.105.895-2 2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? '没有找到匹配的标签' : '暂无标签'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery 
              ? '尝试使用不同的关键词搜索' 
              : '还没有创建任何标签，请先添加一些标签。'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              清除搜索
            </button>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {tags.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              总标签数
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {hot.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              热门标签
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {normal.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              常用标签
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {unused.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              未使用标签
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}