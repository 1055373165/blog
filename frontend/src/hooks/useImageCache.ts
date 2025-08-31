import { useEffect, useCallback, useState } from 'react';

interface CacheStatus {
  total: number;
  expired: number;
  images: string[];
}

interface ImageCacheManager {
  isSupported: boolean;
  isRegistered: boolean;
  cacheStatus: CacheStatus | null;
  clearCache: () => Promise<boolean>;
  getCacheStatus: () => Promise<CacheStatus>;
  register: () => Promise<boolean>;
}

/**
 * 图片缓存管理 Hook
 * 使用 Service Worker 实现图片的持久化缓存
 */
export function useImageCache(): ImageCacheManager {
  const [isSupported] = useState(() => 'serviceWorker' in navigator);
  const [isRegistered, setIsRegistered] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  // 注册 Service Worker
  const register = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('浏览器不支持 Service Worker');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-image-cache.js');
      
      if (registration.installing) {
        console.log('Service Worker 安装中...');
      } else if (registration.waiting) {
        console.log('Service Worker 等待激活...');
      } else if (registration.active) {
        console.log('Service Worker 已激活');
      }

      // 监听状态变化
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              setIsRegistered(true);
              console.log('图片缓存 Service Worker 已就绪');
            }
          });
        }
      });

      setIsRegistered(true);
      return true;
    } catch (error) {
      console.error('Service Worker 注册失败:', error);
      return false;
    }
  }, [isSupported]);

  // 清理缓存
  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isRegistered) {
      return false;
    }

    try {
      const serviceWorker = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const success = event.data.success;
          if (success) {
            setCacheStatus(null);
            console.log('图片缓存已清理');
          }
          resolve(success);
        };

        serviceWorker.active?.postMessage(
          { type: 'CLEAR_IMAGE_CACHE' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('清理缓存失败:', error);
      return false;
    }
  }, [isSupported, isRegistered]);

  // 获取缓存状态
  const getCacheStatus = useCallback(async (): Promise<CacheStatus> => {
    if (!isSupported || !isRegistered) {
      return { total: 0, expired: 0, images: [] };
    }

    try {
      const serviceWorker = await navigator.serviceWorker.ready;
      
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          const status = event.data as CacheStatus;
          setCacheStatus(status);
          resolve(status);
        };

        serviceWorker.active?.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      });
    } catch (error) {
      console.error('获取缓存状态失败:', error);
      return { total: 0, expired: 0, images: [] };
    }
  }, [isSupported, isRegistered]);

  // 自动注册 Service Worker
  useEffect(() => {
    if (isSupported && !isRegistered) {
      register();
    }
  }, [isSupported, isRegistered, register]);

  // 定期更新缓存状态
  useEffect(() => {
    if (!isRegistered) return;

    let intervalId: NodeJS.Timeout;

    const updateCacheStatus = async () => {
      try {
        await getCacheStatus();
      } catch (error) {
        console.error('更新缓存状态失败:', error);
      }
    };

    // 立即执行一次
    updateCacheStatus();
    
    // 每5分钟更新一次缓存状态
    intervalId = setInterval(updateCacheStatus, 5 * 60 * 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRegistered, getCacheStatus]);

  return {
    isSupported,
    isRegistered,
    cacheStatus,
    clearCache,
    getCacheStatus,
    register
  };
}

// 导出类型
export type { CacheStatus, ImageCacheManager };