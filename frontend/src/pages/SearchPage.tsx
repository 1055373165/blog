import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { articlesApi } from '../api';
import { apiClient } from '../api/client';
import { SearchFilters } from '../types';
import ArticleCard from '../components/ArticleCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import SearchBar, { SearchBarRef } from '../components/SearchBar';
import AdvancedSearchFilter from '../components/AdvancedSearchFilter';
import SavedSearches from '../components/SavedSearches';
import SearchStats from '../components/SearchStats';
import { debounce } from '../utils';

interface SearchResult {
  documents: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  took: string;
  max_score: number;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    sort_by: 'published_at',
    sort_order: 'desc',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const searchBarRef = useRef<SearchBarRef>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchFilters: SearchFilters, page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const queryParams = new URLSearchParams();
        
        if (searchFilters.query) queryParams.set('q', searchFilters.query);
        queryParams.set('page', page.toString());
        queryParams.set('limit', '12');
        queryParams.set('highlight', 'true');
        
        if (searchFilters.category_id) queryParams.set('category_id', searchFilters.category_id);
        if (searchFilters.tag_ids && searchFilters.tag_ids.length > 0) {
          queryParams.set('tag_ids', searchFilters.tag_ids.join(','));
        }
        if (searchFilters.series_id) queryParams.set('series_id', searchFilters.series_id);
        if (searchFilters.date_from) queryParams.set('date_from', searchFilters.date_from);
        if (searchFilters.date_to) queryParams.set('date_to', searchFilters.date_to);
        if (searchFilters.is_published !== undefined) {
          queryParams.set('is_published', searchFilters.is_published.toString());
        }
        if (searchFilters.sort_by) queryParams.set('sort_by', searchFilters.sort_by);
        if (searchFilters.sort_order) queryParams.set('sort_order', searchFilters.sort_order);

        const data = await apiClient.get(`/api/search?${queryParams}`);

        if (data.success) {
          setResults(data.data);
          setCurrentPage(page);
        } else {
          throw new Error(data.error || '搜索失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜索出错');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Handle search submission (only triggered by Enter or search button)
  const handleSearchSubmit = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
    
    const updatedFilters = { ...filters, query: value };
    setFilters(updatedFilters);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set('q', value);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);

    // Perform search - always search when explicitly triggered
    debouncedSearch(updatedFilters, 1);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    debouncedSearch(filters, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setQuery(newFilters.query || '');
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams();
    if (newFilters.query) {
      newSearchParams.set('q', newFilters.query);
    }
    setSearchParams(newSearchParams);
  };

  // Handle loading saved search
  const handleLoadSavedSearch = (savedFilters: SearchFilters) => {
    setFilters(savedFilters);
    setQuery(savedFilters.query || '');
    setCurrentPage(1);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams();
    if (savedFilters.query) {
      newSearchParams.set('q', savedFilters.query);
    }
    setSearchParams(newSearchParams);
    
    // Perform search
    debouncedSearch(savedFilters, 1);
  };

  // Handle search with filters
  const handleSearch = () => {
    setCurrentPage(1);
    
    // Get current query from SearchBar
    const currentQuery = searchBarRef.current?.getCurrentQuery() || '';
    
    // Update filters with current query from input
    const updatedFilters = { ...filters, query: currentQuery };
    setFilters(updatedFilters);
    setQuery(currentQuery);
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (currentQuery) {
      newSearchParams.set('q', currentQuery);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams);
    
    debouncedSearch(updatedFilters, 1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    const resetFilters: SearchFilters = {
      query: '',
      sort_by: 'published_at',
      sort_order: 'desc',
    };
    setFilters(resetFilters);
    setQuery('');
    setResults(null);
    setSearchParams(new URLSearchParams());
  };

  // Check if there are active filters (excluding default query and sort)
  const hasActiveFilters = (filtersToCheck: SearchFilters = filters) => {
    return !!(
      filtersToCheck.category_id ||
      (filtersToCheck.tag_ids && filtersToCheck.tag_ids.length > 0) ||
      filtersToCheck.series_id ||
      filtersToCheck.date_from ||
      filtersToCheck.date_to ||
      filtersToCheck.is_published !== undefined ||
      (filtersToCheck.sort_by && filtersToCheck.sort_by !== 'published_at') ||
      (filtersToCheck.sort_order && filtersToCheck.sort_order !== 'desc')
    );
  };

  // Initial search on component mount
  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      const initialFilters = { ...filters, query: initialQuery };
      setQuery(initialQuery);
      setFilters(initialFilters);
      debouncedSearch(initialFilters, 1);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Search Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 font-heading text-shadow-sm">
          智能搜索
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          使用强大的全文搜索功能，快速找到您需要的内容。支持中文分词、语义理解和智能排序
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="card shadow-medium p-6">
          <SearchBar
            ref={searchBarRef}
            initialQuery={query}
            placeholder="搜索文章、分类、标签..."
            size="lg"
            showSuggestions={true}
            onSearch={handleSearchSubmit}
            className="w-full"
          />
        </div>
      </div>

      {/* Advanced Filters and Saved Searches */}
      <div className="space-y-6 mb-12">
        <AdvancedSearchFilter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          onReset={handleResetFilters}
          isOpen={showAdvancedFilters}
          onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />
        
        {/* Saved Searches */}
        <div className="flex justify-center">
          <SavedSearches
            currentFilters={filters}
            onLoadSearch={handleLoadSavedSearch}
            className="inline-block"
          />
        </div>
      </div>

      {/* Search Results */}
      {(query || hasActiveFilters() || results) && (
        <>
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              {results && (
                <div className="bg-go-50 dark:bg-go-900/20 px-4 py-3 rounded-xl border border-go-200 dark:border-go-700">
                  <p className="text-go-800 dark:text-go-200 font-medium">
                    找到 <span className="font-bold text-go-900 dark:text-go-100 text-lg">{results.pagination.total}</span> 条结果
                    {results.took && (
                      <span className="text-sm ml-2 text-go-600 dark:text-go-400">
                        (耗时 {results.took})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters() && results && results.documents.length > 0 && (
              <div className="flex items-center space-x-3 text-sm bg-purple-50 dark:bg-purple-900/20 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-700">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span className="text-purple-700 dark:text-purple-300 font-medium">已应用高级筛选</span>
                <button
                  onClick={() => setShowAdvancedFilters(true)}
                  className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium underline transition-colors duration-200"
                >
                  查看筛选条件
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto card shadow-strong p-8">
                <svg className="w-20 h-20 text-red-400 mx-auto mb-6 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
                  搜索出错
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={() => handleSearchSubmit(query)}
                  className="btn btn-primary group"
                >
                  <svg className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重试
                </button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && results && results.documents.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto card shadow-strong p-8">
                <svg className="w-20 h-20 text-go-400 mx-auto mb-6 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
                  未找到相关内容
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                  尝试使用其他关键词或调整搜索条件
                </p>
                <div className="bg-go-50 dark:bg-go-900/20 rounded-xl p-6 text-left">
                  <p className="text-go-800 dark:text-go-200 font-semibold mb-4">搜索建议:</p>
                  <ul className="space-y-3 text-go-700 dark:text-go-300">
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-3 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      检查拼写是否正确
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-3 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      尝试使用更通用的关键词
                    </li>
                    <li className="flex items-center">
                      <svg className="w-4 h-4 mr-3 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      减少搜索词的数量
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Grid */}
          {!loading && !error && results && results.documents.length > 0 && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.documents.map((doc) => (
                  <ArticleCard
                    key={doc.id}
                    article={{
                      id: doc.id,
                      title: doc.title,
                      slug: doc.slug,
                      excerpt: doc.excerpt,
                      content: '',
                      cover_image: doc.cover_image,
                      is_published: doc.is_published,
                      is_draft: false,
                      published_at: doc.published_at,
                      reading_time: 0,
                      views_count: doc.views_count || 0,
                      likes_count: doc.likes_count || 0,
                      author: {
                        id: doc.author.id?.toString() || '1',
                        name: doc.author.name || '作者',
                        email: doc.author.email || '',
                        avatar: doc.author.avatar || '',
                        is_admin: doc.author.is_admin || false,
                        created_at: doc.author.created_at || '',
                        updated_at: doc.author.updated_at || '',
                      },
                      category: doc.category ? {
                        id: doc.category.id?.toString() || '0',
                        name: doc.category.name || '',
                        slug: doc.category.slug || '',
                        description: doc.category.description,
                        parent_id: doc.category.parent_id?.toString(),
                        articles_count: doc.category.articles_count || 0,
                        created_at: doc.category.created_at || '',
                        updated_at: doc.category.updated_at || '',
                      } : undefined,
                      tags: doc.tags ? doc.tags.map((tag: any) => ({
                        id: tag.id?.toString() || '0',
                        name: tag.name || '',
                        slug: tag.slug || '',
                        color: tag.color,
                        articles_count: tag.articles_count || 0,
                        created_at: tag.created_at || '',
                        updated_at: tag.updated_at || '',
                      })) : [],
                      series: doc.series ? {
                        id: doc.series_id,
                        name: typeof doc.series === 'string' ? doc.series : (doc.series.name || ''),
                        slug: typeof doc.series === 'string' ? '' : (doc.series.slug || ''),
                        articles_count: 0,
                        created_at: '',
                        updated_at: '',
                      } : undefined,
                      created_at: doc.created_at,
                      updated_at: doc.updated_at,
                    }}
                    variant="default"
                    showCategory={true}
                    showTags={true}
                    showStats={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {results.pagination.total_pages > 1 && (
                <Pagination
                  current_page={results.pagination.page}
                  total_pages={results.pagination.total_pages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Search Tips and Stats (when no query and no filters) */}
      {!query && !hasActiveFilters() && (
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Search Features */}
          <div className="card shadow-strong p-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-10 text-center font-heading">
              搜索功能特点
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/50 dark:to-go-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  全文搜索
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  支持标题、内容、摘要等多字段搜索，搜索结果按相关性排序
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  中文优化
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  专门针对中文内容优化，支持中文分词和语义搜索
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  智能排序
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  支持按相关性、时间、浏览量、点赞数等多种方式排序
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  高级筛选
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  按分类、标签、日期范围、发布状态等多维度筛选
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  保存搜索
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  保存常用搜索条件，快速重复使用复杂筛选
                </p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-medium transition-all duration-300">
                  <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-heading">
                  搜索建议
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  智能搜索建议，快速发现相关文章、分类和标签
                </p>
              </div>
            </div>
          </div>

          {/* Search Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <SearchStats />
            </div>
            <div className="card shadow-medium p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-heading">
                快速开始
              </h3>
              <div className="space-y-6">
                <button
                  onClick={() => setShowAdvancedFilters(true)}
                  className="w-full flex items-center justify-between p-4 text-left border border-go-200 dark:border-go-700 rounded-xl hover:bg-go-50 dark:hover:bg-go-900/20 hover:shadow-soft transition-all duration-200 group"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-go-600 dark:text-go-400 mr-4 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">打开高级筛选</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-go-600 dark:group-hover:text-go-400 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="border-t border-go-200 dark:border-go-700 pt-6">
                  <p className="text-sm text-go-700 dark:text-go-300 font-semibold mb-4">快速搜索建议:</p>
                  <div className="flex flex-wrap gap-3">
                    {['React', 'TypeScript', 'Go', '数据库', '前端', '后端'].map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearchSubmit(term)}
                        className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-go-100 dark:hover:bg-go-900/30 hover:text-go-700 dark:hover:text-go-300 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 font-medium"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}