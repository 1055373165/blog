import { useState, useEffect } from 'react';

interface SearchStats {
  totalSearches: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
  recentSearches: Array<{
    query: string;
    timestamp: string;
    resultCount: number;
  }>;
  searchTrends: Array<{
    date: string;
    count: number;
  }>;
}

interface SearchStatsProps {
  className?: string;
}

export default function SearchStats({ className = '' }: SearchStatsProps) {
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'popular' | 'recent' | 'trends'>('popular');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API, fallback to localStorage for demo
      let statsData: SearchStats;
      
      try {
        const response = await fetch('/api/search/stats');
        const data = await response.json();
        
        if (data.success) {
          statsData = data.data;
        } else {
          throw new Error('API not available');
        }
      } catch (apiError) {
        // Fallback to localStorage-based stats
        statsData = generateLocalStats();
      }

      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Generate stats from localStorage for demo purposes
  const generateLocalStats = (): SearchStats => {
    const recentSearches = JSON.parse(localStorage.getItem('recent-searches') || '[]');
    const savedSearches = JSON.parse(localStorage.getItem('saved-searches') || '[]');
    
    // Generate popular queries from recent searches
    const queryCount: Record<string, number> = {};
    recentSearches.forEach((query: string) => {
      queryCount[query] = (queryCount[query] || 0) + 1;
    });
    
    const popularQueries = Object.entries(queryCount)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recent searches with mock data
    const recentSearchStats = recentSearches.slice(0, 10).map((query: string, index: number) => ({
      query,
      timestamp: new Date(Date.now() - index * 3600000).toISOString(),
      resultCount: Math.floor(Math.random() * 50) + 1,
    }));

    // Generate trend data for the last 7 days
    const searchTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5,
      };
    });

    return {
      totalSearches: recentSearches.length + savedSearches.length,
      popularQueries,
      recentSearches: recentSearchStats,
      searchTrends,
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTrendDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">暂无统计数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            搜索统计
          </h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            总搜索次数: {stats.totalSearches}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { key: 'popular', label: '热门搜索', count: stats.popularQueries?.length || 0 },
            { key: 'recent', label: '最近搜索', count: stats.recentSearches?.length || 0 },
            { key: 'trends', label: '搜索趋势', count: stats.searchTrends?.length || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Popular Queries */}
        {activeTab === 'popular' && (
          <div className="space-y-3">
            {!stats.popularQueries || stats.popularQueries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                暂无热门搜索数据
              </p>
            ) : (
              stats.popularQueries.map((item, index) => (
                <div key={item.query} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                      {item.query}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.count} 次
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Recent Searches */}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            {!stats.recentSearches || stats.recentSearches.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                暂无最近搜索数据
              </p>
            ) : (
              stats.recentSearches.map((item, index) => (
                <div key={`${item.query}-${index}`} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                      {item.query}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.timestamp)} · {item.resultCount} 个结果
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ))
            )}
          </div>
        )}

        {/* Search Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            {!stats.searchTrends || stats.searchTrends.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                暂无趋势数据
              </p>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2">
                  {stats.searchTrends.map((item, index) => {
                    const maxCount = Math.max(...(stats.searchTrends || []).map(t => t.count));
                    const height = Math.max((item.count / maxCount) * 100, 10);
                    
                    return (
                      <div key={item.date} className="flex flex-col items-center">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t" style={{ height: '60px' }}>
                          <div 
                            className="bg-primary-500 rounded-t transition-all duration-300 flex items-end justify-center"
                            style={{ height: `${height}%` }}
                          >
                            <span className="text-xs text-white font-medium pb-1">
                              {item.count}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                          {formatTrendDate(item.date)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  过去 7 天的搜索活动
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}