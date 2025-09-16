import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { articlesApi } from '../api';
import { Article } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import MarkdownRenderer from '../components/MarkdownRenderer';
import OptimizedImage from '../components/ui/OptimizedImage';
import CollapsibleTOC from '../components/reading/CollapsibleTOC';
import StripTOC from '../components/reading/StripTOC';
import SubstackLayout from '../components/SubstackLayout';
import { useReadingTime } from '../hooks/useReadingTime';
import { formatDate } from '../utils';
import '../styles/foldable-article.css';
import EnhancedArticleGrid from '../components/EnhancedArticleGrid';

// Memoized RelatedArticles component to prevent unnecessary re-renders
const RelatedArticles = memo(({ articles }: { articles: Article[] }) => {
  if (articles.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 font-heading">
        相关文章推荐
      </h2>
      {/* Use fewer columns within the 60% center column to keep card width comparable to homepage */}
      <EnhancedArticleGrid 
        articles={articles} 
        variant="grid" 
        gridColumns="grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3" 
      />
    </section>
  );
});

RelatedArticles.displayName = 'RelatedArticles';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes_count, setLikes_count] = useState(0);
  const [views_count, setViews_count] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // 阅读时间计算 - 移动到顶级以符合 React Hooks 规则
  const readingTime = useReadingTime(article?.content || '', {
    includeImages: true,
    includeTables: true
  });

  // 优化的阅读完成监听 - 使用 Intersection Observer 避免滚动事件性能问题
  const [hasCompletedReading, setHasCompletedReading] = useState(false);
  
  const handleReadingComplete = useCallback(() => {
    if (!hasCompletedReading) {
      setHasCompletedReading(true);
      console.log('文章阅读完成！');
      // 可以在这里添加阅读完成的统计或其他逻辑
    }
  }, [hasCompletedReading]);
  
  // 使用 Intersection Observer 监听文章底部，避免滚动事件性能问题
  useEffect(() => {
    if (!contentRef.current || hasCompletedReading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          handleReadingComplete();
        }
      },
      { 
        threshold: 0.8, // 当80%的内容可见时触发
        rootMargin: '0px 0px -20% 0px' // 优化触发区域
      }
    );
    
    // 监听内容区域的最后一个元素
    const lastElement = contentRef.current.lastElementChild;
    if (lastElement) {
      observer.observe(lastElement);
    }
    
    return () => observer.disconnect();
  }, [handleReadingComplete, article?.content, hasCompletedReading]);

  // 定义 loadArticle 函数，使其在依赖数组中可访问
  const loadArticle = useCallback(async () => {
    if (!slug) {
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 获取文章详情
      const articleResponse = await articlesApi.getArticleBySlug(slug);
      const articleData = articleResponse.data;
      
      // 使用单次批量状态更新减少重渲染
      setArticle(articleData);
      setLikes_count(articleData.likes_count);
      setLiked(articleData.is_liked || false);
      setViews_count(articleData.views_count || 0);

      // 增加浏览量 - 异步进行，不影响页面渲染
      articlesApi.incrementViews(articleData.id.toString())
        .then(() => {
          setViews_count(prev => prev + 1);
        })
        .catch(error => {
          console.error('Failed to increment views:', error);
        });

      // 获取相关文章 - 使用 Set 优化去重逻辑
      try {
        const relatedResponse = await articlesApi.getRelatedArticles(articleData.id.toString(), 4);
        const articles = relatedResponse.data || [];
        const uniqueArticles = Array.from(
          new Map(articles.map((article: Article) => [article.id, article])).values()
        );
        setRelatedArticles(uniqueArticles);
      } catch (relatedError) {
        console.error('Failed to load related articles:', relatedError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文章加载失败');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    loadArticle();
    
    // 重置阅读状态
    setHasCompletedReading(false);
  }, [loadArticle]);

  const handleLike = useCallback(async () => {
    if (!article || likeLoading) return;

    setLikeLoading(true);
    
    // 乐观更新 UI
    const originalLiked = liked;
    const originalCount = likes_count;
    
    setLiked(!liked);
    setLikes_count(prev => liked ? prev - 1 : prev + 1);

    try {
      const response = await articlesApi.toggleLike(article.id.toString());
      // 使用服务端返回的最新数据
      setLiked(response.data.liked);
      setLikes_count(response.data.likes_count);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // 回滚到原始状态
      setLiked(originalLiked);
      setLikes_count(originalCount);
      // 显示错误提示
      setNotification({message: '操作失败，请稍后重试', type: 'error'});
    } finally {
      setLikeLoading(false);
    }
  }, [article, likeLoading, liked, likes_count]);

  // 缓存文章内容和相关计算 - 更细粒度的依赖（移到顶级以符合 Hooks 规则）
  const memoizedContent = useMemo(() => {
    if (!article) return null;
    
    return {
      title: article.title,
      content: article.content,
      coverImage: article.cover_image,
      category: article.category,
      series: article.series,
      tags: article.tags,
      author: article.author,
      publishedAt: article.published_at || article.created_at,
      excerpt: article.excerpt
    };
  }, [article]);

  // 优化的通知组件缓存（移到顶级以符合 Hooks 规则）
  const NotificationComponent = useMemo(() => {
    if (!notification) return null;
    
    const handleDismiss = () => setNotification(null);
    
    return (
      <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-medium transition-all duration-300 backdrop-blur-sm ${
        notification.type === 'error' 
          ? 'bg-red-50/90 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400' 
          : 'bg-go-50/90 border border-go-200 text-go-700 dark:bg-go-900/20 dark:border-go-700 dark:text-go-400'
      }`}>
        <div className="flex items-center">
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={handleDismiss}
            className="ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            aria-label="关闭通知"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }, [notification]);

  // 自动隐藏通知 - 优化定时器处理
  useEffect(() => {
    if (!notification) return;
    
    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [notification]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center py-16">
          <div className="max-w-md mx-auto card shadow-strong p-8">
            <svg className="w-20 h-20 text-go-400 mx-auto mb-6 animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 font-heading">
              文章未找到
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
              {error || '请求的文章不存在或已被删除'}
            </p>
            <Link
              to="/"
              className="btn btn-primary group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      {/* Notification - 使用缓存的组件 */}
      {NotificationComponent}

      {/* Substack-style Layout */}
      <SubstackLayout
        tocContent={
          <StripTOC
            contentSelector=".article-content"
            maxLevel={3}
          />
        }
      >
        <div className="py-8">
          {/* Article Header */}
          <article 
            className="bg-transparent"
            role="article"
            aria-labelledby="article-title"
          >
            {/* Cover Image - 使用缓存的数据 */}
            {memoizedContent?.coverImage && (
              <div className="mb-8 card hover:shadow-strong transition-all duration-300">
                <OptimizedImage
                  src={memoizedContent.coverImage}
                  alt={`${memoizedContent.title} 的封面图片`}
                  aspectRatio="16/9"
                  priority={true}
                  className="w-full h-full object-cover rounded-xl"
                  placeholder="skeleton"
                />
              </div>
            )}

            <div className="">
          {/* Category and Series - 使用缓存的数据 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {memoizedContent?.category && (
              <Link
                to={`/category/${memoizedContent.category.slug}`}
                className="inline-block px-4 py-2 text-sm font-medium text-go-700 dark:text-go-300 
                           bg-go-100 dark:bg-go-900/30 rounded-xl hover:bg-go-200 hover:shadow-soft
                           hover:-translate-y-0.5 dark:hover:bg-go-900/50 transition-all duration-200"
              >
                {memoizedContent.category.name}
              </Link>
            )}
            {memoizedContent?.series && (
              <Link
                to={`/series/${memoizedContent.series.slug}`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 
                           bg-purple-100 dark:bg-purple-900/30 rounded-xl hover:bg-purple-200 hover:shadow-soft
                           hover:-translate-y-0.5 dark:hover:bg-purple-900/50 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {memoizedContent.series.name}
                {article.series_order && ` #${article.series_order}`}
              </Link>
            )}
          </div>

              {/* Title - 使用缓存的数据 */}
              <h1 
                id="article-title"
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-8 leading-tight font-heading text-shadow-sm"
              >
                {memoizedContent?.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 pb-8 mb-8 border-b border-go-200 dark:border-go-700">
            {/* Author - 使用缓存的数据 */}
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-go-500 to-go-600 text-white rounded-xl flex items-center justify-center font-semibold text-lg shadow-soft">
                {memoizedContent?.author.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {memoizedContent?.author.name}
                </div>
                <div className="text-xs text-go-600 dark:text-go-400 font-medium">
                  作者
                </div>
              </div>
            </div>

            {/* Published Date */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 mr-2 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              发布于 {formatDate(memoizedContent?.publishedAt)}
            </div>

              {/* Reading Time - 使用新的阅读时间计算 */}
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 mr-2 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span aria-label={`预计阅读时间: ${readingTime.estimatedTime}`}>
                  {readingTime.text} · {readingTime.words} 字
                </span>
              </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 mr-2 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {views_count} 次阅读
              </span>
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5 ${
                  liked 
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                    : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                } ${likeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {likeLoading ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill={liked ? 'currentColor' : 'none'} stroke={liked ? 'none' : 'currentColor'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                <span className="font-medium">{likes_count}</span>
              </button>
            </div>
          </div>

          {/* Tags - 使用缓存的数据 */}
          {memoizedContent?.tags && memoizedContent.tags.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-10">
              {memoizedContent.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="inline-block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                             bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 hover:shadow-soft
                             hover:-translate-y-0.5 dark:hover:bg-gray-600 transition-all duration-200"
                  style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

              {/* Article Content - 使用缓存的数据和优化的MarkdownRenderer */}
              <div 
                ref={contentRef}
                className="article-content"
                role="main"
                aria-label="文章内容"
              >
                {memoizedContent?.content && (
                  <MarkdownRenderer 
                    content={memoizedContent.content}
                    className="prose prose-lg max-w-none
                               prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-heading
                               prose-a:text-go-600 dark:prose-a:text-go-400 prose-a:font-medium hover:prose-a:text-go-700
                               prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
                               prose-code:text-go-700 dark:prose-code:text-go-300
                               prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-xl prose-pre:shadow-soft
                               prose-blockquote:border-go-500 prose-blockquote:bg-go-50/50 dark:prose-blockquote:bg-go-900/20 prose-blockquote:py-1.5 prose-blockquote:px-4
                               prose-img:rounded-xl prose-img:shadow-medium prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-700
                               prose-table:border prose-table:border-gray-200 dark:prose-table:border-gray-700 prose-table:rounded-lg prose-table:overflow-hidden
                               prose-th:bg-go-50 dark:prose-th:bg-go-900/30 prose-th:text-go-900 dark:prose-th:text-go-100
                               prose-td:border-gray-200 dark:prose-td:border-gray-700"
                  />
                )}
              </div>
            </div>
            </article>

            {/* Related Articles - 使用优化的组件 */}
            <RelatedArticles articles={relatedArticles} />

          {/* Navigation */}
          <div className="mt-16 flex justify-center">
            <Link
              to="/"
              className="btn btn-outline group"
              aria-label="返回首页"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回首页
            </Link>
          </div>
        </div>
      </SubstackLayout>

      {/* Mobile TOC - Keep CollapsibleTOC for mobile devices */}
      <div className="lg:hidden">
        <CollapsibleTOC
          contentSelector=".article-content"
          maxLevel={3}
          autoCollapse={false}
        />
      </div>
    </>
  );
}