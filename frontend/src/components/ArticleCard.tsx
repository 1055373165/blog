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

  // 根据变体选择 Card 的样式
  const getCardVariant = () => {
    switch (variant) {
      case 'featured':
        return 'gradient';
      case 'compact':
        return 'default';
      default:
        return 'elevated';
    }
  };

  const getCardSize = () => {
    switch (variant) {
      case 'featured':
        return 'lg';
      case 'compact':
        return 'sm';
      default:
        return 'md';
    }
  };

  const titleClasses = {
    default: 'text-xl font-semibold text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-2 mb-3 transition-colors duration-200',
    compact: 'text-lg font-semibold text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-1 mb-2 transition-colors duration-200',
    featured: 'text-2xl font-bold text-gray-900 dark:text-white hover:text-go-600 dark:hover:text-go-400 line-clamp-2 mb-4 group-hover:text-go-700 dark:group-hover:text-go-300 transition-colors duration-300',
  };

  return (
    <Card 
      ref={cardRef} 
      variant={getCardVariant()}
      size={getCardSize()}
      hoverable
      animated
      image={article.cover_image && variant !== 'compact' ? article.cover_image : undefined}
      imageAlt={article.title}
      imagePosition={article.cover_image && variant !== 'compact' ? 'top' : undefined}
      className={variant === 'featured' ? 'group' : ''}
    >
      {/* 文章内容 */}
      <div className="space-y-3">
        {/* Category */}
        {showCategory && article.category && (
          <div>
            <Link
              to={`/category/${article.category.slug}`}
              className="inline-block px-3 py-1.5 text-xs font-medium text-go-700 dark:text-go-300 
                         bg-go-100 dark:bg-go-900/30 rounded-full hover:bg-go-200 
                         dark:hover:bg-go-900/50 transition-all duration-200 hover:scale-105"
            >
              {article.category.name}
            </Link>
          </div>
        )}

        {/* Title */}
        <h2 className={titleClasses[variant]}>
          <Link to={`/article/${article.slug}`}>
            {article.title}
          </Link>
        </h2>

        {/* Excerpt */}
        {variant !== 'compact' && (
          <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
            {article.excerpt}
          </p>
        )}

        {/* Tags */}
        {showTags && article.tags && article.tags.length > 0 && variant !== 'compact' && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.slug}`}
                className="inline-block px-2 py-1 text-xs text-gray-600 dark:text-gray-400 
                           bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 
                           dark:hover:bg-gray-600 transition-colors"
                style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
              >
                #{tag.name}
              </Link>
            ))}
            {article.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            {/* Author */}
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {article.author.name}
            </span>

            {/* Published Date */}
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {formatDate(article.published_at || article.created_at)}
            </span>

            {/* Reading Time */}
            {article.reading_time > 0 && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                {formatReadingTime(article.reading_time)}
              </span>
            )}
          </div>

          {/* Stats */}
          {showStats && (
            <div className="flex items-center space-x-3">
              {/* Views */}
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {article.views_count}
              </span>

              {/* Likes */}
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {article.likes_count}
              </span>
            </div>
          )}
        </div>

        {/* Series Info */}
        {article.series && variant !== 'compact' && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`/series/${article.series.slug}`}
              className="inline-flex items-center text-sm text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              系列: {article.series.name}
              {article.series_order && ` (第${article.series_order}篇)`}
            </Link>
          </div>
        )}

        </div> {/* Close the content area div */}
        
        {/* 阅读按钮 */}
        {variant !== 'compact' && (
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors duration-300">
            <Link to={`/article/${article.slug}`}>
              <Button 
                variant={variant === 'featured' ? 'glass' : 'ghost'} 
                size="sm"
                className="w-full justify-center group-hover:bg-go-50 dark:group-hover:bg-go-900/20 group-hover:text-go-700 dark:group-hover:text-go-400 transition-all duration-300"
                rightIcon={
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                }
              >
                阅读更多
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}