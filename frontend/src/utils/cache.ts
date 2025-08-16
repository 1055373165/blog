/**
 * 简单的内存缓存工具
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 数据
   * @param ttl 过期时间（毫秒），默认5分钟
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiry: now + ttl
    };
    this.cache.set(key, item);
    
    console.log(`缓存设置: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      console.log(`缓存未命中: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now > item.expiry) {
      console.log(`缓存已过期: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`缓存命中: ${key}`);
    return item.data as T;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      console.log(`缓存删除: ${key}`);
    }
    return result;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('所有缓存已清空');
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { totalItems: number; items: Array<{ key: string; size: number; ttl: number }> } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      size: JSON.stringify(item.data).length,
      ttl: Math.max(0, item.expiry - Date.now())
    }));

    return {
      totalItems: this.cache.size,
      items
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`清理过期缓存: ${expiredKeys.length} 个项目`);
    }
  }
}

// 创建全局缓存实例
export const memoryCache = new MemoryCache();

// 定期清理过期缓存
setInterval(() => {
  memoryCache.cleanup();
}, 60 * 1000); // 每分钟清理一次

/**
 * LocalStorage 持久化缓存工具
 */
class PersistentCache {
  private prefix = 'blog_cache_';

  /**
   * 设置持久化缓存
   * @param key 缓存键
   * @param data 数据
   * @param ttl 过期时间（毫秒），默认1小时
   */
  set<T>(key: string, data: T, ttl: number = 60 * 60 * 1000): void {
    try {
      const now = Date.now();
      const item: CacheItem<T> = {
        data,
        timestamp: now,
        expiry: now + ttl
      };
      
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      console.log(`持久化缓存设置: ${key}, TTL: ${ttl}ms`);
    } catch (error) {
      console.error('设置持久化缓存失败:', error);
    }
  }

  /**
   * 获取持久化缓存
   * @param key 缓存键
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) {
        console.log(`持久化缓存未命中: ${key}`);
        return null;
      }

      const item: CacheItem<T> = JSON.parse(raw);
      const now = Date.now();

      if (now > item.expiry) {
        console.log(`持久化缓存已过期: ${key}`);
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      console.log(`持久化缓存命中: ${key}`);
      return item.data;
    } catch (error) {
      console.error('获取持久化缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除持久化缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
      console.log(`持久化缓存删除: ${key}`);
    } catch (error) {
      console.error('删除持久化缓存失败:', error);
    }
  }

  /**
   * 清空所有持久化缓存
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
      console.log(`清空所有持久化缓存: ${keys.length} 个项目`);
    } catch (error) {
      console.error('清空持久化缓存失败:', error);
    }
  }

  /**
   * 检查持久化缓存是否存在且未过期
   * @param key 缓存键
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// 创建持久化缓存实例
export const persistentCache = new PersistentCache();

/**
 * 缓存装饰器 - 用于自动缓存函数结果
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    key: (args: Parameters<T>) => string;
    ttl?: number;
    persistent?: boolean;
  }
): T {
  const cache = options.persistent ? persistentCache : memoryCache;
  const ttl = options.ttl || 5 * 60 * 1000; // 默认5分钟

  return (async (...args: Parameters<T>) => {
    const cacheKey = options.key(args);
    
    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 执行原函数
    try {
      const result = await fn(...args);
      // 缓存结果
      cache.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      // 不缓存错误结果
      throw error;
    }
  }) as T;
}

/**
 * 缓存键生成工具
 */
export const cacheKeys = {
  books: () => 'books_list',
  bookMetadata: (filename: string) => `book_metadata_${filename}`,
  imageAccessibility: (url: string) => `image_access_${url}`,
};