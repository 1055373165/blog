import React, { useState } from 'react';
import { QuoteFilters as QuoteFiltersType, QuoteCategory } from '../../types';

interface QuoteFiltersProps {
  filters: QuoteFiltersType;
  onFiltersChange: (filters: QuoteFiltersType) => void;
  availableCategories: QuoteCategory[];
  availableTags: string[];
}

export default function QuoteFilters({ 
  filters, 
  onFiltersChange, 
  availableCategories, 
  availableTags 
}: QuoteFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, search: searchInput || undefined });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
  };

  const handleCategoryChange = (category: QuoteCategory | '') => {
    onFiltersChange({ ...filters, category: category || undefined });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFiltersChange({});
  };

  const getCategoryLabel = (category: QuoteCategory) => {
    const labels = {
      programming: '编程',
      architecture: '架构',
      management: '管理',
      philosophy: '哲学',
      design: '设计',
    };
    return labels[category] || category;
  };

  const hasActiveFilters = !!(filters.search || filters.category || filters.tags?.length);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* 搜索框 */}
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="搜索箴言内容、作者或标签，按回车搜索..."
                value={searchInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearchSubmit}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              title="搜索"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 分类过滤 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            分类：
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value as QuoteCategory | '')}
            className="block w-full sm:w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">全部分类</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {getCategoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        {/* 清除过滤器 */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            清除
          </button>
        )}
      </div>

      {/* 当前过滤器显示 */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">当前过滤：</span>
            
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                搜索: "{filters.search}"
                <button
                  onClick={() => {
                    setSearchInput('');
                    onFiltersChange({ ...filters, search: undefined });
                  }}
                  className="ml-1 hover:text-primary-600 dark:hover:text-primary-300"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.category && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                分类: {getCategoryLabel(filters.category)}
                <button
                  onClick={() => handleCategoryChange('')}
                  className="ml-1 hover:text-green-600 dark:hover:text-green-300"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}