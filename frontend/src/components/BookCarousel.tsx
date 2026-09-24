import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from 'lucide-react';
import { useBooksForCarousel } from '../hooks/useBooks';
import { useLocalBooksForCarousel } from '../hooks/useLocalBooks';
import { Book } from '../api/books';
import { clsx } from 'clsx';

/* ──────────────────────────────────────────────────────────
   BookCarousel
   Cards are keyed by book and stay mounted while they are in
   the render window, so a slide only animates transform and
   opacity — no remounts, no image re-decodes. One hidden card
   on each side is kept loaded as a buffer, and autoplay only
   advances once the card about to enter view has loaded.
   Autoplay keeps running in background tabs and offscreen.
   ────────────────────────────────────────────────────────── */

interface BookCarouselProps {
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showDots?: boolean;
  useLocalImages?: boolean; // 是否使用本地构建期优化的封面
}

/* Cards visible on each side of the center, per breakpoint */
const VISIBLE_RADIUS_DESKTOP = 2;
const VISIBLE_RADIUS_MOBILE = 1;
/* Retry delay when the next card's cover hasn't loaded yet */
const NOT_READY_RETRY_MS = 400;

function cardStyle(offset: number, radius: number, isMobile: boolean): CSSProperties {
  const abs = Math.abs(offset);
  const hidden = abs > radius;
  const spacing = isMobile ? 0.9 : 1.15;
  const scale = abs === 0 ? 1.12 : abs === 1 ? 0.92 : 0.78;
  return {
    transform:
      `translate(-50%, -50%) translateX(calc(var(--book-w) * ${offset * spacing})) ` +
      `perspective(1000px) rotateY(${offset * 8}deg) scale(${hidden ? 0.7 : scale})`,
    opacity: hidden ? 0 : abs === 0 ? 1 : abs === 1 ? 0.85 : 0.55,
    zIndex: 10 - abs,
    pointerEvents: hidden ? 'none' : undefined,
  };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export default function BookCarousel({
  className = '',
  autoPlay = true,
  autoPlayInterval = 1000,
  showControls = true,
  showDots = true,
  useLocalImages = true,
}: BookCarouselProps) {
  // Only enable API hook when NOT using local images, to avoid wasted network requests
  const apiBooks = useBooksForCarousel(!useLocalImages);
  const localBooks = useLocalBooksForCarousel();
  const { books, loading, error, refresh, hasBooks, totalBooks } = useLocalImages ? localBooks : apiBooks;

  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay && !reducedMotion);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadedCovers, setLoadedCovers] = useState<ReadonlySet<string>>(() => new Set());
  const carouselRef = useRef<HTMLDivElement>(null);

  const total = books.length;
  const radius = isMobile ? VISIBLE_RADIUS_MOBILE : VISIBLE_RADIUS_DESKTOP;
  /* Render one extra (invisible) card per side so it is loaded before it slides in */
  const renderRadius = radius + 1;

  const coverUrl = useCallback(
    (book: Book) => (useLocalImages ? book.url : `/books/${book.filename}`),
    [useLocalImages]
  );

  const markLoaded = useCallback((filename: string) => {
    setLoadedCovers((prev) => {
      if (prev.has(filename)) return prev;
      const next = new Set(prev);
      next.add(filename);
      return next;
    });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setCurrentIndex(((index % total) + total) % total);
    },
    [total]
  );
  const next = useCallback(() => setCurrentIndex((i) => (total ? (i + 1) % total : 0)), [total]);
  const prev = useCallback(() => setCurrentIndex((i) => (total ? (i - 1 + total) % total : 0)), [total]);

  // 当书籍数量变化时，确保 currentIndex 在有效范围内
  useEffect(() => {
    if (total > 0 && currentIndex >= total) setCurrentIndex(0);
  }, [total, currentIndex]);

  useEffect(() => {
    if (reducedMotion) setIsPlaying(false);
  }, [reducedMotion]);

  /* ── Autoplay: advance only when the card about to enter view is loaded ── */
  const autoplayActive =
    // 切到其他标签页或滚出视口时照常轮播；仅在鼠标悬停 / 键盘聚焦时暂停，方便阅读与操作
    isPlaying && !isHovered && !hasFocusWithin && total > 1 && !loading;

  useEffect(() => {
    if (!autoplayActive) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const entering = books[(currentIndex + radius + 1) % total];
      if (entering && !loadedCovers.has(entering.filename)) {
        timer = setTimeout(tick, NOT_READY_RETRY_MS);
        return;
      }
      next();
    };
    timer = setTimeout(tick, autoPlayInterval);
    return () => clearTimeout(timer);
  }, [autoplayActive, autoPlayInterval, currentIndex, books, total, radius, loadedCovers, next]);

  /* ── Keyboard: scoped to the carousel, never global ── */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  /* Books within the render window, keyed by filename so they stay mounted */
  const windowBooks: { book: Book; index: number; offset: number }[] = [];
  if (total > 0) {
    const r = Math.min(renderRadius, Math.floor((total - 1) / 2));
    for (let o = -r; o <= r; o++) {
      const index = (currentIndex + o + total) % total;
      windowBooks.push({ book: books[index], index, offset: o });
    }
  }
  const current = total > 0 ? books[currentIndex] : null;

  const subtitle = loading
    ? '正在加载书籍...'
    : error
      ? '书籍数据加载失败，请尝试刷新'
      : hasBooks
        ? `从入门到精通，精心挑选的Go语言学习资源，当前共 ${totalBooks} 本书籍`
        : '暂无书籍数据';

  return (
    <div
      ref={carouselRef}
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/20 dark:border-gray-800/40',
        'bg-gradient-to-br from-white via-blue-50/80 to-purple-50/70',
        'dark:from-gray-800 dark:via-gray-900 dark:to-gray-800',
        'outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        className
      )}
      style={{ contain: 'layout paint' }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Go语言精选书籍"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={(e) => {
        // 仅键盘焦点（:focus-visible）暂停自动播放；鼠标点击按钮不应让播放停住
        if (e.target.matches(':focus-visible')) setHasFocusWithin(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasFocusWithin(false);
      }}
    >
      <div className="relative px-6 md:px-8 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Go语言精选书籍</h2>
            {!useLocalImages && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="刷新书籍列表"
                aria-label="刷新书籍列表"
              >
                <RefreshCwIcon className={clsx('w-5 h-5', isRefreshing && 'animate-spin')} />
              </button>
            )}
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* 书籍展示区域 — 固定高度，卡片绝对定位，只动画 transform / opacity */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-gray-600 dark:text-gray-300 text-center mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isRefreshing ? '刷新中...' : '重试'}
            </button>
          </div>
        ) : !loading && !hasBooks ? (
          <p className="py-20 text-center text-gray-600 dark:text-gray-300">暂无书籍数据</p>
        ) : (
          <div
            className="relative h-[220px] md:h-[270px] lg:h-[320px] [--book-w:8rem] md:[--book-w:10rem] lg:[--book-w:12rem]"
          >
            {/* 书架地面光影 — 静态，不参与动画 */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-6 rounded-full bg-amber-700/20 blur-lg" />

            {windowBooks.map(({ book, index, offset }) => {
              const isCenter = offset === 0;
              const isLoaded = loadedCovers.has(book.filename);
              return (
                <button
                  key={book.filename}
                  type="button"
                  tabIndex={isCenter ? 0 : -1}
                  aria-hidden={Math.abs(offset) > radius || undefined}
                  aria-label={isCenter ? `当前：${book.title}` : `切换到 ${book.title}`}
                  onClick={() => goTo(index)}
                  className={clsx(
                    'group absolute left-1/2 top-1/2 w-[var(--book-w)] aspect-[3/4] rounded-xl overflow-hidden',
                    'bg-gray-200 dark:bg-gray-700 shadow-xl',
                    'transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    isCenter ? 'ring-2 ring-blue-400/70 dark:ring-blue-500/70 cursor-default' : 'cursor-pointer'
                  )}
                  style={cardStyle(offset, radius, isMobile)}
                >
                  <img
                    src={coverUrl(book)}
                    alt={book.title}
                    width={192}
                    height={256}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                    onLoad={() => markLoaded(book.filename)}
                    onError={(e) => {
                      const target = e.currentTarget;
                      const original = `/books/${encodeURI(book.filename)}`;
                      if (!target.src.endsWith(original)) target.src = original;
                      else markLoaded(book.filename); // 不让一张坏图卡住自动播放
                    }}
                    className={clsx(
                      'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {/* 悬停显示书名 */}
                  <span className="absolute bottom-2 left-2 right-2 rounded bg-black/70 p-2 text-left text-xs text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="block font-medium truncate">{book.title}</span>
                  </span>
                </button>
              );
            })}

            {/* 左右切换 */}
            {showControls && total > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-3 md:p-4 bg-white/85 dark:bg-gray-800/85 text-gray-700 dark:text-gray-300 shadow-lg border border-white/30 dark:border-gray-700/40 transition-colors hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="上一本"
                >
                  <ChevronLeftIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-20 rounded-full p-3 md:p-4 bg-white/85 dark:bg-gray-800/85 text-gray-700 dark:text-gray-300 shadow-lg border border-white/30 dark:border-gray-700/40 transition-colors hover:bg-white dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="下一本"
                >
                  <ChevronRightIcon className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </>
            )}

            <span className="sr-only" aria-live={autoplayActive ? 'off' : 'polite'}>{current ? `第 ${currentIndex + 1} 本，共 ${total} 本：${current.title}` : ''}</span>
          </div>
        )}

        {/* 播放控制和圆点指示器 */}
        {hasBooks && !loading && (
          <div className="flex items-center justify-center mt-8 space-x-8">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={clsx(
                'bg-white/90 dark:bg-gray-800/90',
                'hover:bg-white dark:hover:bg-gray-800',
                'text-gray-700 dark:text-gray-300 rounded-full p-3 shadow-2xl',
                'transition-all duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'border border-white/30 dark:border-gray-700/30',
                'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
                'group relative overflow-hidden'
              )}
              aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
              <span
                className={clsx(
                  'absolute inset-0 bg-gradient-to-r from-go-500/20 to-primary-500/20 rounded-full transition-opacity duration-300',
                  isPlaying ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>

            {showDots && (
              <div className="flex flex-wrap justify-center gap-3">
                {books.map((book, index) => (
                  <button
                    key={book.filename}
                    onClick={() => goTo(index)}
                    aria-label={`跳转到第 ${index + 1} 本：${book.title}`}
                    aria-current={index === currentIndex || undefined}
                    className={clsx(
                      'relative w-3 h-3 rounded-full transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      index === currentIndex
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 scale-125 shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 hover:scale-110'
                    )}
                  >
                    {index === currentIndex && (
                      <>
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping opacity-50 motion-reduce:animate-none" />
                        <span className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasBooks && !loading && (
          <p className="text-center mt-5 text-sm text-gray-500 dark:text-gray-400">
            聚焦后可用 ← → 切换、空格暂停；点击两侧书籍直接切换
          </p>
        )}
      </div>
    </div>
  );
}
