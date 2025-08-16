import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from 'lucide-react';
import OptimizedImage from './ui/OptimizedImage';
import { useBooksForCarousel } from '../hooks/useBooks';
import { Book } from '../api/books';

interface BookCarouselProps {
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showDots?: boolean;
}

// 书籍数据，包含图片文件名和元数据
const books = [
  {
    id: '1',
    filename: '25e007e3e97f0ba3b84d51995b3e1643c1c181e06463a2ebfd5100b9de8fbaec.jpg',
    title: 'Go语言实战',
    description: '深入理解Go语言并发编程'
  },
  {
    id: '2', 
    filename: '2887f37cf44d808bb066d06d3837496d523e2b7eec3039248a531984c88d09e1.jpg',
    title: 'Go语言核心编程',
    description: '掌握Go语言设计理念'
  },
  {
    id: '3',
    filename: '45fba8b46de6ea53fd854ef1e69f1a168977d57810830d9944e5a8ad47a05a30.png',
    title: 'Go语言高级编程',
    description: '构建高性能Web应用'
  },
  {
    id: '4',
    filename: '6a401bc44d4f3e72495d3ecd41da1e5658861f2fd0e04fb132851b1dbe595f27.jpg',
    title: 'Go语言设计模式',
    description: '企业级应用架构设计'
  },
  {
    id: '5',
    filename: '6b68401ad33e2951911451bbdccf38d2a442cb1a26821a87753378210d797b82.jpg',
    title: 'Go微服务实战',
    description: '构建可扩展的微服务架构'
  },
  {
    id: '6',
    filename: '6cec3bef567b0ead4a7a886b377a6b201a1de95f2b8c75eee9b073acabd34ca3.jpg',
    title: 'Go云原生开发',
    description: 'Kubernetes与容器化应用'
  },
  {
    id: '7',
    filename: 'a86e241a87bc2a5212acd273c2f2cff899d7a4bfc5a5fa296eff9500c74f91ed.jpg',
    title: 'Go并发编程',
    description: 'goroutine与channel最佳实践'
  },
  {
    id: '8',
    filename: 'c7f61013dad73403312c737234518eb15e0cfbc5d78b5549ec86184f44c621ed.jpg',
    title: 'Go Web开发',
    description: '构建现代Web应用程序'
  },
  {
    id: '9',
    filename: 'ebe3b55214c45eb4d8decddc0982157d2a3fd1f6e5530484268e55dd103be899.jpg',
    title: 'Go性能优化',
    description: '高性能Go应用开发指南'
  },
  {
    id: '10',
    filename: 'ed1948d123f702997d2af8c9a78f1b9c8729cb8846db78df78ce810bae47118f.jpg',
    title: 'Go算法实现',
    description: '数据结构与算法Go实现'
  },
  {
    id: '11',
    filename: 'f15156ff0ad5e940b4798da00b66a0dfda382bb30d2208c558f5f694297128cf.jpg',
    title: 'Go系统编程',
    description: '系统级编程与网络开发'
  },
  {
    id: '12',
    filename: 'fcf4d2961eb57ac7d1b12c51c49519725776f21ae556603958c4abf50f047a84.jpg',
    title: 'Go项目实战',
    description: '企业级项目开发案例'
  }
];

export default function BookCarousel({
  className = '',
  autoPlay = true,
  autoPlayInterval = 1500,
  showControls = true,
  showDots = true
}: BookCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // 初始化调试信息
  useEffect(() => {
    console.log('BookCarousel初始化:', {
      autoPlay,
      autoPlayInterval,
      isPlaying,
      totalBooks: books.length
    });
  }, []);

  // 监听状态变化
  useEffect(() => {
    console.log('状态变化:', {
      isPlaying,
      isPageVisible,
      currentIndex,
      autoPlayInterval
    });
  }, [isPlaying, isPageVisible, currentIndex, autoPlayInterval]);

  // 获取当前显示的书籍（支持循环显示多本）
  const getVisibleBooks = useCallback(() => {
    // 响应式显示数量：移动设备显示3本，桌面显示5本
    const visibleCount = isMobile ? 3 : 5;
    const result = [];
    
    for (let i = 0; i < visibleCount; i++) {
      const index = (currentIndex + i) % books.length;
      result.push({ ...books[index], displayIndex: i });
    }
    
    console.log(`显示书籍数量: ${visibleCount}, 当前索引: ${currentIndex}, 可见书籍:`, result.map(b => b.filename));
    return result;
  }, [currentIndex, isMobile]);

  // 下一页
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % books.length);
  }, []);

  // 上一页
  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + books.length) % books.length);
  }, []);

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
    // 只有在播放状态、页面可见、且不是手动暂停时才自动播放
    if (!isPlaying || !isPageVisible) return;

    console.log('开始自动播放，间隔:', autoPlayInterval);
    const interval = setInterval(() => {
      console.log('自动切换到下一张');
      nextSlide();
    }, autoPlayInterval);
    
    return () => {
      console.log('清除自动播放定时器');
      clearInterval(interval);
    };
  }, [isPlaying, isPageVisible, nextSlide, autoPlayInterval]);

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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Go语言精选书籍
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            从入门到精通，精心挑选的Go语言学习资源，助你深入掌握Go的精髓
          </p>
        </div>

        {/* 书籍展示区域 */}
        <div className="relative">
          <div className="flex items-center justify-center space-x-4 md:space-x-6 lg:space-x-8">
            {visibleBooks.map((book, index) => {
              const centerIndex = isMobile ? 1 : 2; // 移动设备中心位置是1，桌面是2
              const isCenter = index === centerIndex; // 中间位置
              const isAdjacent = isMobile 
                ? (index === 0 || index === 2) // 移动设备：0和2是相邻位置
                : (index === 1 || index === 3); // 桌面：1和3是相邻位置
              const isEdge = isMobile 
                ? false // 移动设备没有边缘位置
                : (index === 0 || index === 4); // 桌面：0和4是边缘位置

              return (
                <div
                  key={`${book.id}-${currentIndex}`}
                  className={`
                    relative transition-all duration-700 ease-out cursor-pointer group
                    ${isCenter ? 'z-30 scale-110 md:scale-125' : ''}
                    ${isAdjacent ? 'z-20 scale-95 md:scale-100' : ''}
                    ${isEdge ? 'z-10 scale-75 md:scale-85 opacity-60' : ''}
                    ${!isCenter ? 'hover:scale-105' : 'hover:scale-115 md:hover:scale-135'}
                  `}
                  onClick={() => {
                    if (!isCenter) {
                      const centerOffset = isMobile ? 1 : 2;
                      const targetIndex = (currentIndex + index - centerOffset + books.length) % books.length;
                      goToSlide(targetIndex);
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
                      src={`/books/${book.filename}`}
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
        </div>

        {/* 控制按钮 */}
        {showControls && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 
                         bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-lg 
                         transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="上一组书籍"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 
                         bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 
                         text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-lg 
                         transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {showDots && (
            <div className="flex space-x-2">
              {books.map((_, index) => (
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
        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>使用 ← → 键导航，空格键控制播放</p>
        </div>
      </div>
    </div>
  );
}