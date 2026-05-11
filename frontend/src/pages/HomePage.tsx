import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { articlesApi } from '../api';
import { Article } from '../types';
import EnhancedArticleGrid from '../components/EnhancedArticleGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import BookCarousel from '../components/BookCarousel';
import CinematicHero from '../components/CinematicHero';
import { getThumbnailUrl, preloadImages } from '../utils/imageUtils';

export default function HomePage() {
  const [layoutVariant, setLayoutVariant] = useState<'masonry' | 'grid'>('masonry');

  const popularQuery = useQuery({
    queryKey: ['articles', 'popular', { limit: 6, days: 7 }],
    queryFn: async () => {
      const response = await articlesApi.getPopularArticles(6, 7);
      return response.data as Article[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const recentQuery = useQuery({
    queryKey: ['articles', 'recent', { page: 1, limit: 12 }],
    queryFn: async () => {
      const response = await articlesApi.getArticles({
        page: 1,
        limit: 12,
        is_published: true,
        sort_by: 'published_at',
        sort_order: 'desc',
      });
      return (response.data.articles ?? []) as Article[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const popularArticles = popularQuery.data ?? [];
  const recentArticles = recentQuery.data ?? [];
  const loading = popularQuery.isLoading && recentQuery.isLoading;

  // 文章封面预热 — 仅对首屏可见的少量缩略图，且空闲时执行
  useEffect(() => {
    if (popularArticles.length === 0 && recentArticles.length === 0) return;

    const thumbnailUrls = [...popularArticles, ...recentArticles]
      .slice(0, 6)
      .map((a) => a.cover_image && getThumbnailUrl(a.cover_image))
      .filter((url): url is string => !!url);
    if (thumbnailUrls.length === 0) return;

    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 1500 })
        : (cb: () => void) => setTimeout(cb, 800);

    const handle = idle(() => preloadImages(thumbnailUrls));
    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as unknown as number);
      }
    };
  }, [popularArticles, recentArticles]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="bg-transparent">
      {/* Hero Section */}
      <CinematicHero />

      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-16 pb-16">
        {/* Book Carousel Section */}
        <section className="mb-16">
          <BookCarousel
            className="shadow-2xl"
            autoPlay={true}
            autoPlayInterval={3000}
            showControls={true}
            showDots={true}
          />
        </section>

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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayoutVariant('masonry');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    layoutVariant === 'masonry'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  瀑布流
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayoutVariant('grid');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    layoutVariant === 'grid'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  网格
                </button>
              </div>
            </div>

            <EnhancedArticleGrid
              key={layoutVariant}
              articles={popularArticles}
              loading={popularQuery.isLoading}
              variant={layoutVariant}
              showStats={true}
              showCategory={true}
              showTags={true}
            />
          </section>
        )}

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  最近文章
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  最新发布的技术文章
                </p>
              </div>
              <Link
                to="/articles"
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-go-600 text-white rounded-xl hover:from-primary-700 hover:to-go-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                查看全部
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </Link>
            </div>

            <EnhancedArticleGrid
              key={`recent-${layoutVariant}`}
              articles={recentArticles}
              loading={recentQuery.isLoading}
              variant={layoutVariant}
              showStats={false}
              showCategory={true}
              showTags={true}
            />
          </section>
        )}
      </div>
    </div>
  );
}
