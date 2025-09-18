import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  PlayIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  ClockIcon,
  HeartIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Blog, BlogFilters, Category, Tag } from '../../types';
import { blogApi } from '../../services/blogApi';
import { categoriesApi, tagsApi } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时长
function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// 格式化日期
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '未知日期';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '无效日期';
  
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminBlogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 状态管理
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlogs, setSelectedBlogs] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filters, setFilters] = useState<BlogFilters>({
    search: searchParams.get('search') || '',
    type: (searchParams.get('type') as 'audio' | 'video') || undefined,
    category_id: searchParams.get('category_id') ? Number(searchParams.get('category_id')) : undefined,
    is_published: searchParams.get('is_published') ? searchParams.get('is_published') === 'true' : undefined,
    sort_by: (searchParams.get('sort_by') as any) || 'created_at',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  });

  // 选项数据
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // 加载数据
  const loadBlogs = useCallback(async () => {
    let isMounted = true;

    try {
      setLoading(true);
      setError(null);

      const response = await blogApi.getBlogs(filters, currentPage, pageSize);

      if (!isMounted) return;

      // Handle case where response is undefined or null
      if (!response) {
        setBlogs([]);
        setTotalPages(1);
        setTotalBlogs(0);
        setCurrentPage(1);
        return;
      }

      // Safely access response properties with fallbacks
      setBlogs(response.blogs || []);
      setTotalPages(response.pagination?.total_pages || 1);
      setTotalBlogs(response.pagination?.total || 0);
      setCurrentPage(response.pagination?.page || 1);

    } catch (error) {
      if (isMounted) {
        setError(error instanceof Error ? error.message : '加载失败');
        // Reset to empty state on error
        setBlogs([]);
        setTotalPages(1);
        setTotalBlogs(0);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [filters, currentPage, pageSize]);

  // 加载分类和标签
  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          categoriesApi.getCategories(),
          tagsApi.getTags()
        ]);

        if (isMounted) {
          if (categoriesRes.success) {
            setCategories(categoriesRes.data.items || categoriesRes.data.categories || []);
          }
          if (tagsRes.success) {
            setTags(tagsRes.data.items || tagsRes.data.tags || []);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('加载分类和标签失败:', error);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // 监听筛选变化
  useEffect(() => {
    // 更新URL参数
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        newParams.set(key, value.toString());
      }
    });
    setSearchParams(newParams);

    // 重置到第一页并加载数据
    setCurrentPage(1);
  }, [filters, setSearchParams]);

  // 监听页面变化
  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  // 更新筛选条件
  const updateFilter = (key: keyof BlogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // 清空筛选条件
  const clearFilters = () => {
    setFilters({
      search: '',
      type: undefined,
      category_id: undefined,
      is_published: undefined,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  // 选择博客
  const toggleSelectBlog = (id: number) => {
    setSelectedBlogs(prev => 
      prev.includes(id) 
        ? prev.filter(blogId => blogId !== id)
        : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedBlogs.length === blogs.length) {
      setSelectedBlogs([]);
    } else {
      setSelectedBlogs(blogs.map(blog => blog.id));
    }
  };

  // 切换发布状态
  const togglePublishStatus = async (id: number) => {
    try {
      setActionLoading(id);
      await blogApi.togglePublishStatus(id);
      await loadBlogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 删除博客
  const deleteBlog = async (id: number) => {
    if (!confirm('确定要删除这个博客吗？')) return;

    try {
      setActionLoading(id);
      await blogApi.deleteBlog(id);
      await loadBlogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 批量发布/取消发布
  const bulkPublish = async (isPublished: boolean) => {
    if (selectedBlogs.length === 0) return;

    try {
      setLoading(true);
      await blogApi.bulkPublish(selectedBlogs, isPublished);
      setSelectedBlogs([]);
      await loadBlogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : '批量操作失败');
    }
  };

  // 批量删除
  const bulkDelete = async () => {
    if (selectedBlogs.length === 0) return;
    if (!confirm(`确定要删除 ${selectedBlogs.length} 个博客吗？`)) return;

    try {
      setLoading(true);
      await blogApi.deleteBulkBlogs(selectedBlogs);
      setSelectedBlogs([]);
      await loadBlogs();
    } catch (error) {
      setError(error instanceof Error ? error.message : '批量删除失败');
    }
  };

  if (loading && blogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">博客管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理音频和视频博客内容
          </p>
        </div>
        <Link
          to="/admin/blogs/new"
          className="inline-flex items-center px-4 py-2 bg-go-600 hover:bg-go-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          创建博客
        </Link>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索博客标题、描述..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
            />
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center px-3 py-2 border rounded-lg font-medium transition-colors',
              showFilters
                ? 'border-go-500 bg-go-50 dark:bg-go-900/20 text-go-700 dark:text-go-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            )}
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            筛选
          </button>

          {/* 清空筛选 */}
          {(filters.search || filters.type || filters.category_id !== undefined || filters.is_published !== undefined) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              清空筛选
            </button>
          )}
        </div>

        {/* 筛选选项 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 类型筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  媒体类型
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => updateFilter('type', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部类型</option>
                  <option value="audio">音频</option>
                  <option value="video">视频</option>
                </select>
              </div>

              {/* 分类筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类
                </label>
                <select
                  value={filters.category_id || ''}
                  onChange={(e) => updateFilter('category_id', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部分类</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 发布状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  发布状态
                </label>
                <select
                  value={filters.is_published !== undefined ? filters.is_published.toString() : ''}
                  onChange={(e) => updateFilter('is_published', e.target.value ? e.target.value === 'true' : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">全部状态</option>
                  <option value="true">已发布</option>
                  <option value="false">草稿</option>
                </select>
              </div>

              {/* 排序 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  排序方式
                </label>
                <select
                  value={`${filters.sort_by}_${filters.sort_order}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    updateFilter('sort_by', sortBy);
                    updateFilter('sort_order', sortOrder);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="created_at_desc">创建时间 (新到旧)</option>
                  <option value="created_at_asc">创建时间 (旧到新)</option>
                  <option value="published_at_desc">发布时间 (新到旧)</option>
                  <option value="published_at_asc">发布时间 (旧到新)</option>
                  <option value="views_count_desc">浏览量 (高到低)</option>
                  <option value="views_count_asc">浏览量 (低到高)</option>
                  <option value="likes_count_desc">点赞量 (高到低)</option>
                  <option value="likes_count_asc">点赞量 (低到高)</option>
                  <option value="title_asc">标题 (A-Z)</option>
                  <option value="title_desc">标题 (Z-A)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 批量操作栏 */}
      {selectedBlogs.length > 0 && (
        <div className="bg-go-50 dark:bg-go-900/20 border border-go-200 dark:border-go-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-go-700 dark:text-go-300">
              已选择 {selectedBlogs.length} 个博客
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => bulkPublish(true)}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                批量发布
              </button>
              <button
                onClick={() => bulkPublish(false)}
                className="inline-flex items-center px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                取消发布
              </button>
              <button
                onClick={bulkDelete}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                批量删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 博客列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无博客
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              开始创建您的第一个音频或视频博客吧
            </p>
            <Link
              to="/admin/blogs/new"
              className="inline-flex items-center px-4 py-2 bg-go-600 hover:bg-go-700 text-white font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              创建博客
            </Link>
          </div>
        ) : (
          <>
            {/* 表格头部 */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBlogs.length === blogs.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-go-600 bg-gray-100 border-gray-300 rounded focus:ring-go-500 dark:focus:ring-go-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="ml-6 flex-1 grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="col-span-4">博客信息</div>
                  <div className="col-span-2">类型</div>
                  <div className="col-span-2">分类</div>
                  <div className="col-span-2">统计</div>
                  <div className="col-span-1">状态</div>
                  <div className="col-span-1">操作</div>
                </div>
              </div>
            </div>

            {/* 表格内容 */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {blogs.map((blog) => (
                <div key={blog.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedBlogs.includes(blog.id)}
                        onChange={() => toggleSelectBlog(blog.id)}
                        className="w-4 h-4 text-go-600 bg-gray-100 border-gray-300 rounded focus:ring-go-500 dark:focus:ring-go-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                    <div className="ml-6 flex-1 grid grid-cols-12 gap-4 items-center">
                      {/* 博客信息 */}
                      <div className="col-span-4">
                        <div className="flex items-center space-x-3">
                          {blog.thumbnail && (
                            <img
                              src={blog.thumbnail}
                              alt={blog.title}
                              className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {blog.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                              {blog.description}
                            </p>
                            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                              <span>{formatDate(blog.published_at || blog.created_at)}</span>
                              <span>•</span>
                              <span>{blog.author.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 类型 */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <div className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            blog.type === 'audio'
                              ? 'bg-media-audio-100 dark:bg-media-audio-800/30 text-media-audio-600 dark:text-media-audio-400'
                              : 'bg-media-video-100 dark:bg-media-video-800/30 text-media-video-600 dark:text-media-video-400'
                          )}>
                            {blog.type === 'audio' ? (
                              <SpeakerWaveIcon className="w-4 h-4" />
                            ) : (
                              <VideoCameraIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {blog.type === 'audio' ? '音频' : '视频'}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {formatDuration(blog.duration)}
                              </span>
                              <span>{formatFileSize(blog.file_size)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 分类 */}
                      <div className="col-span-2">
                        {blog.category ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {blog.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">未分类</span>
                        )}
                        {blog.tags && blog.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {blog.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {blog.tags && blog.tags.length > 2 && (
                              <span className="text-xs text-gray-400">+{blog.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 统计 */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <EyeIcon className="w-3 h-3 mr-1" />
                            {blog.views_count}
                          </span>
                          <span className="flex items-center">
                            <HeartIcon className="w-3 h-3 mr-1" />
                            {blog.likes_count}
                          </span>
                        </div>
                      </div>

                      {/* 状态 */}
                      <div className="col-span-1">
                        <button
                          onClick={() => togglePublishStatus(blog.id)}
                          disabled={actionLoading === blog.id}
                          className={clsx(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors',
                            blog.is_published
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                          )}
                        >
                          {actionLoading === blog.id ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                          ) : (
                            <div className={clsx(
                              'w-2 h-2 rounded-full mr-1',
                              blog.is_published ? 'bg-green-500' : 'bg-yellow-500'
                            )} />
                          )}
                          {blog.is_published ? '已发布' : '草稿'}
                        </button>
                      </div>

                      {/* 操作 */}
                      <div className="col-span-1">
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/blogs/${blog.slug}`}
                            target="_blank"
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="预览"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/blogs/${blog.id}/edit`}
                            className="p-1 text-gray-400 hover:text-go-600 dark:hover:text-go-400 transition-colors"
                            title="编辑"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => deleteBlog(blog.id)}
                            disabled={actionLoading === blog.id}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="删除"
                          >
                            {actionLoading === blog.id ? (
                              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalBlogs)} 条，共 {totalBlogs} 条记录
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}