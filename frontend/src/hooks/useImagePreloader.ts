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
  /** Singleflight: reuse the same promise for concurrent requests */
  promise?: Promise<HTMLImageElement>;
}

// 全局图片缓存
const imageCache = new Map<string, ImageCache>();

/**
 * 智能图片预加载 Hook
 * 根据当前索引预加载附近的图片，提升用户体验
 *
 * Singleflight: concurrent calls for the same URL share one in-flight request.
 * Incremental: only NEW urls (not already loaded/loading) trigger network requests.
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

  // 预加载单个图片 — singleflight: returns existing promise if already in-flight
  const preloadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    const cached = imageCache.get(url);

    // Already loaded — resolve immediately
    if (cached?.loaded && cached.element) {
      return Promise.resolve(cached.element);
    }

    // Already loading — return the SAME promise (singleflight)
    if (cached?.loading && cached.promise) {
      return cached.promise;
    }

    // New request — create Image and cache the promise
    const img = new Image();
    const cacheEntry: ImageCache = {
      url,
      loaded: false,
      loading: true,
      error: false,
      element: img,
    };

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
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
      img.src = url;
    });

    cacheEntry.promise = promise;
    imageCache.set(url, cacheEntry);
    return promise;
  }, []);

  // 批量预加载图片 — only submits truly new URLs (incremental)
  const preloadImages = useCallback(async (urls: string[]) => {
    if (!enabled || urls.length === 0) return;

    // Filter to only URLs that need a NEW load (incremental)
    const newUrls = urls.filter(url => {
      const cached = imageCache.get(url);
      return !cached || (!cached.loaded && !cached.loading);
    });

    if (newUrls.length === 0) return; // nothing new to load

    const results = await Promise.allSettled(
      newUrls.map(url => preloadImage(url))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`预加载完成: ${successful} 张成功，${failed} 张失败 (跳过 ${urls.length - newUrls.length} 张已缓存)`);
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
      const nextIndex = (current + i) % total;
      indices.add(nextIndex);
      const prevIndex = (current - i + total) % total;
      indices.add(prevIndex);
    }

    return Array.from(indices).sort((a, b) => {
      const distA = Math.min(Math.abs(a - current), total - Math.abs(a - current));
      const distB = Math.min(Math.abs(b - current), total - Math.abs(b - current));
      return distA - distB;
    });
  }, []);

  // 主预加载逻辑
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(() => {
      const indicesToLoad = getPreloadIndices(currentIndex, imageUrls.length, preloadRange);
      const urlsToLoad = indicesToLoad.map(index => imageUrls[index]).filter(Boolean);
      preloadImages(urlsToLoad);
    }, delay);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentIndex, imageUrls, preloadRange, delay, enabled, getPreloadIndices, preloadImages]);

  const isImageCached = useCallback((url: string): boolean => {
    const cached = imageCache.get(url);
    return Boolean(cached?.loaded);
  }, []);

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

  const clearCache = useCallback(() => {
    imageCache.clear();
  }, []);

  return {
    isImageCached,
    getCacheStatus,
    clearCache,
    preloadImage
  };
}