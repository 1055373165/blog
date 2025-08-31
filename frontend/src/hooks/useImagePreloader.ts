import { useEffect, useCallback, useRef } from 'react';

interface ImagePreloaderOptions {
  /** 预加载的图片数量（当前位置前后各几张） */
  preloadRange?: number;
  /** 预加载延迟时间（毫秒） */
  delay?: number;
  /** 是否启用预加载 */
  enabled?: boolean;
}

interface ImageCache {
  url: string;
  loaded: boolean;
  loading: boolean;
  error: boolean;
  element?: HTMLImageElement;
}

// 全局图片缓存
const imageCache = new Map<string, ImageCache>();

/**
 * 智能图片预加载 Hook
 * 根据当前索引预加载附近的图片，提升用户体验
 */
export function useImagePreloader(
  imageUrls: string[],
  currentIndex: number,
  options: ImagePreloaderOptions = {}
) {
  const {
    preloadRange = 2,
    delay = 100,
    enabled = true
  } = options;

  const preloadTimeoutRef = useRef<NodeJS.Timeout>();

  // 预加载单个图片
  const preloadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // 检查缓存
      const cached = imageCache.get(url);
      if (cached?.loaded && cached.element) {
        resolve(cached.element);
        return;
      }

      if (cached?.loading) {
        // 如果正在加载，等待完成
        const checkLoading = () => {
          const current = imageCache.get(url);
          if (current?.loaded && current.element) {
            resolve(current.element);
          } else if (current?.error) {
            reject(new Error(`Failed to load image: ${url}`));
          } else if (current?.loading) {
            setTimeout(checkLoading, 50);
          }
        };
        checkLoading();
        return;
      }

      // 创建新的图片加载
      const img = new Image();
      const cacheEntry: ImageCache = {
        url,
        loaded: false,
        loading: true,
        error: false,
        element: img
      };
      
      imageCache.set(url, cacheEntry);

      img.onload = () => {
        cacheEntry.loaded = true;
        cacheEntry.loading = false;
        console.log(`预加载成功: ${url}`);
        resolve(img);
      };

      img.onerror = () => {
        cacheEntry.error = true;
        cacheEntry.loading = false;
        console.error(`预加载失败: ${url}`);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // 开始加载
      img.src = url;
    });
  }, []);

  // 批量预加载图片
  const preloadImages = useCallback(async (urls: string[]) => {
    if (!enabled || urls.length === 0) return;

    try {
      // 使用 Promise.allSettled 避免单个图片失败影响整体预加载
      const results = await Promise.allSettled(
        urls.map(url => preloadImage(url))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        console.log(`预加载完成: ${successful} 张成功，${failed} 张失败`);
      }
    } catch (error) {
      console.error('批量预加载失败:', error);
    }
  }, [enabled, preloadImage]);

  // 获取需要预加载的图片索引
  const getPreloadIndices = useCallback((
    current: number,
    total: number,
    range: number
  ): number[] => {
    if (total === 0) return [];

    const indices = new Set<number>();
    
    // 添加当前图片（最高优先级）
    indices.add(current);
    
    // 添加前后范围内的图片
    for (let i = 1; i <= range; i++) {
      // 后面的图片
      const nextIndex = (current + i) % total;
      indices.add(nextIndex);
      
      // 前面的图片
      const prevIndex = (current - i + total) % total;
      indices.add(prevIndex);
    }

    return Array.from(indices).sort((a, b) => {
      // 按距离当前索引的远近排序
      const distA = Math.min(Math.abs(a - current), total - Math.abs(a - current));
      const distB = Math.min(Math.abs(b - current), total - Math.abs(b - current));
      return distA - distB;
    });
  }, []);

  // 主预加载逻辑
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    // 清除之前的预加载任务
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // 延迟预加载，避免阻塞主线程
    preloadTimeoutRef.current = setTimeout(() => {
      const indicesToLoad = getPreloadIndices(currentIndex, imageUrls.length, preloadRange);
      const urlsToLoad = indicesToLoad.map(index => imageUrls[index]).filter(Boolean);
      
      console.log(`开始预加载: 当前索引 ${currentIndex}, 预加载范围 ${preloadRange}, 目标图片:`, urlsToLoad);
      preloadImages(urlsToLoad);
    }, delay);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentIndex, imageUrls, preloadRange, delay, enabled, getPreloadIndices, preloadImages]);

  // 检查图片是否已缓存
  const isImageCached = useCallback((url: string): boolean => {
    const cached = imageCache.get(url);
    return Boolean(cached?.loaded);
  }, []);

  // 获取缓存状态
  const getCacheStatus = useCallback(() => {
    const total = imageUrls.length;
    const cached = imageUrls.filter(url => isImageCached(url)).length;
    const loading = Array.from(imageCache.values()).filter(c => c.loading).length;
    
    return {
      total,
      cached,
      loading,
      cacheRatio: total > 0 ? cached / total : 0
    };
  }, [imageUrls, isImageCached]);

  // 清理缓存
  const clearCache = useCallback(() => {
    imageCache.clear();
    console.log('图片缓存已清理');
  }, []);

  return {
    isImageCached,
    getCacheStatus,
    clearCache,
    preloadImage
  };
}