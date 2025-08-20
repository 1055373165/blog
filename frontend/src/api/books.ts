import { apiClient } from './client';
import { memoryCache, persistentCache, cached, cacheKeys } from '../utils/cache';
import type { ApiResponse } from '../types';

export interface Book {
  id: string;
  filename: string;
  title: string;
  description: string;
  detailed_description?: string; // 新增：详细描述
  category?: string;             // 新增：分类
  difficulty?: string;           // 新增：难度等级
  tags?: string[];               // 新增：标签
  author?: string;               // 新增：作者
  url: string;
  created_at: string;
}

export interface BookMetadata extends Book {
  size: number;
  extension: string;
}

/**
 * 获取所有书籍列表（内部实现，不使用缓存）
 */
const _getBooks = async (): Promise<Book[]> => {
  try {
    console.log('正在从API获取书籍列表...');
    const response = await apiClient.get<Book[]>('/api/books');
    
    if (!response.success) {
      throw new Error(response.message || '获取书籍列表失败');
    }
    
    console.log(`API返回 ${response.data.length} 本书籍`);
    return response.data;
  } catch (error) {
    console.error('获取书籍列表失败:', error);
    throw error;
  }
};

/**
 * 获取所有书籍列表（带缓存）
 */
export const getBooks = cached(_getBooks, {
  key: () => cacheKeys.books(),
  ttl: 3 * 60 * 1000, // 3分钟缓存
  persistent: false // 使用内存缓存，页面刷新后重新获取
});

/**
 * 刷新书籍缓存
 */
export const refreshBooks = async (): Promise<Book[]> => {
  try {
    console.log('清除书籍缓存并重新获取...');
    // 清除相关缓存
    memoryCache.delete(cacheKeys.books());
    
    // 重新获取数据
    const books = await _getBooks();
    
    // 手动设置缓存
    memoryCache.set(cacheKeys.books(), books, 3 * 60 * 1000);
    
    return books;
  } catch (error) {
    console.error('刷新书籍缓存失败:', error);
    throw error;
  }
};

/**
 * 获取书籍元数据（内部实现）
 */
const _getBookMetadata = async (filename: string): Promise<BookMetadata> => {
  try {
    const response = await apiClient.get<BookMetadata>(`/api/books/metadata/${encodeURIComponent(filename)}`);
    
    if (!response.success) {
      throw new Error('获取书籍元数据失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('获取书籍元数据失败:', error);
    throw error;
  }
};

/**
 * 获取书籍元数据（带缓存）
 */
export const getBookMetadata = cached(_getBookMetadata, {
  key: ([filename]) => cacheKeys.bookMetadata(filename),
  ttl: 10 * 60 * 1000, // 10分钟缓存
  persistent: true // 使用持久化缓存
});

/**
 * 检查图片是否可访问（内部实现）
 */
const _checkImageAccessibility = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    const timeout = setTimeout(() => {
      console.warn(`图片加载超时: ${url}`);
      resolve(false);
    }, 5000); // 5秒超时
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`图片加载成功: ${url}`);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.warn(`图片加载失败: ${url}`);
      resolve(false);
    };
    
    img.src = url;
  });
};

/**
 * 检查图片是否可访问（带缓存）
 */
export const checkImageAccessibility = cached(_checkImageAccessibility, {
  key: ([url]) => cacheKeys.imageAccessibility(url),
  ttl: 30 * 60 * 1000, // 30分钟缓存
  persistent: true // 使用持久化缓存
});

/**
 * 批量检查图片可访问性
 */
export const batchCheckImageAccessibility = async (books: Book[]): Promise<Book[]> => {
  const results = await Promise.allSettled(
    books.map(async (book) => {
      const isAccessible = await checkImageAccessibility(book.url);
      return { ...book, isAccessible };
    })
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<Book & { isAccessible: boolean }> => 
      result.status === 'fulfilled' && result.value.isAccessible
    )
    .map(result => result.value);
};