import { useState, useEffect } from 'react';
import { SearchFilters } from '../types';

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
  resultCount?: number;
}

interface SavedSearchesProps {
  currentFilters: SearchFilters;
  onLoadSearch: (filters: SearchFilters) => void;
  className?: string;
}

export default function SavedSearches({
  currentFilters,
  onLoadSearch,
  className = '',
}: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [showManage, setShowManage] = useState(false);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('saved-searches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved searches:', error);
      }
    }
  }, []);

  // Save searches to localStorage
  const saveTostorage = (searches: SavedSearch[]) => {
    localStorage.setItem('saved-searches', JSON.stringify(searches));
    setSavedSearches(searches);
  };

  // Save current search
  const handleSaveSearch = () => {
    if (!searchName.trim()) return;

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      filters: currentFilters,
      created_at: new Date().toISOString(),
    };

    const updated = [newSearch, ...savedSearches.slice(0, 19)]; // Keep max 20 searches
    saveTostorage(updated);
    setSearchName('');
    setShowSaveDialog(false);
  };

  // Delete a saved search
  const handleDeleteSearch = (id: string) => {
    const updated = savedSearches.filter(search => search.id !== id);
    saveTostorage(updated);
  };

  // Load a saved search
  const handleLoadSearch = (search: SavedSearch) => {
    onLoadSearch(search.filters);
    setShowManage(false);
  };

  // Check if current filters can be saved (not empty)
  const canSaveCurrentFilters = () => {
    return !!(
      currentFilters.query ||
      currentFilters.category_id ||
      (currentFilters.tag_ids && currentFilters.tag_ids.length > 0) ||
      currentFilters.series_id ||
      currentFilters.date_from ||
      currentFilters.date_to ||
      currentFilters.is_published !== undefined
    );
  };

  // Generate display name for filters
  const getFilterDisplayName = (filters: SearchFilters) => {
    const parts: string[] = [];
    
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.category_id) parts.push('分类筛选');
    if (filters.tag_ids && filters.tag_ids.length > 0) {
      parts.push(`${filters.tag_ids.length}个标签`);
    }
    if (filters.date_from || filters.date_to) parts.push('日期范围');
    if (filters.is_published !== undefined) {
      parts.push(filters.is_published ? '已发布' : '草稿');
    }
    
    return parts.join(' + ') || '无筛选条件';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Button */}
      <div className="flex items-center space-x-2">
        {canSaveCurrentFilters() && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 
                       hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 
                       dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 
                       transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            保存搜索
          </button>
        )}

        {savedSearches.length > 0 && (
          <button
            onClick={() => setShowManage(!showManage)}
            className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 
                       hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 
                       dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 
                       transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            已保存的搜索 ({savedSearches.length})
          </button>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            保存当前搜索
          </h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜索名称
            </label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="输入搜索名称..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveSearch();
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                }
              }}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              搜索条件
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
              {getFilterDisplayName(currentFilters)}
            </p>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleSaveSearch}
              disabled={!searchName.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 
                         disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Manage Saved Searches */}
      {showManage && savedSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                已保存的搜索
              </h3>
              <button
                onClick={() => setShowManage(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {search.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {getFilterDisplayName(search.filters)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(search.created_at)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleLoadSearch(search)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
                  >
                    加载
                  </button>
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {(showSaveDialog || showManage) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSaveDialog(false);
            setShowManage(false);
          }}
        />
      )}
    </div>
  );
}