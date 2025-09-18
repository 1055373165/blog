import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Blog, BlogFilters } from '../types';
import BlogCard from '../components/BlogCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { blogApi } from '../services/blogApi';
import { 
  SpeakerWaveIcon,
  VideoCameraIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';


export default function BlogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // 筛选状态
  const [filters, setFilters] = useState<BlogFilters>({
    search: searchParams.get('search') || '',
    type: (searchParams.get('type') as 'audio' | 'video') || undefined,
    sort_by: (searchParams.get('sort_by') as any) || 'published_at',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  });

  const pageSize = 12;

  // 模拟数据加载
  useEffect(() => {
    loadBlogs();
  }, [currentPage, filters]);

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const response = await blogApi.getBlogs(filters, currentPage, pageSize);
      setBlogs(response.blogs || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('加载博客失败:', error);
      setBlogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
    updateSearchParams({ search: searchTerm });
  };

  // 处理筛选
  const handleFilterChange = (newFilters: Partial<BlogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    updateSearchParams(newFilters);
  };

  // 更新URL参数
  const updateSearchParams = (params: Partial<BlogFilters>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value.toString());
      } else {
        newParams.delete(key);
      }
    });
    
    setSearchParams(newParams);
  };

  // 清除筛选
  const clearFilters = () => {
    setFilters({
      search: '',
      type: undefined,
      sort_by: 'published_at',
      sort_order: 'desc'
    });
    setCurrentPage(1);
    setSearchParams({});
  };

  // 获取激活的筛选数量
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type) count++;
    if (filters.sort_by !== 'published_at' || filters.sort_order !== 'desc') count++;
    return count;
  };

  return (
    <div className="max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-12">
      {/* 页面头部 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-blog-800 dark:text-blog-100 mb-4">
          音视频博客
        </h1>
        <p className="text-xl text-blog-600 dark:text-blog-300 max-w-3xl mx-auto leading-relaxed mb-8">
          探索丰富的音频和视频内容，获得更加生动的学习体验
        </p>
        
        {/* 统计信息 */}
        <div className="flex items-center justify-center space-x-6 text-sm text-blog-500 dark:text-blog-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-media-audio-500 rounded-full" />
            <span>音频博客</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-media-video-500 rounded-full" />
            <span>视频博客</span>
          </div>
          <span>共 {total} 个内容</span>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-blog-400 dark:text-blog-500" />
            </div>
            <input
              type="text"
              placeholder="搜索博客内容..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className={clsx(
                'block w-full pl-10 pr-3 py-2 border rounded-lg',
                'bg-blog-50 dark:bg-blog-800 border-blog-200 dark:border-blog-700',
                'text-blog-900 dark:text-blog-100 placeholder-blog-500 dark:placeholder-blog-400',
                'focus:ring-2 focus:ring-blog-500 focus:border-transparent',
                'transition-all duration-200'
              )}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200',
                showFilters
                  ? 'bg-blog-600 text-white border-blog-600'
                  : 'bg-blog-50 dark:bg-blog-800 border-blog-200 dark:border-blog-700 text-blog-700 dark:text-blog-300 hover:bg-blog-100 dark:hover:bg-blog-700'
              )}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>筛选</span>
              {getActiveFiltersCount() > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>

            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-blog-600 dark:text-blog-400 hover:text-blog-800 dark:hover:text-blog-200"
              >
                <XMarkIcon className="w-4 h-4" />
                <span>清除</span>
              </button>
            )}
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-blog-50 dark:bg-blog-800 rounded-lg border border-blog-200 dark:border-blog-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 内容类型 */}
              <div>
                <label className="block text-sm font-medium text-blog-700 dark:text-blog-300 mb-2">
                  内容类型
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => handleFilterChange({ type: (e.target.value || undefined) as any })}
                  className={clsx(
                    'block w-full px-3 py-2 border rounded-lg',
                    'bg-white dark:bg-blog-700 border-blog-200 dark:border-blog-600',
                    'text-blog-900 dark:text-blog-100',
                    'focus:ring-2 focus:ring-blog-500 focus:border-transparent'
                  )}
                >
                  <option value="">全部类型</option>
                  <option value="audio">音频</option>
                  <option value="video">视频</option>
                </select>
              </div>

              {/* 排序字段 */}
              <div>
                <label className="block text-sm font-medium text-blog-700 dark:text-blog-300 mb-2">
                  排序方式
                </label>
                <select
                  value={filters.sort_by || 'published_at'}
                  onChange={(e) => handleFilterChange({ sort_by: e.target.value as any })}
                  className={clsx(
                    'block w-full px-3 py-2 border rounded-lg',
                    'bg-white dark:bg-blog-700 border-blog-200 dark:border-blog-600',
                    'text-blog-900 dark:text-blog-100',
                    'focus:ring-2 focus:ring-blog-500 focus:border-transparent'
                  )}
                >
                  <option value="published_at">发布时间</option>
                  <option value="title">标题</option>
                  <option value="views_count">浏览量</option>
                  <option value="likes_count">点赞数</option>
                  <option value="duration">时长</option>
                </select>
              </div>

              {/* 排序顺序 */}
              <div>
                <label className="block text-sm font-medium text-blog-700 dark:text-blog-300 mb-2">
                  排序顺序
                </label>
                <select
                  value={filters.sort_order || 'desc'}
                  onChange={(e) => handleFilterChange({ sort_order: e.target.value as any })}
                  className={clsx(
                    'block w-full px-3 py-2 border rounded-lg',
                    'bg-white dark:bg-blog-700 border-blog-200 dark:border-blog-600',
                    'text-blog-900 dark:text-blog-100',
                    'focus:ring-2 focus:ring-blog-500 focus:border-transparent'
                  )}
                >
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 快速筛选标签 */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange({ type: undefined })}
            className={clsx(
              'flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200',
              !filters.type
                ? 'bg-blog-600 text-white border-blog-600'
                : 'bg-blog-50 dark:bg-blog-800 border-blog-200 dark:border-blog-700 text-blog-700 dark:text-blog-300 hover:bg-blog-100 dark:hover:bg-blog-700'
            )}
          >
            <span>全部</span>
          </button>
          
          <button
            onClick={() => handleFilterChange({ type: 'audio' })}
            className={clsx(
              'flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200',
              filters.type === 'audio'
                ? 'bg-media-audio-500 text-white border-media-audio-500'
                : 'bg-media-audio-50 dark:bg-media-audio-900/20 border-media-audio-200 dark:border-media-audio-800 text-media-audio-700 dark:text-media-audio-300 hover:bg-media-audio-100 dark:hover:bg-media-audio-900/30'
            )}
          >
            <SpeakerWaveIcon className="w-4 h-4" />
            <span>音频</span>
          </button>
          
          <button
            onClick={() => handleFilterChange({ type: 'video' })}
            className={clsx(
              'flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200',
              filters.type === 'video'
                ? 'bg-media-video-500 text-white border-media-video-500'
                : 'bg-media-video-50 dark:bg-media-video-900/20 border-media-video-200 dark:border-media-video-800 text-media-video-700 dark:text-media-video-300 hover:bg-media-video-100 dark:hover:bg-media-video-900/30'
            )}
          >
            <VideoCameraIcon className="w-4 h-4" />
            <span>视频</span>
          </button>
        </div>
      </div>

      {/* 博客列表 */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <LoadingSpinner />
        </div>
      ) : blogs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                variant="default"
                showCategory={true}
                showTags={true}
                showStats={true}
              />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <Pagination
              current_page={currentPage}
              total_pages={totalPages}
              onPageChange={setCurrentPage}
              show_size_changer={false}
            />
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-blog-100 dark:bg-blog-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <SpeakerWaveIcon className="w-12 h-12 text-blog-400 dark:text-blog-500" />
          </div>
          <h3 className="text-lg font-medium text-blog-700 dark:text-blog-300 mb-2">
            暂无博客内容
          </h3>
          <p className="text-blog-500 dark:text-blog-400">
            {filters.search || filters.type ? '尝试调整筛选条件' : '敬请期待更多精彩内容'}
          </p>
        </div>
      )}
    </div>
  );
}