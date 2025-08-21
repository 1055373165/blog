import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';
import EnhancedArticleGrid from '../components/EnhancedArticleGrid';
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

      {/* Enhanced Featured Articles */}
      {featuredArticles.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                精选文章
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                最新发布的高质量技术文章
              </p>
            </div>
            <Link 
              to="/articles"
              className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-go-600 text-white rounded-xl hover:from-primary-700 hover:to-go-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              查看全部
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </Link>
          </div>
          
          <EnhancedArticleGrid
            articles={featuredArticles}
            loading={loading}
            variant="mixed"
            showStats={true}
            showCategory={true}
            showTags={true}
            className="max-w-7xl"
          />
        </section>
      )}

      {/* Enhanced Popular Articles */}
      {popularArticles.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                热门文章
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                读者最喜爱的技术分享
              </p>
            </div>
            
            {/* 布局切换器 */}
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
              <button className="px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium">
                瀑布流
              </button>
              <button className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
                网格
              </button>
            </div>
          </div>
          
          <EnhancedArticleGrid
            articles={popularArticles}
            loading={loading}
            variant="masonry"
            showStats={true}
            showCategory={true}
            showTags={true}
          />
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