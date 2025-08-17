import { useEffect, useRef, useState, useMemo } from 'react';
import { Quote, ViewMode } from '../types';

// 性能监控Hook - 彻底修复无限渲染问题
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  const mountTimeRef = useRef(Date.now());
  
  // 使用静态值而不是状态，避免触发重新渲染
  const metricsRef = useRef({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderDuration: 0,
  });

  // 每次渲染时更新计数，但不触发状态更新
  renderCountRef.current += 1;
  const currentTime = Date.now();
  const renderDuration = currentTime - lastUpdateTimeRef.current;
  lastUpdateTimeRef.current = currentTime;

  // 更新metrics ref，但不触发重新渲染
  metricsRef.current = {
    renderCount: renderCountRef.current,
    averageRenderTime: metricsRef.current.renderCount > 0
      ? (metricsRef.current.averageRenderTime * (metricsRef.current.renderCount - 1) + renderDuration) / metricsRef.current.renderCount
      : renderDuration,
    lastRenderDuration: renderDuration,
  };

  // 开发环境下的性能警告（仅在必要时，避免触发额外渲染）
  if (process.env.NODE_ENV === 'development') {
    if (renderDuration > 100) {
      console.warn(`${componentName} render took ${renderDuration}ms, consider optimization`);
    }
    if (renderCountRef.current > 100 && renderCountRef.current % 50 === 0) {
      console.warn(`${componentName} has rendered ${renderCountRef.current} times - possible infinite render loop`);
    }
  }

  // 返回当前metrics的快照，而不是响应式状态
  return {
    renderCount: renderCountRef.current,
    averageRenderTime: metricsRef.current.averageRenderTime,
    lastRenderDuration: renderDuration,
  };
}

// 智能分批渲染Hook
export function useBatchRendering<T>(
  items: T[],
  batchSize: number = 20,
  delay: number = 50
) {
  const [renderedItems, setRenderedItems] = useState<T[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (items.length === 0) {
      setRenderedItems([]);
      return;
    }

    setIsRendering(true);
    setRenderedItems(items.slice(0, batchSize));

    const renderNextBatch = (startIndex: number) => {
      if (startIndex >= items.length) {
        setIsRendering(false);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        const nextBatch = items.slice(0, startIndex + batchSize);
        setRenderedItems(nextBatch);
        
        if (nextBatch.length < items.length) {
          renderNextBatch(startIndex + batchSize);
        } else {
          setIsRendering(false);
        }
      }, delay);
    };

    if (items.length > batchSize) {
      renderNextBatch(batchSize);
    } else {
      setIsRendering(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [items, batchSize, delay]);

  return { renderedItems, isRendering };
}

// 智能视图模式选择Hook（基于数据量自动优化）
export function useOptimalViewMode(
  quotes: Quote[],
  currentViewMode: ViewMode,
  userPreference?: ViewMode
): ViewMode {
  return useMemo(() => {
    // 如果用户有明确偏好，优先使用用户偏好
    if (userPreference) {
      return userPreference;
    }

    const quoteCount = quotes.length;

    // 基于数据量智能选择最优视图模式
    if (quoteCount <= 20) {
      // 少量数据：使用详细视图展示更多信息
      return 'detailed';
    } else if (quoteCount <= 50) {
      // 中等数据量：使用网格视图平衡信息密度
      return 'grid';
    } else if (quoteCount <= 80) {
      // 较大数据量：使用列表视图提高浏览效率
      return 'list';
    } else {
      // 大量数据：使用瀑布流提供最佳性能
      return 'masonry';
    }
  }, [quotes.length, userPreference]);
}

// 内存优化Hook
export function useMemoryOptimization<T>(
  data: T[],
  keySelector: (item: T) => string,
  maxCacheSize: number = 100
) {
  const cacheRef = useRef(new Map<string, T>());
  const accessOrderRef = useRef<string[]>([]);

  return useMemo(() => {
    const cache = cacheRef.current;
    const accessOrder = accessOrderRef.current;

    // 清理超出缓存大小的项目
    while (accessOrder.length > maxCacheSize) {
      const oldestKey = accessOrder.shift();
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    // 更新缓存
    data.forEach(item => {
      const key = keySelector(item);
      if (!cache.has(key)) {
        cache.set(key, item);
        accessOrder.push(key);
      }
    });

    return Array.from(cache.values());
  }, [data, keySelector, maxCacheSize]);
}


// 滚动性能优化Hook
export function useScrollOptimization() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return { isScrolling };
}