import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

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

// 图片格式优化：根据浏览器支持自动选择最佳格式
const getOptimizedSrc = (src: string, format?: 'webp' | 'jpg' | 'png' | 'auto', quality = 85) => {
  // 如果是外部链接，直接返回
  if (src.startsWith('http')) return src;
  
  // 暂时禁用WebP转换，直接返回原始路径
  // 简单的图片优化策略，实际项目中可以接入图片处理服务
  return src;
};

// 懒加载 Hook
const useImageLazyLoading = (priority: boolean = false, threshold = 0.1) => {
  const [inView, setInView] = useState(priority); // 优先级图片立即加载
  const [hasLoaded, setHasLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold, 
        rootMargin: '200px' // 扩大预加载范围，确保轮播图中的图片能及时加载
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, threshold, hasLoaded]);

  const handleLoad = useCallback(() => {
    setHasLoaded(true);
  }, []);

  return { inView, imgRef, hasLoaded, handleLoad };
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
  aspectRatio,
  quality = 85,
  format = 'auto'
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  const { inView, imgRef, hasLoaded, handleLoad } = useImageLazyLoading(priority);
  const stableDimensions = useLayoutStability(aspectRatio, width, height);
  
  const optimizedSrc = getOptimizedSrc(src, format, quality);

  const handleImageLoad = useCallback(() => {
    console.log(`图片加载成功: ${src}`);
    setLoaded(true);
    handleLoad();
    onLoad?.();
  }, [handleLoad, onLoad, src]);

  const handleImageError = useCallback(() => {
    console.error(`图片加载失败: ${src}`);
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
      
      {/* 实际图片 */}
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
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            // 确保图片尺寸稳定
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
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
      
      {/* 加载指示器 */}
      {inView && !loaded && !error && placeholder !== 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// 导出类型供其他组件使用
export type { OptimizedImageProps };