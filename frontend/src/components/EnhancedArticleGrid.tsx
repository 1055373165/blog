import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Article } from '../types';
import OptimizedImage from './ui/OptimizedImage';
import { formatDate } from '../utils';
import { clsx } from 'clsx';

interface EnhancedArticleGridProps {
  articles: Article[];
  loading?: boolean;
  className?: string;
  variant?: 'masonry' | 'grid' | 'mixed';
  enableAnimations?: boolean;
  showStats?: boolean;
  showCategory?: boolean;
  showTags?: boolean;
}

// 文章卡片组件 - 增强微交互
const EnhancedArticleCard = ({ 
  article, 
  index, 
  showStats, 
  showCategory, 
  showTags,
  className 
}: { 
  article: Article; 
  index: number;
  showStats?: boolean;
  showCategory?: boolean;
  showTags?: boolean;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 100); // 错峰动画
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || !isHovered) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    cardRef.current.style.transform = `
      perspective(1000px) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg) 
      translateZ(20px)
      scale(1.02)
    `;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // 防止事件冒泡影响其他组件
    e.stopPropagation();
    // 直接导航到文章页面
    window.location.href = `/article/${article.slug}`;
  };

  return (
      <article
        ref={cardRef}
        data-article="true"
        data-article-slug={article.slug}
        className={clsx(
          'group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-700 ease-out cursor-pointer',
          'border border-gray-200 dark:border-gray-700',
          'hover:shadow-2xl hover:border-primary-300 dark:hover:border-primary-600',
          'clickable card', // Add explicit classes for click detection
          isVisible && 'animate-fade-in-up',
          className
        )}
        style={{
          animationDelay: `${index * 100}ms`,
          transformStyle: 'preserve-3d'
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* 悬浮光效 */}
        <div className={clsx(
          'absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-go-500/5 opacity-0 transition-opacity duration-500',
          isHovered && 'opacity-100'
        )} />

        {/* 图片容器 */}
        {article.cover_image && (
          <div className="relative overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
            <OptimizedImage
              src={article.cover_image}
              alt={article.title}
              aspectRatio="16/9"
              className={clsx(
                'transition-all duration-700 group-hover:scale-110',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              placeholder="skeleton"
            />
            
            {/* 图片悬浮遮罩 */}
            <div className={clsx(
              'absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500',
              isHovered && 'opacity-100'
            )} />

            {/* 阅读时间指示器 */}
            <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
              {Math.ceil((article.content?.length || 1000) / 200)} 分钟阅读
            </div>

            {/* 分类标签 */}
            {showCategory && article.category && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-primary-600/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                  {article.category.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="p-6 relative">
          {/* 标题 */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
            {article.title}
          </h3>

          {/* 摘要 */}
          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 leading-relaxed">
            {article.excerpt || article.content?.substring(0, 150) + '...'}
          </p>

          {/* 标签 */}
          {showTags && article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-go-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {article.author.name.charAt(0)}
              </div>
              <span className="font-medium">{article.author.name}</span>
            </div>
            
            <time dateTime={article.published_at || article.created_at}>
              {formatDate(article.published_at || article.created_at)}
            </time>
          </div>

          {/* 统计信息 */}
          {showStats && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>{article.views_count || 0}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  <span>{article.likes_count || 0}</span>
                </span>
              </div>
              
              {/* 互动指示器 */}
              <div className={clsx(
                'w-2 h-2 rounded-full transition-all duration-500',
                isHovered ? 'bg-primary-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              )} />
            </div>
          )}
        </div>

        {/* 悬浮时的增强效果 */}
        <div className={clsx(
          'absolute inset-0 rounded-2xl transition-all duration-500 pointer-events-none',
          isHovered && 'shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-primary-500/20'
        )} />
      </article>
  );
};

// 瀑布流布局计算Hook
const useMasonryLayout = (articles: Article[], columnCount: number = 3) => {
  const [columns, setColumns] = useState<Article[][]>([]);

  useEffect(() => {
    if (!articles.length) {
      setColumns([]);
      return;
    }

    const newColumns: Article[][] = Array.from({ length: columnCount }, () => []);
    const columnHeights = new Array(columnCount).fill(0);

    articles.forEach((article) => {
      // 简单的高度估算 - 实际项目中可能需要更精确的计算
      const estimatedHeight = 200 + (article.excerpt?.length || 100) * 0.5 + 
                            (article.tags?.length || 0) * 20 + 
                            (article.cover_image ? 200 : 0);
      
      // 找到最短的列
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      newColumns[shortestColumnIndex].push(article);
      columnHeights[shortestColumnIndex] += estimatedHeight;
    });

    setColumns(newColumns);
  }, [articles, columnCount]);

  return columns;
};

export default function EnhancedArticleGrid({
  articles,
  loading = false,
  className,
  variant = 'masonry',
  enableAnimations = true,
  showStats = true,
  showCategory = true,
  showTags = true
}: EnhancedArticleGridProps) {
  const [columnCount, setColumnCount] = useState(3);
  const masonryColumns = useMasonryLayout(articles, columnCount);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width < 768) setColumnCount(1);
      else if (width < 1024) setColumnCount(2);
      else setColumnCount(3);
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!articles.length) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-go-100 dark:from-primary-900/30 dark:to-go-900/30 rounded-2xl flex items-center justify-center">
          <svg className="w-12 h-12 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无文章</h3>
        <p className="text-gray-600 dark:text-gray-400">还没有发布任何文章，请稍后再来查看。</p>
      </div>
    );
  }

  // 渲染不同布局变体
  if (variant === 'masonry') {
    return (
      <div className={clsx('grid gap-6', className)} style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
        {masonryColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-6">
            {column.map((article, index) => (
              <EnhancedArticleCard
                key={article.id}
                article={article}
                index={columnIndex * column.length + index}
                showStats={showStats}
                showCategory={showCategory}
                showTags={showTags}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'mixed') {
    return (
      <div className={clsx('grid gap-6', className)}>
        {/* 特色文章 - 占两列 */}
        {articles[0] && (
          <EnhancedArticleCard
            article={articles[0]}
            index={0}
            showStats={showStats}
            showCategory={showCategory}
            showTags={showTags}
            className="md:col-span-2 lg:col-span-3"
          />
        )}
        
        {/* 其余文章 - 标准网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:col-span-2 lg:col-span-3">
          {articles.slice(1).map((article, index) => (
            <EnhancedArticleCard
              key={article.id}
              article={article}
              index={index + 1}
              showStats={showStats}
              showCategory={showCategory}
              showTags={showTags}
            />
          ))}
        </div>
      </div>
    );
  }

  // 默认网格布局
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {articles.map((article, index) => (
        <EnhancedArticleCard
          key={article.id}
          article={article}
          index={index}
          showStats={showStats}
          showCategory={showCategory}
          showTags={showTags}
        />
      ))}
    </div>
  );
}