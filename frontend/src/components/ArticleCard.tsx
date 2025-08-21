import { Link } from 'react-router-dom';
import { Article } from '../types';
import { formatDate, formatReadingTime } from '../utils';
import { useEffect, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'featured';
  showCategory?: boolean;
  showTags?: boolean;
  showStats?: boolean;
}

export default function ArticleCard({ 
  article, 
  variant = 'default',
  showCategory = true,
  showTags = true,
  showStats = true
}: ArticleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Modern card configuration with premium aesthetics
  const getCardConfig = () => {
    switch (variant) {
      case 'featured':
        return {
          variant: 'premium' as const,
          size: 'lg' as const,
          className: 'group premium-card-featured'
        };
      case 'compact':
        return {
          variant: 'modern' as const,
          size: 'sm' as const,
          className: 'group premium-card-compact'
        };
      default:
        return {
          variant: 'glass' as const,
          size: 'md' as const,
          className: 'group premium-card-default'
        };
    }
  };

  const titleClasses = {
    default: 'article-title text-render-optimized text-lg text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-2 mb-2 transition-all duration-300 group-hover:text-go-700 dark:group-hover:text-go-300',
    compact: 'article-title text-render-optimized text-base text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-2 mb-1.5 transition-all duration-300 group-hover:text-go-700 dark:group-hover:text-go-300',
    featured: 'article-title text-render-optimized text-xl font-bold text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-2 mb-3 group-hover:text-go-700 dark:group-hover:text-go-300 transition-all duration-300',
  };

  const cardConfig = getCardConfig();

  return (
    <Card 
      ref={cardRef} 
      variant={cardConfig.variant}
      size={cardConfig.size}
      hoverable
      animated
      image={article.cover_image && variant !== 'compact' ? article.cover_image : undefined}
      imageAlt={article.title}
      imagePosition={article.cover_image && variant !== 'compact' ? 'top' : undefined}
      className={cardConfig.className}
    >
      {/* Compact Content Layout */}
      <div className={`${variant === 'compact' ? 'space-y-2' : 'space-y-2.5'} h-full flex flex-col`}>
        
        {/* Header Row: Category + Meta */}
        <div className="flex items-center justify-between mb-1">
          {showCategory && article.category && (
            <Link
              to={`/category/${article.category.slug}`}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-go-700 dark:text-go-300 
                         bg-go-50 dark:bg-go-900/20 rounded-md hover:bg-go-100 
                         dark:hover:bg-go-900/30 transition-all duration-200 hover:scale-105 
                         border border-go-200/50 dark:border-go-800/50"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {article.category.name}
            </Link>
          )}
          
          {/* Quick Stats */}
          {showStats && (
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {article.views_count || 0}
              </span>
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {article.likes_count || 0}
              </span>
            </div>
          )}
        </div>

        {/* Title - Main Content */}
        <h2 className={titleClasses[variant]}>
          <Link to={`/article/${article.slug}`} className="block hover:text-go-600 dark:hover:text-go-400 transition-colors duration-300">
            {article.title}
          </Link>
        </h2>

        {/* Excerpt - More Compact */}
        {variant !== 'compact' && article.excerpt && (
          <p className="article-excerpt text-render-optimized text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
            {article.excerpt}
          </p>
        )}

        {/* Tags - Inline and Compact */}
        {showTags && article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, variant === 'compact' ? 2 : 3).map((tag) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.slug}`}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 
                           bg-gray-100/80 dark:bg-gray-800/60 rounded hover:bg-gray-200 
                           dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105
                           border border-gray-200/50 dark:border-gray-700/50"
                style={{ backgroundColor: tag.color ? `${tag.color}15` : undefined }}
              >
                <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {tag.name}
              </Link>
            ))}
            {article.tags.length > (variant === 'compact' ? 2 : 3) && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-1">
                +{article.tags.length - (variant === 'compact' ? 2 : 3)}
              </span>
            )}
          </div>
        )}

        {/* Bottom Footer - Compact Meta Info */}
        <div className="mt-auto pt-2 border-t border-gray-100/50 dark:border-gray-800/50">
          <div className="flex items-center justify-between">
            {/* Left: Author & Date */}
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 article-meta text-render-optimized">
              <span className="flex items-center font-medium">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                {article.author.name}
              </span>
              
              <span className="text-gray-400 dark:text-gray-500">•</span>
              
              <time className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {formatDate(article.published_at || article.created_at)}
              </time>

              {/* Reading Time - Only for non-compact */}
              {article.reading_time > 0 && variant !== 'compact' && (
                <>
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {formatReadingTime(article.reading_time)}
                  </span>
                </>
              )}
            </div>

            {/* Right: Action Button */}
            <Link 
              to={`/article/${article.slug}`}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-go-600 dark:text-go-400 
                         bg-go-50/50 dark:bg-go-900/20 rounded-md hover:bg-go-100 dark:hover:bg-go-900/30 
                         transition-all duration-200 hover:scale-105 border border-go-200/30 dark:border-go-800/30
                         group-hover:bg-go-100 dark:group-hover:bg-go-900/40"
            >
              <span>阅读</span>
              <svg className="w-3 h-3 ml-1 transform transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Series Badge - More Compact */}
        {article.series && variant !== 'compact' && (
          <div className="flex items-center justify-center pt-2">
            <Link
              to={`/series/${article.series.slug}`}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-go-600 dark:text-go-400 
                         bg-gradient-to-r from-go-50 to-go-100 dark:from-go-900/20 dark:to-go-800/30 
                         rounded-full hover:from-go-100 hover:to-go-200 dark:hover:from-go-900/30 dark:hover:to-go-800/50
                         transition-all duration-200 hover:scale-105 border border-go-200/50 dark:border-go-800/50"
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              系列: {article.series.name}
              {article.series_order && (
                <span className="ml-1 px-1.5 py-0.5 bg-go-200 dark:bg-go-800 rounded text-xs">
                  {article.series_order}
                </span>
              )}
            </Link>
          </div>
        )}

      </div>
    </Card>
  );
}