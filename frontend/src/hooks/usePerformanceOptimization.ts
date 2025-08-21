import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderDuration: number;
  averageRenderTime: number;
  memoryUsage: number;
  isVisible: boolean;
}

// 性能监控Hook
export const usePerformanceMonitor = (componentName: string): PerformanceMetrics => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderDuration: 0,
    averageRenderTime: 0,
    memoryUsage: 0,
    isVisible: true
  });

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);

  useEffect(() => {
    lastRenderStartRef.current = performance.now();
    renderCountRef.current += 1;

    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - lastRenderStartRef.current;
    
    renderTimesRef.current.push(renderDuration);
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }

    const averageTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;

    setMetrics(prev => ({
      ...prev,
      renderCount: renderCountRef.current,
      lastRenderDuration: Math.round(renderDuration * 100) / 100,
      averageRenderTime: Math.round(averageTime * 100) / 100
    }));
  });

  useEffect(() => {
    // 监控内存使用（如果支持）
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
};

// 虚拟滚动Hook
export const useVirtualScroll = <T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    if (!containerRef) return;

    containerRef.addEventListener('scroll', handleScroll, { passive: true });
    return () => containerRef.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setContainerRef
  };
};

// 图片懒加载Hook
export const useLazyImage = (src: string, threshold: number = 0.1) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, threshold]);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsError(true);
    img.src = imageSrc;
  }, [imageSrc]);

  return { imgRef, imageSrc, isLoaded, isError };
};

// 防抖Hook
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// 节流Hook
export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    
    if (now - lastExecuted.current >= delay) {
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - (now - lastExecuted.current));

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
};

// 网络状态监控Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = useState<string>('4g');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监控网络连接类型（如果支持）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setEffectiveType(connection.effectiveType || '4g');

      const handleConnectionChange = () => {
        setEffectiveType(connection.effectiveType || '4g');
      };

      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, effectiveType };
};

// 页面可见性Hook
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
};

// 批处理更新Hook
export const useBatchedUpdates = <T>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((update: Partial<T>) => {
    pendingUpdatesRef.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = { ...prevState };
        
        pendingUpdatesRef.current.forEach(update => {
          newState = { ...newState, ...update };
        });

        pendingUpdatesRef.current = [];
        return newState;
      });
    }, 16); // 约60fps

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};

export default {
  usePerformanceMonitor,
  useVirtualScroll,
  useLazyImage,
  useDebounce,
  useThrottle,
  useNetworkStatus,
  usePageVisibility,
  useBatchedUpdates
};