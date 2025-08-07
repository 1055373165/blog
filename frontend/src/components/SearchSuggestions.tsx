import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface SearchSuggestion {
  id: string;
  type: 'article' | 'category' | 'tag' | 'series';
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

interface SearchSuggestionsProps {
  query: string;
  isVisible: boolean;
  onSuggestionClick: (suggestion: SearchSuggestion) => void;
  onClose: () => void;
}

export default function SearchSuggestions({
  query,
  isVisible,
  onSuggestionClick,
  onClose,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Fetch suggestions from API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const data = await apiClient.get(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=10`);

        if (data.success) {
          // 当前后端只返回文章标题的字符串数组
          const formattedSuggestions: SearchSuggestion[] = (data.data || []).map((title: string, index: number) => ({
            id: `suggestion-${index}`,
            type: 'article' as const,
            title: title,
            subtitle: '文章',
            url: `/search?q=${encodeURIComponent(title)}`,
            icon: 'document',
          }));

          setSuggestions(formattedSuggestions.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            onSuggestionClick(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onSuggestionClick, onClose]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const getIcon = (iconName: string) => {
    const icons = {
      document: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
      folder: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      ),
      tag: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      collection: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    };
    return icons[iconName as keyof typeof icons] || icons.document;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      article: 'text-blue-600 dark:text-blue-400',
      category: 'text-green-600 dark:text-green-400',
      tag: 'text-purple-600 dark:text-purple-400',
      series: 'text-orange-600 dark:text-orange-400',
    };
    return colors[type as keyof typeof colors] || colors.article;
  };

  if (!isVisible || !query || query.length < 2) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
      {loading && (
        <div className="p-4 text-center">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">搜索中...</p>
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="p-4 text-center">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">未找到相关建议</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="py-2 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <Link
              key={suggestion.id}
              to={suggestion.url}
              onClick={() => onSuggestionClick(suggestion)}
              className={`flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
            >
              <div className={`flex-shrink-0 mr-3 ${getTypeColor(suggestion.type)}`}>
                {getIcon(suggestion.icon || suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.title}
                  </p>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getTypeColor(suggestion.type)} bg-opacity-10`}>
                    {
                      suggestion.type === 'article' ? '文章' :
                      suggestion.type === 'category' ? '分类' :
                      suggestion.type === 'tag' ? '标签' :
                      suggestion.type === 'series' ? '系列' : ''
                    }
                  </span>
                </div>
                {suggestion.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {suggestion.subtitle}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 ml-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Search All Link */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="flex items-center px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer text-primary-600 dark:text-primary-400"
            >
              <svg className="w-4 h-4 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">
                搜索 "{query}" 查看所有结果
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}