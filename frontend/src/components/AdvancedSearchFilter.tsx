import { useState, useEffect } from 'react';
import { SearchFilters, Category, Tag, Series } from '../types';
import { categoriesApi, tagsApi } from '../api';

interface AdvancedSearchFilterProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function AdvancedSearchFilter({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  isOpen,
  onToggle,
}: AdvancedSearchFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories and tags for filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoading(true);
        const [categoriesRes, tagsRes] = await Promise.all([
          categoriesApi.getCategories({ limit: 100 }),
          tagsApi.getTags({ limit: 100, sortBy: 'articles_count', sortOrder: 'desc' }),
        ]);
        
        setCategories(categoriesRes.data.items || []);
        setTags(tagsRes.data.items || []);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = filters.tag_ids || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    handleFilterChange('tag_ids', newTags);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category_id) count++;
    if (filters.tag_ids && filters.tag_ids.length > 0) count++;
    if (filters.series_id) count++;
    if (filters.date_from) count++;
    if (filters.date_to) count++;
    if (filters.is_published !== undefined) count++;
    if (filters.sort_by && filters.sort_by !== 'created_at') count++;
    if (filters.sort_order && filters.sort_order !== 'desc') count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Filter Toggle Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggle}
          className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <svg 
            className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">高级筛选</span>
          {hasActiveFilters && (
            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-xs font-medium">
              {getActiveFiltersCount()}
            </span>
          )}
        </button>

        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              重置
            </button>
          )}
          <button
            onClick={onSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isOpen && (
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  分类
                </label>
                <select
                  value={filters.category_id || ''}
                  onChange={(e) => handleFilterChange('category_id', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">所有分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parent && '└ '}{category.name} ({category.articles_count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {tags.map((tag) => {
                    const isSelected = filters.tag_ids?.includes(tag.id) || false;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={isSelected ? { backgroundColor: tag.color || '#6366f1' } : {}}
                      >
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {tag.name}
                        <span className="ml-1 text-xs opacity-75">({tag.articles_count})</span>
                      </button>
                    );
                  })}
                </div>
                {filters.tag_ids && filters.tag_ids.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    已选择 {filters.tag_ids.length} 个标签
                  </div>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Publication Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  发布状态
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_published"
                      checked={filters.is_published === undefined}
                      onChange={() => handleFilterChange('is_published', undefined)}
                      className="mr-2 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">全部</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_published"
                      checked={filters.is_published === true}
                      onChange={() => handleFilterChange('is_published', true)}
                      className="mr-2 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">已发布</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_published"
                      checked={filters.is_published === false}
                      onChange={() => handleFilterChange('is_published', false)}
                      className="mr-2 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">草稿</span>
                  </label>
                </div>
              </div>

              {/* Sort Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    排序字段
                  </label>
                  <select
                    value={filters.sort_by || 'created_at'}
                    onChange={(e) => handleFilterChange('sort_by', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="created_at">创建时间</option>
                    <option value="updated_at">更新时间</option>
                    <option value="published_at">发布时间</option>
                    <option value="views_count">浏览量</option>
                    <option value="likes_count">点赞数</option>
                    <option value="title">标题</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    排序方向
                  </label>
                  <select
                    value={filters.sort_order || 'desc'}
                    onChange={(e) => handleFilterChange('sort_order', e.target.value as 'asc' | 'desc')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="desc">降序 (新到旧)</option>
                    <option value="asc">升序 (旧到新)</option>
                  </select>
                </div>
              </div>

              {/* Quick Date Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  快速时间筛选
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '今天', days: 0 },
                    { label: '本周', days: 7 },
                    { label: '本月', days: 30 },
                    { label: '3个月', days: 90 },
                    { label: '半年', days: 180 },
                    { label: '一年', days: 365 },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(endDate.getDate() - days);
                        
                        handleFilterChange('date_from', startDate.toISOString().split('T')[0]);
                        handleFilterChange('date_to', endDate.toISOString().split('T')[0]);
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                                 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      handleFilterChange('date_from', undefined);
                      handleFilterChange('date_to', undefined);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                               text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                               transition-colors"
                  >
                    清除日期
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onReset}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200
                             border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700
                             transition-colors"
                >
                  重置所有筛选
                </button>
                <button
                  onClick={onSearch}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors
                             text-sm font-medium"
                >
                  应用筛选
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}