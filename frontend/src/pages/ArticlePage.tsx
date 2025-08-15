import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { articlesApi } from '../api';
import { Article } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import MarkdownRenderer from '../components/MarkdownRenderer';
import OptimizedImage from '../components/ui/OptimizedImage';
import ReadingProgress from '../components/reading/ReadingProgress';
import CollapsibleTOC from '../components/reading/CollapsibleTOC';
import StripTOC from '../components/reading/StripTOC';
import SubstackLayout from '../components/SubstackLayout';
import { useReadingTime } from '../hooks/useReadingTime';
import { useReadingCompletion } from '../components/reading/ReadingProgress';
import { formatDate, formatReadingTime } from '../utils';

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

  // 阅读时间计算
  const readingTime = useReadingTime(article?.content || '', {
    includeImages: true,
    includeTables: true
  });

  // 阅读完成监听
  useReadingCompletion(() => {
    console.log('文章阅读完成！');
    // 可以在这里添加阅读完成的统计或其他逻辑
  }, 85); // 阅读85%认为完成

  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }

    const loadArticle = async () => {
      try {
        setLoading(true);
        setError(null);

        // 获取文章详情
        const articleResponse = await articlesApi.getArticleBySlug(slug);
        const articleData = articleResponse.data;
        setArticle(articleData);
        setLikes_count(articleData.likes_count);
        setLiked(articleData.is_liked || false);
        setViews_count(articleData.views_count || 0);

        // 增加浏览量 - 异步进行，不影响页面渲染
        articlesApi.incrementViews(articleData.id.toString())
          .then(() => {
            // 更新本地显示的浏览次数
            setViews_count(prev => prev + 1);
          })
          .catch(error => {
            console.error('Failed to increment views:', error);
            // 静默失败，不影响用户体验
          });

        // 获取相关文章
        try {
          const relatedResponse = await articlesApi.getRelatedArticles(articleData.id.toString(), 4);
          // 去重处理，防止重复的ID导致React key警告
          const uniqueRelatedArticles = relatedResponse.data.filter(
            (article: Article, index: number, self: Article[]) => 
              index === self.findIndex(a => a.id === article.id)
          );
          setRelatedArticles(uniqueRelatedArticles);
        } catch (relatedError) {
          console.error('Failed to load related articles:', relatedError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '文章加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug, navigate]);

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

  // 自动隐藏通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              文章未找到
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || '请求的文章不存在或已被删除'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 阅读进度条 */}
      <ReadingProgress 
        showPercentage={false}
        threshold={0.1}
        color="rgb(59, 130, 246)"
      />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'error' 
            ? 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400' 
            : 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
        }`}>
          <div className="flex items-center">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Substack-style Layout */}
      <SubstackLayout
        tocContent={
          <StripTOC
            contentSelector=".article-content"
            maxLevel={3}
            showNumbers={false}
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
            {/* Cover Image */}
            {article.cover_image && (
              <div className="mb-8">
                <OptimizedImage
                  src={article.cover_image}
                  alt={`${article.title} 的封面图片`}
                  aspectRatio="16/9"
                  priority={true}
                  className="w-full h-full object-cover rounded-lg"
                  placeholder="skeleton"
                />
              </div>
            )}

            <div className="">
          {/* Category and Series */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {article.category && (
              <Link
                to={`/category/${article.category.slug}`}
                className="inline-block px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 
                           bg-primary-100 dark:bg-primary-900/30 rounded-full hover:bg-primary-200 
                           dark:hover:bg-primary-900/50 transition-colors"
              >
                {article.category.name}
              </Link>
            )}
            {article.series && (
              <Link
                to={`/series/${article.series.slug}`}
                className="inline-flex items-center px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 
                           bg-purple-100 dark:bg-purple-900/30 rounded-full hover:bg-purple-200 
                           dark:hover:bg-purple-900/50 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {article.series.name}
                {article.series_order && ` #${article.series_order}`}
              </Link>
            )}
          </div>

              {/* Title */}
              <h1 
                id="article-title"
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
              >
                {article.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
            {/* Author */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                {article.author.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {article.author.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  作者
                </div>
              </div>
            </div>

            {/* Published Date */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              发布于 {formatDate(article.published_at || article.created_at)}
            </div>

              {/* Reading Time - 使用新的阅读时间计算 */}
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span aria-label={`预计阅读时间: ${readingTime.estimatedTime}`}>
                  {readingTime.text} · {readingTime.words} 字
                </span>
              </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {views_count} 次阅读
              </span>
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center transition-colors ${
                  liked 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                } ${likeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {likeLoading ? (
                  <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill={liked ? 'currentColor' : 'none'} stroke={liked ? 'none' : 'currentColor'} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                {likes_count}
              </button>
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {article.tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="inline-block px-3 py-1 text-sm text-gray-600 dark:text-gray-400 
                             bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 
                             dark:hover:bg-gray-600 transition-colors"
                  style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined }}
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

              {/* Article Content */}
              <div 
                ref={contentRef}
                className="article-content"
                role="main"
                aria-label="文章内容"
              >
                <MarkdownRenderer 
                  content={article.content}
                  className="prose prose-lg max-w-none
                             prose-headings:text-gray-900 dark:prose-headings:text-white
                             prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                             prose-a:text-primary-600 dark:prose-a:text-primary-400
                             prose-strong:text-gray-900 dark:prose-strong:text-white 
                             prose-code:text-primary-600 dark:prose-code:text-primary-400
                             prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 
                             prose-blockquote:border-primary-500
                             prose-img:rounded-lg prose-img:shadow-sm"
                />
              </div>
            </div>
            </article>

            {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            相关文章
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedArticles.map((relatedArticle) => (
              <Link
                key={relatedArticle.id}
                to={`/article/${relatedArticle.slug}`}
                className="block bg-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-200 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800"
              >
                {relatedArticle.cover_image && (
                  <OptimizedImage
                    src={relatedArticle.cover_image}
                    alt={`${relatedArticle.title} 的封面图片`}
                    aspectRatio="16/9"
                    className="hover:scale-105 transition-transform duration-300"
                    placeholder="skeleton"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-2">
                    {relatedArticle.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">
                    {relatedArticle.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{relatedArticle.author.name}</span>
                    <span>{formatDate(relatedArticle.published_at || relatedArticle.created_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

          {/* Navigation */}
          <div className="mt-12 flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="返回首页"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          showNumbers={false}
          autoCollapse={false}
        />
      </div>
    </>
  );
}