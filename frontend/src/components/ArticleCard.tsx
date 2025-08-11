import { Link } from 'react-router-dom';
import { Article } from '../types';
import { formatDate, formatReadingTime } from '../utils';

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
  const cardClasses = {
    default: 'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden',
    compact: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden',
    featured: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden border border-primary-200 dark:border-primary-700',
  };

  const titleClasses = {
    default: 'text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-2',
    compact: 'text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1 mb-1',
    featured: 'text-2xl font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-3',
  };

  return (
    <article className={cardClasses[variant]}>
      {/* Cover Image */}
      {article.cover_image && variant !== 'compact' && (
        <div className="aspect-video overflow-hidden">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className={variant === 'featured' ? 'p-6' : 'p-4'}>
        {/* Category */}
        {showCategory && article.category && (
          <div className="mb-2">
            <Link
              to={`/category/${article.category.slug}`}
              className="inline-block px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 
                         bg-primary-100 dark:bg-primary-900/30 rounded-full hover:bg-primary-200 
                         dark:hover:bg-primary-900/50 transition-colors"
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
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`/series/${article.series.slug}`}
              className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              系列: {article.series.name}
              {article.series_order && ` (第${article.series_order}篇)`}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}