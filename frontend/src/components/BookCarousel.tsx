import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from 'lucide-react';
import OptimizedImage from './ui/OptimizedImage';
import { useBooksForCarousel } from '../hooks/useBooks';
import { Book } from '../api/books';

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

  // 检测移动设备
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
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
      className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900/20 rounded-3xl ${className}`}
      role="region"
      aria-label="Go语言书籍展示"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-br from-green-400 to-blue-600 rounded-full blur-3xl opacity-30"></div>
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
            <div className="flex items-center justify-center space-x-4 md:space-x-6 lg:space-x-8">
              {visibleBooks.map((book, index) => {
                const centerIndex = Math.floor((isMobile ? 3 : 5) / 2); // 动态计算中心位置
                const isCenter = book.isCenterPosition; // 使用新的中心位置标识
                const isAdjacent = isMobile 
                  ? (index === 0 || index === 2) // 移动设备：0和2是相邻位置
                  : (index === 1 || index === 3); // 桌面：1和3是相邻位置
                const isEdge = isMobile 
                  ? false // 移动设备没有边缘位置
                  : (index === 0 || index === 4); // 桌面：0和4是边缘位置

                return (
                  <div
                    key={`book-${book.realIndex}-${book.displayIndex}`}
                    className={`
                      relative transition-all duration-700 ease-out cursor-pointer group
                      ${isCenter ? 'z-30 scale-110 md:scale-125' : ''}
                      ${isAdjacent ? 'z-20 scale-95 md:scale-100' : ''}
                      ${isEdge ? 'z-10 scale-75 md:scale-85 opacity-60' : ''}
                      ${!isCenter ? 'hover:scale-105' : 'hover:scale-115 md:hover:scale-135'}
                    `}
                    onClick={() => {
                      if (!isCenter) {
                        // 直接跳转到点击的书籍的真实索引
                        goToSlide(book.realIndex);
                      }
                    }}
                  >
                    {/* 书籍阴影 */}
                    <div className={`
                      absolute inset-0 bg-black/20 dark:bg-black/40 rounded-xl blur-xl transform translate-y-4
                      ${isCenter ? 'scale-110' : 'scale-100'}
                      transition-all duration-700
                    `}></div>

                    {/* 书籍封面 */}
                    <div className={`
                      relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl
                      border-2 ${isCenter ? 'border-blue-300 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'}
                      transition-all duration-700
                      ${isCenter ? 'shadow-blue-500/25 dark:shadow-blue-400/25' : ''}
                    `}>
                      <OptimizedImage
                        src={book.url}
                        alt={book.title}
                        aspectRatio="3/4"
                        className={`
                          w-32 md:w-40 lg:w-48 transition-all duration-700
                          ${isCenter ? 'brightness-110' : isAdjacent ? 'brightness-95' : 'brightness-75'}
                          group-hover:brightness-110
                        `}
                        sizes="(max-width: 768px) 128px, (max-width: 1024px) 160px, 192px"
                        placeholder="skeleton"
                        priority={true} // 所有轮播图中的图片都设为优先加载
                        onLoad={() => console.log(`图片加载成功: ${book.filename}`)}
                        onError={() => console.error(`图片加载失败: ${book.filename}`)}
                      />

                      {/* 书籍信息遮罩 */}
                      {isCenter && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-xs md:text-sm opacity-90 line-clamp-2">
                              {book.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 中心焦点指示器 */}
                      {isCenter && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 控制按钮 */}
        {showControls && hasBooks && !loading && (
          <>
            <button
              onClick={prevSlide}
              disabled={activeBooks.length === 0}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 
                         bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-lg 
                         transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="上一组书籍"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              disabled={activeBooks.length === 0}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 
                         bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-lg 
                         transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="下一组书籍"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}

        {/* 播放控制和指示器 */}
        <div className="flex items-center justify-center mt-8 space-x-6">
          {/* 播放/暂停按钮 */}
          <button
            onClick={() => {
              const newPlayingState = !isPlaying;
              setIsPlaying(newPlayingState);
              console.log(`播放状态切换: ${newPlayingState ? '播放' : '暂停'}`);
            }}
            className="bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 
                       text-gray-700 dark:text-gray-300 rounded-full p-2 shadow-lg 
                       transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* 页面指示器 */}
          {showDots && hasBooks && !loading && (
            <div className="flex space-x-2">
              {activeBooks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${index === currentIndex 
                      ? 'bg-blue-600 dark:bg-blue-400 scale-125' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }
                  `}
                  aria-label={`跳转到第 ${index + 1} 本书`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 键盘操作提示 */}
        {hasBooks && !loading && (
          <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>使用 ← → 键导航，空格键控制播放</p>
          </div>
        )}
      </div>
    </div>
  );
}