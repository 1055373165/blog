import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';
import LoadingSpinner from '../components/LoadingSpinner';
import OptimizedImage from '../components/ui/OptimizedImage';
import LayoutStabilizer, { CardSkeleton } from '../components/ui/LayoutStabilizer';
import { useDevPerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { formatDate } from '../utils';

export default function HomePage() {
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // 性能监控 (仅开发环境)
  const { performanceScore, isGoodPerformance } = useDevPerformanceMonitor();

  useEffect(() => {
    const loadFeaturedContent = async () => {
      try {
        setLoading(true);
        
        // 获取最新文章作为特色文章
        const latestResponse = await articlesApi.getLatestArticles(3);
        setFeaturedArticles(latestResponse.data);
        
        // 获取热门文章
        const popularResponse = await articlesApi.getPopularArticles(6, 7);
        setPopularArticles(popularResponse.data);
      } catch (error) {
        console.error('Failed to load featured content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedContent();
  }, []);

  const fetchRecentArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    const response = await articlesApi.getArticles({
      page,
      limit,
      is_published: true,
      sortBy: 'published_at',
      sortOrder: 'desc',
    });
    
    // 转换后端数据格式为前端期望的格式
    return {
      items: response.data.articles || [],
      page: response.data.pagination?.page || page,
      totalPages: response.data.pagination?.total_pages || 1,
      total: response.data.pagination?.total || 0,
      limit: response.data.pagination?.limit || limit
    };
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section - Go Depth */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 rounded-3xl mb-16 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Background Pattern - Concurrent Channels */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20 overflow-hidden">
          <div className="absolute top-10 left-0 w-32 h-1 bg-gradient-to-r from-go-600 to-go-500 rounded-full channel-flow"></div>
          <div className="absolute top-20 left-0 w-24 h-1 bg-gradient-to-r from-go-500 to-go-400 rounded-full channel-flow delayed-300"></div>
          <div className="absolute top-32 left-0 w-40 h-1 bg-gradient-to-r from-go-700 to-go-600 rounded-full channel-flow delayed-700"></div>
          <div className="absolute bottom-20 left-0 w-28 h-1 bg-gradient-to-r from-go-600 to-go-500 rounded-full channel-flow delayed-1000"></div>
          <div className="absolute top-40 left-0 w-36 h-1 bg-gradient-to-r from-go-400 to-go-300 rounded-full channel-flow delay-1500"></div>
        </div>
        
        <div className="relative text-center py-20 px-4">
          {/* Logo & Brand */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-go-500 to-go-700 rounded-2xl mb-6 shadow-lg gopher-breathe">
              {/* Go Gopher Inspired Icon */}
              <svg className="w-12 h-12 text-white" viewBox="0 0 48 48" fill="currentColor">
                <circle cx="24" cy="20" r="8" />
                <circle cx="20" cy="18" r="1.5" />
                <circle cx="28" cy="18" r="1.5" />
                <path d="M16 32c0-4.4 3.6-8 8-8s8 3.6 8 8v8H16v-8z" />
                <path d="M12 28c-2.2 0-4 1.8-4 4s1.8 4 4 4h2v-8h-2zM36 28c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v-8h2z" />
              </svg>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="bg-gradient-to-r from-gray-900 via-go-800 to-gray-900 dark:from-white dark:via-go-300 dark:to-white bg-clip-text text-transparent">
                Go Depth
              </span>
            </h1>
            <div className="text-lg md:text-xl text-go-600 dark:text-go-400 font-mono mb-2">
              type Blog interface{"{"} DeepDive() | Simplify() | Scale() {"}"}
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6">
              Where <span className="text-go-600 dark:text-go-400 font-mono">goroutines</span> meet insights,
              <br className="hidden md:block" />
              and <span className="text-go-600 dark:text-go-400 font-mono">channels</span> carry knowledge
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              Dive deep into Go's ecosystem with practical insights, performance patterns, 
              and architectural wisdom. From concurrent algorithms to production-ready systems—
              explore the art of writing <em>simple, reliable, and efficient</em> software.
            </p>
          </div>

          {/* Go Principles Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            <div className="group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-go-200 dark:border-go-800 hover:border-go-400 dark:hover:border-go-600 transition-all duration-300 hover:shadow-lg">
              <div className="text-go-600 dark:text-go-400 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Simplicity</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Clean, readable code that does exactly what it says</p>
            </div>
            
            <div className="group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-go-200 dark:border-go-800 hover:border-go-400 dark:hover:border-go-600 transition-all duration-300 hover:shadow-lg">
              <div className="text-go-600 dark:text-go-400 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fast compilation, efficient runtime, optimized for scale</p>
            </div>
            
            <div className="group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-go-200 dark:border-go-800 hover:border-go-400 dark:hover:border-go-600 transition-all duration-300 hover:shadow-lg">
              <div className="text-go-600 dark:text-go-400 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2v6.09c2.76.02 5.27 1.14 7.07 2.93L21 9.09C19.2 7.29 16.8 6.08 14 6V2h-2zm-1 16c-3.17 0-6-2.83-6-6s2.83-6 6-6v12zm2-12c3.17 0 6 2.83 6 6s-2.83 6-6 6V6z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Concurrency</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Goroutines and channels for elegant parallel processing</p>
            </div>
            
            <div className="group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-go-200 dark:border-go-800 hover:border-go-400 dark:hover:border-go-600 transition-all duration-300 hover:shadow-lg">
              <div className="text-go-600 dark:text-go-400 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Pragmatism</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-world solutions for production systems</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/search"
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-go-600 to-go-700 hover:from-go-700 hover:to-go-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <span className="font-mono">search()</span> Articles
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link 
              to="/categories"
              className="group inline-flex items-center px-8 py-4 border-2 border-go-300 dark:border-go-700 text-go-700 dark:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 font-semibold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <span className="font-mono">range</span> Categories
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          {/* Code Snippet Teaser */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6 shadow-2xl border border-gray-700">
              <div className="flex items-center mb-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="ml-4 text-gray-400 font-mono text-sm">main.go</div>
              </div>
              <div className="font-mono text-sm text-left">
                <div className="text-purple-400">package <span className="text-white">main</span></div>
                <div className="mt-2 text-purple-400">import <span className="text-green-400">"fmt"</span></div>
                <div className="mt-4 text-purple-400">func <span className="text-blue-400">main</span><span className="text-white">() {"{"}</span></div>
                <div className="ml-4 text-white">fmt.<span className="text-blue-400">Println</span>(<span className="text-green-400">"Welcome to Go Depth!"</span>)</div>
                <div className="text-white">{"}"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              最新文章
            </h2>
            <Link 
              to="/articles"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredArticles.map((article, index) => (
              <LayoutStabilizer
                key={article.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden border border-primary-200 dark:border-primary-700"
                loading={loading}
                skeleton={<CardSkeleton lines={3} />}
              >
                <article role="article" aria-labelledby={`featured-article-${article.id}`}>
                  {article.cover_image && (
                    <OptimizedImage
                      src={article.cover_image}
                      alt={`${article.title} 的封面图片`}
                      aspectRatio="16/9"
                      priority={index < 3} // 前3张图片优先加载
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="hover:scale-105 transition-transform duration-300"
                      placeholder="skeleton"
                    />
                  )}
                  <div className="p-6">
                  {article.category && (
                    <div className="mb-3">
                      <Link
                        to={`/category/${article.category.slug}`}
                        className="inline-block px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 
                                   bg-primary-100 dark:bg-primary-900/30 rounded-full hover:bg-primary-200 
                                   dark:hover:bg-primary-900/50 transition-colors"
                      >
                        {article.category.name}
                      </Link>
                    </div>
                  )}
                    <h3 
                      id={`featured-article-${article.id}`}
                      className="text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-3"
                    >
                      <Link 
                        to={`/article/${article.slug}`}
                        aria-describedby={`featured-excerpt-${article.id}`}
                      >
                        {article.title}
                      </Link>
                    </h3>
                    <p 
                      id={`featured-excerpt-${article.id}`}
                      className="text-gray-600 dark:text-gray-300 line-clamp-2 mb-4"
                    >
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span aria-label={`作者: ${article.author.name}`}>{article.author.name}</span>
                      <time 
                        dateTime={article.published_at || article.created_at}
                        aria-label={`发布时间: ${formatDate(article.published_at || article.created_at)}`}
                      >
                        {formatDate(article.published_at || article.created_at)}
                      </time>
                    </div>
                  </div>
                </article>
              </LayoutStabilizer>
            ))}
          </div>
        </section>
      )}

      {/* Popular Articles */}
      {popularArticles.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              热门文章
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularArticles.map((article, index) => (
              <LayoutStabilizer
                key={article.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                loading={loading}
                skeleton={<CardSkeleton lines={2} />}
              >
                <article role="article" aria-labelledby={`popular-article-${article.id}`}>
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div 
                          className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                          aria-label={`热门文章排名第 ${index + 1}`}
                        >
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 
                          id={`popular-article-${article.id}`}
                          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-2"
                        >
                          <Link 
                            to={`/article/${article.slug}`}
                            aria-describedby={`popular-excerpt-${article.id}`}
                          >
                            {article.title}
                          </Link>
                        </h3>
                        <p 
                          id={`popular-excerpt-${article.id}`}
                          className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3"
                        >
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center" aria-label={`浏览量: ${article.views_count}`}>
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            {article.views_count}
                          </span>
                          <span className="flex items-center" aria-label={`点赞数: ${article.likes_count}`}>
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            {article.likes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </LayoutStabilizer>
            ))}
          </div>
        </section>
      )}

      {/* Recent Articles */}
      <section>
        <ArticleList
          fetchArticles={fetchRecentArticles}
          title="最近文章"
          variant="default"
          columns={2}
          initialPage={1}
          pageSize={12}
        />
      </section>
    </div>
  );
}