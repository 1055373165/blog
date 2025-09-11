import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { articlesApi } from '../api';
import { apiClient } from '../api/client';
import { SearchFilters } from '../types';
import ArticleCard from '../components/ArticleCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import SearchBar, { SearchBarRef } from '../components/SearchBar';
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

      {/* Saved Searches */}
      <div className="flex justify-center mb-12">
        <SavedSearches
          currentFilters={filters}
          onLoadSearch={handleLoadSavedSearch}
          className="inline-block"
        />
      </div>

      {/* Search Results */}
      {(query || results) && (
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

      {/* Search Tips and Stats (when no query) */}
      {!query && (
        <div className="max-w-6xl mx-auto space-y-12">
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
      )}
    </div>
  );
}