import { useState, useEffect, useCallback } from 'react';
import { getBooks, Book, batchCheckImageAccessibility } from '../api/books';

export interface UseBooksOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableImageCheck?: boolean;
  enabled?: boolean; // When false, skip all API calls and image checks
}

export interface UseBooksReturn {
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasBooks: boolean;
  totalBooks: number;
}

/**
 * 自定义Hook用于管理书籍数据
 */
export const useBooks = (options: UseBooksOptions = {}): UseBooksReturn => {
  const {
    autoRefresh = false,
    refreshInterval = 5000, // 5秒
    enableImageCheck = true,
    enabled = true,
  } = options;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);

      console.log('正在获取书籍数据...');
      const booksData = await getBooks();
      console.log(`成功获取 ${booksData.length} 本书籍`);

      let processedBooks = booksData;

      // 如果启用图片检查，验证图片可访问性
      if (enableImageCheck && booksData.length > 0) {
        console.log('正在检查图片可访问性...');
        processedBooks = await batchCheckImageAccessibility(booksData);
        console.log(`可访问的图片数量: ${processedBooks.length}`);
      }

      setBooks(processedBooks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取书籍数据失败';
      console.error('获取书籍数据失败:', err);
      setError(errorMessage);

      // 如果API失败，使用空数组作为fallback
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [enableImageCheck, enabled]);

  const refresh = useCallback(async () => {
    await fetchBooks();
  }, [fetchBooks]);

  // 初始加载
  useEffect(() => {
    if (!enabled) return;
    fetchBooks();
  }, [fetchBooks, enabled]);

  // 自动刷新
  useEffect(() => {
    if (!enabled || !autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      console.log('自动刷新书籍数据...');
      fetchBooks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBooks, enabled]);

  return {
    books,
    loading,
    error,
    refresh,
    hasBooks: books.length > 0,
    totalBooks: books.length,
  };
};

/**
 * 用于轮播组件的优化Hook
 * @param enabled - When false, skip API calls entirely (e.g. when using local images)
 */
export const useBooksForCarousel = (enabled: boolean = true): UseBooksReturn => {
  return useBooks({
    autoRefresh: false,
    enableImageCheck: true,
    enabled,
  });
};