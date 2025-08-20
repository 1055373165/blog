import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';
import LoadingSpinner from '../components/LoadingSpinner';
import OptimizedImage from '../components/ui/OptimizedImage';
import LayoutStabilizer, { CardSkeleton } from '../components/ui/LayoutStabilizer';
import BookCarousel from '../components/BookCarousel';
import Hero from '../components/ui/Hero';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
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
    <div className="bg-transparent">
      {/* Hero Section */}
      <Hero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-16">
        {/* Book Carousel Section - 调整间距和背景避免冲突 */}
        <section className="mb-16">
        <BookCarousel 
          className="shadow-2xl"
            autoPlay={true}
            autoPlayInterval={1500}
            showControls={true}
            showDots={true}
          />
        </section>

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
    </div>
  );
}