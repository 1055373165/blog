import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from 'lucide-react';
import OptimizedImage from './ui/OptimizedImage';
import { useBooksForCarousel } from '../hooks/useBooks';
import { Book } from '../api/books';
import { clsx } from 'clsx';

// 扩展的书籍类型，用于轮播显示
interface CarouselBook extends Book {
  displayIndex: number;
  realIndex: number;
  isCenterPosition: boolean;
}

interface BookCarouselProps {
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showDots?: boolean;
}

// 空的fallback书籍数据，在API失败时使用
const fallbackBooks: Book[] = [];

export default function BookCarousel({
  className = '',
  autoPlay = true,
  autoPlayInterval = 1500,
  showControls = true,
  showDots = true
}: BookCarouselProps) {
  const { books, loading, error, refresh, hasBooks, totalBooks } = useBooksForCarousel();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 初始化调试信息
  useEffect(() => {
    console.log('BookCarousel初始化:', {
      autoPlay,
      autoPlayInterval,
      isPlaying,
      totalBooks,
      hasBooks,
      loading,
      error
    });
  }, [autoPlay, autoPlayInterval, isPlaying, totalBooks, hasBooks, loading, error]);

  // 监听状态变化
  useEffect(() => {
    console.log('状态变化:', {
      isPlaying,
      isPageVisible,
      currentIndex,
      autoPlayInterval,
      totalBooks
    });
  }, [isPlaying, isPageVisible, currentIndex, autoPlayInterval, totalBooks]);

  // 使用实际的书籍数据，如果没有数据则使用fallback
  const activeBooks = hasBooks ? books : fallbackBooks;

  // 获取当前显示的书籍（以currentIndex为中心对称显示）
  const getVisibleBooks = useCallback((): CarouselBook[] => {
    if (activeBooks.length === 0) return [];
    
    // 响应式显示数量：移动设备显示3本，桌面显示5本
    const visibleCount = Math.min(isMobile ? 3 : 5, activeBooks.length);
    const result: CarouselBook[] = [];
    
    // 计算中心偏移量
    const centerOffset = Math.floor(visibleCount / 2);
    
    for (let i = 0; i < visibleCount; i++) {
      // 以currentIndex为中心，计算每个位置的真实索引
      const offset = i - centerOffset;
      const realIndex = (currentIndex + offset + activeBooks.length) % activeBooks.length;
      
      result.push({ 
        ...activeBooks[realIndex], 
        displayIndex: i,
        realIndex: realIndex,
        isCenterPosition: i === centerOffset
      });
    }
    
    console.log(`显示书籍数量: ${visibleCount}, 当前中心索引: ${currentIndex}, 中心偏移: ${centerOffset}`);
    console.log('可见书籍:', result.map(b => `${b.filename}(实际索引:${b.realIndex}, 显示位置:${b.displayIndex}, 是否居中:${b.isCenterPosition})`));
    return result;
  }, [currentIndex, isMobile, activeBooks]);

  // 下一页
  const nextSlide = useCallback(() => {
    if (activeBooks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activeBooks.length);
  }, [activeBooks.length]);

  // 上一页
  const prevSlide = useCallback(() => {
    if (activeBooks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + activeBooks.length) % activeBooks.length);
  }, [activeBooks.length]);

  // 跳转到指定索引
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);


  // 检测移动设备和鼠标交互
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!carouselRef.current) return;
      const rect = carouselRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x: x - 0.5, y: y - 0.5 });
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 自动播放逻辑
  useEffect(() => {
    // 只有在有书籍数据、播放状态、页面可见、且不是手动暂停时才自动播放
    if (!isPlaying || !isPageVisible || activeBooks.length === 0 || loading) return;

    console.log('开始自动播放，间隔:', autoPlayInterval);
    const interval = setInterval(() => {
      console.log('自动切换到下一张');
      nextSlide();
    }, autoPlayInterval);
    
    return () => {
      console.log('清除自动播放定时器');
      clearInterval(interval);
    };
  }, [isPlaying, isPageVisible, nextSlide, autoPlayInterval, activeBooks.length, loading]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevSlide();
      } else if (event.key === 'ArrowRight') {
        nextSlide();
      } else if (event.key === ' ') {
        event.preventDefault();
        const newPlayingState = !isPlaying;
        console.log('空格键切换播放状态:', newPlayingState ? '播放' : '暂停');
        setIsPlaying(newPlayingState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevSlide, nextSlide, isPlaying]);

  const visibleBooks = getVisibleBooks();

  // 手动刷新功能
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      console.log('书籍数据刷新成功');
    } catch (error) {
      console.error('书籍数据刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // 当书籍数量变化时，确保currentIndex在有效范围内
  useEffect(() => {
    if (activeBooks.length > 0 && currentIndex >= activeBooks.length) {
      setCurrentIndex(0);
    }
  }, [activeBooks.length, currentIndex]);

  return (
    <div 
      ref={carouselRef}
      className={clsx(
        'relative overflow-hidden rounded-3xl backdrop-blur-xl transition-all duration-700',
        'bg-gradient-to-br from-white/95 via-blue-50/80 to-purple-50/70',
        'dark:from-gray-800/95 dark:via-gray-900/90 dark:to-gray-800/80',
        'shadow-2xl border border-white/20 dark:border-gray-800/20',
        isHovered && 'shadow-[0_0_60px_rgba(59,130,246,0.15)] scale-[1.02]',
        className
      )}
      role="region"
      aria-label="Go语言书籍展示"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `perspective(1000px) rotateX(${mousePosition.y * 2}deg) rotateY(${mousePosition.x * 2}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 增强的3D背景装饰 */}
      <div className="absolute inset-0">
        {/* 主背景层 */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div 
            className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-3xl animate-float"
            style={{
              transform: `translate3d(${mousePosition.x * 20}px, ${mousePosition.y * 20}px, 0)`
            }}
          />
          <div 
            className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full blur-3xl animate-float-delayed"
            style={{
              transform: `translate3d(${mousePosition.x * -15}px, ${mousePosition.y * -15}px, 0)`
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-br from-green-400 to-blue-600 rounded-full blur-3xl opacity-30 animate-pulse-slow"
            style={{
              transform: `translate(-50%, -50%) translate3d(${mousePosition.x * 10}px, ${mousePosition.y * 10}px, 0) scale(${1 + Math.abs(mousePosition.x) * 0.1})`
            }}
          />
        </div>
        
        {/* 书架的木纹背景 */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="w-full h-full bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 dark:from-amber-900 dark:via-amber-800 dark:to-amber-700" 
               style={{
                 backgroundImage: `
                   repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px),
                   repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.05) 20px, rgba(0,0,0,0.05) 22px)
                 `
               }}
          />
        </div>
        
        {/* 动态光线效果 */}
        <div className={clsx(
          'absolute inset-0 opacity-0 transition-opacity duration-500',
          isHovered && 'opacity-30'
        )}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-go-400/50 to-transparent animate-channel-flow" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-400/50 to-transparent animate-channel-flow" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <div className="relative px-8 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Go语言精选书籍
            </h2>
            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className={`
                p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${isRefreshing || loading 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-lg hover:scale-110'
                }
              `}
              title="刷新书籍列表"
            >
              <RefreshCwIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {loading ? '正在加载书籍数据...' : 
             error ? '书籍数据加载失败，请尝试刷新' :
             hasBooks ? `从入门到精通，精心挑选的Go语言学习资源，当前共 ${totalBooks} 本书籍` :
             '暂无书籍数据，请检查books目录'}
          </p>
        </div>

        {/* 书籍展示区域 */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600 dark:text-gray-300">正在加载书籍...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isRefreshing ? '刷新中...' : '重试'}
              </button>
            </div>
          ) : !hasBooks ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-center mb-4">暂无书籍数据</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">请将图书图片放入 /frontend/public/books/ 目录</p>
            </div>
          ) : (
            // 3D书架展示区域
            <div 
              className="relative"
              style={{
                transform: 'perspective(1200px)',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* 书架底部 */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-4/5 h-8 bg-gradient-to-r from-amber-600/20 via-amber-700/30 to-amber-600/20 rounded-full blur-lg" />
              
              <div className="flex items-end justify-center space-x-4 md:space-x-6 lg:space-x-8 relative z-10">
                {visibleBooks.map((book, index) => {
                  const centerIndex = Math.floor((isMobile ? 3 : 5) / 2);
                  const isCenter = book.isCenterPosition;
                  const isAdjacent = isMobile 
                    ? (index === 0 || index === 2)
                    : (index === 1 || index === 3);
                  const isEdge = isMobile 
                    ? false
                    : (index === 0 || index === 4);
                  
                  // 3D位置计算
                  const distanceFromCenter = Math.abs(index - centerIndex);
                  const depthOffset = distanceFromCenter * 10;
                  const heightOffset = distanceFromCenter * 20;

                  return (
                    <div
                      key={`book-${book.realIndex}-${book.displayIndex}`}
                      className={clsx(
                        'relative transition-all duration-700 ease-out cursor-pointer group',
                        'transform-gpu', // GPU加速
                        isCenter && 'z-30',
                        isAdjacent && 'z-20',
                        isEdge && 'z-10 opacity-60'
                      )}
                      style={{
                        transform: `
                          perspective(1000px)
                          translateZ(${isCenter ? 40 : -depthOffset}px)
                          translateY(${-heightOffset}px)
                          rotateY(${(index - centerIndex) * 8}deg)
                          scale(${isCenter ? 1.15 : isAdjacent ? 1.0 : 0.85})
                          ${!isCenter ? `rotateX(${mousePosition.y * 5}deg)` : ''}
                        `,
                        transformStyle: 'preserve-3d',
                        filter: `brightness(${isCenter ? 1.1 : isAdjacent ? 0.95 : 0.8}) contrast(${isCenter ? 1.1 : 1})`
                      }}
                      onClick={() => goToSlide(book.realIndex)}
                    >
                      {/* 增强的3D阴影系统 */}
                      <div className={clsx(
                        'absolute inset-0 transition-all duration-700',
                        'transform translate-y-4 translateZ(-10px)',
                        isCenter && 'scale-110'
                      )}>
                        {/* 主阴影 */}
                        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 rounded-xl blur-xl" />
                        {/* 内阴影 */}
                        <div className="absolute inset-2 bg-black/15 dark:bg-black/25 rounded-lg blur-lg" />
                        {/* 光晕效果 */}
                        {isCenter && (
                          <div className="absolute -inset-4 bg-gradient-to-b from-primary-500/20 via-go-500/20 to-transparent rounded-xl blur-2xl" />
                        )}
                      </div>

                      {/* 增强的3D书籍封面 */}
                      <div className={clsx(
                        'relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all duration-700',
                        'border-2 shadow-2xl',
                        isCenter 
                          ? 'border-blue-300 dark:border-blue-600 shadow-blue-500/25 dark:shadow-blue-400/25'
                          : 'border-gray-200 dark:border-gray-700',
                        'group-hover:shadow-4xl'
                      )}
                      style={{
                        transform: 'translateZ(20px)',
                        boxShadow: isCenter 
                          ? '0 25px 50px -12px rgba(59, 130, 246, 0.25), 0 0 30px rgba(59, 130, 246, 0.1)'
                          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }}>
                        {/* 书脊装饰 */}
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 rounded-r opacity-60" style={{ transform: 'translateZ(1px)' }} />
                        
                        <OptimizedImage
                          src={book.url}
                          alt={book.title}
                          aspectRatio="3/4"
                          className={clsx(
                            'w-32 md:w-40 lg:w-48 transition-all duration-700 relative z-10',
                            isCenter && 'brightness-110 contrast-110',
                            isAdjacent && 'brightness-95',
                            isEdge && 'brightness-75',
                            'group-hover:brightness-110 group-hover:contrast-105'
                          )}
                          style={{
                            transform: 'translateZ(5px)',
                            filter: `saturate(${isCenter ? 1.1 : 0.9}) hue-rotate(${isCenter ? '5deg' : '0deg'})`
                          }}
                          sizes="(max-width: 768px) 128px, (max-width: 1024px) 160px, 192px"
                          placeholder="skeleton"
                          priority={true}
                          onLoad={() => console.log(`图片加载成功: ${book.filename}`)}
                          onError={() => console.error(`图片加载失败: ${book.filename}`)}
                        />
                        
                        {/* 书籍光泽效果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 rounded-xl pointer-events-none" style={{ transform: 'translateZ(10px)' }} />
                        
                        {/* 动态光效 */}
                        {isHovered && isCenter && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-glass-shimmer" style={{ transform: 'translateZ(15px)' }} />
                        )}


                        {/* 增强的中心焦点指示器 */}
                        {isCenter && (
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-glow-pulse shadow-lg" style={{ transform: 'translateZ(25px)' }}>
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-30" />
                          </div>
                        )}
                        
                        {/* 书籍信息标签 */}
                        <div className={clsx(
                          'absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs p-2 rounded opacity-0 transition-all duration-300',
                          'group-hover:opacity-100'
                        )} style={{ transform: 'translateZ(20px)' }}>
                          <div className="font-medium truncate">{book.title}</div>
                          <div className="text-gray-300 text-[10px] mt-0.5">Go语言学习资料</div>
                        </div>
                      </div>
                      
                      {/* 书籍反射效果 */}
                      <div className="absolute -bottom-1 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent rounded-b-xl blur-sm opacity-60" style={{ transform: 'translateZ(-5px)' }} />
                    </div>
                  );
                })}
              </div>
              
              {/* 书架环境光效 */}
              <div className="absolute inset-0 pointer-events-none">
                {/* 顶部光源 */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-3/4 h-20 bg-gradient-to-b from-yellow-200/30 via-yellow-100/20 to-transparent rounded-full blur-2xl" />
                
                {/* 左右侧光 */}
                <div className="absolute top-1/4 -left-10 w-20 h-1/2 bg-gradient-to-r from-blue-200/20 to-transparent rounded-full blur-xl" />
                <div className="absolute top-1/4 -right-10 w-20 h-1/2 bg-gradient-to-l from-purple-200/20 to-transparent rounded-full blur-xl" />
              </div>
            </div>
          )}
        </div>

        {/* 增强的控制按钮 */}
        {showControls && hasBooks && !loading && (
          <>
            <button
              onClick={prevSlide}
              disabled={activeBooks.length === 0}
              className={clsx(
                'absolute left-4 top-1/2 transform -translate-y-1/2 z-40',
                'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl',
                'hover:bg-white dark:hover:bg-gray-800',
                'text-gray-700 dark:text-gray-300 rounded-full p-4 shadow-2xl',
                'transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border border-white/30 dark:border-gray-700/30',
                'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
                'group'
              )}
              aria-label="上一组书籍"
            >
              <ChevronLeftIcon className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={nextSlide}
              disabled={activeBooks.length === 0}
              className={clsx(
                'absolute right-4 top-1/2 transform -translate-y-1/2 z-40',
                'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl',
                'hover:bg-white dark:hover:bg-gray-800',
                'text-gray-700 dark:text-gray-300 rounded-full p-4 shadow-2xl',
                'transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border border-white/30 dark:border-gray-700/30',
                'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
                'group'
              )}
              aria-label="下一组书籍"
            >
              <ChevronRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-l from-blue-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )}

        {/* 增强的播放控制和指示器 */}
        <div className="flex items-center justify-center mt-8 space-x-8">
          {/* 增强的播放/暂停按钮 */}
          <button
            onClick={() => {
              const newPlayingState = !isPlaying;
              setIsPlaying(newPlayingState);
              console.log(`播放状态切换: ${newPlayingState ? '播放' : '暂停'}`);
            }}
            className={clsx(
              'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl',
              'hover:bg-white dark:hover:bg-gray-800',
              'text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-2xl',
              'transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'border border-white/30 dark:border-gray-700/30',
              'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
              'group relative overflow-hidden'
            )}
            aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
            <div className={clsx(
              'absolute inset-0 bg-gradient-to-r from-go-500/20 to-primary-500/20 rounded-full transition-opacity duration-300',
              isPlaying ? 'opacity-100' : 'opacity-0'
            )} />
          </button>

          {/* 增强的页面指示器 */}
          {showDots && hasBooks && !loading && (
            <div className="flex space-x-3">
              {activeBooks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={clsx(
                    'relative w-3 h-3 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blue-500 group',
                    index === currentIndex 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 scale-125 shadow-lg' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 hover:scale-110'
                  )}
                  aria-label={`跳转到第 ${index + 1} 本书`}
                >
                  {index === currentIndex && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping opacity-50" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm" />
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 键盘操作提示 */}
        {hasBooks && !loading && (
          <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>使用 ← → 键导航，空格键控制播放，点击书籍切换到对应位置</p>
          </div>
        )}
      </div>

    </div>
  );
}