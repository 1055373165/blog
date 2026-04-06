import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { getThumbnailUrl } from '../../utils/imageUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // LCP 关键图片，优先加载
  sizes?: string; // 响应式尺寸
  placeholder?: 'blur' | 'empty' | 'skeleton';
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string; // 宽高比，如 "16/9", "4/3"
  quality?: number; // 图片质量，1-100
  format?: 'webp' | 'jpg' | 'png' | 'auto';
}

// 图片格式优化与URL规范化：
// - 保留外部链接 (http/https、协议相对 //)、data:、blob:
// - 对于相对路径，规范化为以根路径开头，避免在诸如 /article/slug 等嵌套路由下解析成 /article/uploads/... 导致404
const getOptimizedSrc = (src: string) => {
  if (!src) return src;

  const trimmed = src.trim();

  // 外部或内联资源，直接返回
  if (/^(?:https?:)?\/\//i.test(trimmed)) return trimmed; // http(s) 或协议相对
  if (/^(?:data:|blob:)/i.test(trimmed)) return trimmed;    // data: / blob:

  // 统一路径分隔符，移除多余的前缀斜杠
  const normalized = trimmed.replace(/\\/g, '/').replace(/^(\.\/)+/, '');

  // 已是根路径
  if (normalized.startsWith('/')) return normalized;

  // 补充根路径前缀，保证 URL 在任意路由下行为一致
  return `/${normalized.replace(/^\/+/, '')}`;
};

// 智能懒加载 Hook
const useImageLazyLoading = (priority: boolean = false, threshold = 0.1) => {
  const [inView, setInView] = useState(priority); // 优先级图片立即加载
  const [hasLoaded, setHasLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 优先级图片或已加载的图片不需要懒加载
    if (priority || hasLoaded) {
      if (priority && !inView) {
        setInView(true);
      }
      return;
    }

    // 使用 requestIdleCallback 优化性能
    const setupObserver = () => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        },
        { 
          threshold, 
          rootMargin: priority ? '0px' : '100px' // 增大预加载边距，确保首页图片能及时加载
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return observer;
    };

    let observer: IntersectionObserver;
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        observer = setupObserver();
      });
    } else {
      // fallback for browsers without requestIdleCallback
      setTimeout(() => {
        observer = setupObserver();
      }, 0);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [priority, threshold, hasLoaded, inView]);

  const handleLoad = useCallback(() => {
    setHasLoaded(true);
  }, []);

  return { inView, imgRef, handleLoad };
};

// 布局稳定性 Hook - 防止 CLS
const useLayoutStability = (aspectRatio?: string, width?: number, height?: number) => {
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});

  useEffect(() => {
    if (width && height) {
      setDimensions({ width, height });
    } else if (aspectRatio) {
      const [w, h] = aspectRatio.split('/').map(Number);
      if (w && h) {
        // 基于容器宽度计算高度
        setDimensions({ 
          width: width || undefined,
          height: width ? (width * h) / w : undefined 
        });
      }
    }
  }, [aspectRatio, width, height]);

  return dimensions;
};

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes = '100vw',
  placeholder = 'skeleton',
  onLoad,
  onError,
  aspectRatio
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);

  const { inView, imgRef, handleLoad } = useImageLazyLoading(priority);
  const stableDimensions = useLayoutStability(aspectRatio, width, height);

  const optimizedSrc = getOptimizedSrc(src);

  // Auto-derive thumbnail URL for cover images
  const thumbnailSrc = useMemo(() => {
    if (!src) return null;
    return getThumbnailUrl(src);
  }, [src]);

  const handleImageLoad = useCallback(() => {
    console.log(`✅ 图片加载成功: ${src}`);
    setLoaded(true);
    handleLoad();
    onLoad?.();
  }, [handleLoad, onLoad, src]);

  const handleImageError = useCallback(() => {
    console.error(`❌ 图片加载失败: ${src}`);
    setError(true);
    onError?.();
  }, [onError, src]);

  // 骨架屏样式
  const skeletonClasses = clsx(
    'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    'animate-pulse bg-[length:200%_100%] bg-[position:0%_50%]',
    'animate-[shimmer_1.5s_ease-in-out_infinite]'
  );

  // 占位符内容
  const renderPlaceholder = () => {
    if (placeholder === 'empty') return null;
    
    if (placeholder === 'skeleton') {
      return (
        <div 
          className={clsx(skeletonClasses, 'absolute inset-0 rounded')}
          aria-hidden="true"
        />
      );
    }
    
    return null;
  };

  // 容器样式
  const containerStyle = {
    width: stableDimensions.width,
    height: stableDimensions.height,
    aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined)
  };

  return (
    <div 
      className={clsx(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        className
      )}
      style={containerStyle}
    >
      {/* 占位符 */}
      {!loaded && renderPlaceholder()}
      {/* 懒加载哨兵：在图片未进入视口前提供观察目标，避免因 <img> 未渲染而无法触发 IntersectionObserver */}
      {!inView && (
        <div ref={imgRef} className="absolute inset-0" aria-hidden="true" />
      )}
      
      {/* 缩略图层 - 快速加载，作为占位 */}
      {inView && !error && thumbnailSrc && !loaded && (
        <img
          src={getOptimizedSrc(thumbnailSrc)}
          alt=""
          decoding="async"
          className={clsx(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            thumbnailLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setThumbnailLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* 高清原图层 - 后台加载，加载完成后替换缩略图 */}
      {inView && !error && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={clsx(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      
      
      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 bg-black/50 text-white text-xs p-1 rounded">
          {inView ? (loaded ? '✓' : '...') : '👁'}
        </div>
      )}
      
      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                clipRule="evenodd" 
              />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      )}
      
      {/* 加载指示器 - 缩略图加载后不再显示 */}
      {inView && !loaded && !thumbnailLoaded && !error && placeholder !== 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// 导出类型供其他组件使用
export type { OptimizedImageProps };