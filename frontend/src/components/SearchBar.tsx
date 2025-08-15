import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchSuggestions from './SearchSuggestions';
import { debounce } from '../utils';

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  showSuggestions?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = '搜索文章、分类、标签...',
  size = 'md',
  showSuggestions = true,
  onSearch,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Sync with initialQuery prop changes
  useEffect(() => {
    setQuery(initialQuery || '');
  }, [initialQuery]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 10); // Keep only 10 recent searches
    
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  };

  // Handle search submission
  const handleSearch = (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    
    saveRecentSearch(searchQuery.trim());
    setShowSuggestionsPanel(false);
    
    if (onSearch) {
      onSearch(searchQuery.trim());
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Handle input changes with debouncing (only for suggestions, not search)
  const debouncedShowSuggestions = debounce(() => {
    if (query.length >= 2) {
      setShowSuggestionsPanel(true);
    }
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Only show suggestions, don't trigger search
    if (showSuggestions) {
      if (value.length >= 2) {
        debouncedShowSuggestions();
      } else {
        setShowSuggestionsPanel(false);
      }
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Handle focus and blur events
  const handleFocus = () => {
    if (showSuggestions && (query.length >= 2 || recentSearches.length > 0)) {
      setShowSuggestionsPanel(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSuggestionsPanel(false);
      }
    }, 150);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestionsPanel(false);
      inputRef.current?.blur();
    }
  };

  // Handle suggestion clicks
  const handleSuggestionClick = (suggestion: any) => {
    setQuery('');
    setShowSuggestionsPanel(false);
    navigate(suggestion.url);
  };

  // Close suggestions panel
  const closeSuggestions = () => {
    setShowSuggestionsPanel(false);
  };

  // Handle recent search clicks
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    handleSearch(searchQuery);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent-searches');
  };

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'lg':
        return 'px-4 py-3 text-lg';
      default:
        return 'px-4 py-2.5 text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className={`${getIconSize()} text-gray-400`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-search-input
          aria-label="搜索文章、分类、标签"
          aria-describedby="search-help"
          role="searchbox"
          className={`block w-full pl-10 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     transition-colors duration-200 ${getSizeClasses()}`}
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setShowSuggestionsPanel(false);
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-8 flex items-center px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Search Button */}
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
        >
          <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {/* Suggestions Panel */}
      {showSuggestions && showSuggestionsPanel && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">最近搜索</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    清除
                  </button>
                </div>
              </div>
              <div className="py-2 max-h-48 overflow-y-auto">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="w-full flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {query.length >= 2 && (
            <SearchSuggestions
              query={query}
              isVisible={true}
              onSuggestionClick={handleSuggestionClick}
              onClose={closeSuggestions}
            />
          )}
        </div>
      )}
    </div>
  );
}