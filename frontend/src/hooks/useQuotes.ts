import { useState, useEffect, useMemo, useCallback } from 'react';
import { Quote, QuoteFilters } from '../types';
import { quotesData } from '../data/quotes';

interface UseQuotesReturn {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  retryCount: number;
  hasMore: boolean;
}

export function useQuotes(filters: QuoteFilters = {}): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // 优化的过滤函数，使用useCallback缓存结果
  const filterQuotes = useCallback((allQuotes: Quote[], filters: QuoteFilters): Quote[] => {
    // 如果没有过滤条件，直接返回所有数据
    if (!filters.search && !filters.category && !filters.difficulty && (!filters.tags || filters.tags.length === 0)) {
      return allQuotes;
    }
    
    // 预处理搜索条件
    const searchLower = filters.search?.toLowerCase();
    
    return allQuotes.filter(quote => {
      // 搜索过滤 - 优化性能
      if (searchLower) {
        const matchesSearch = 
          quote.text.toLowerCase().includes(searchLower) ||
          quote.author.toLowerCase().includes(searchLower) ||
          quote.tags.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // 分类过滤
      if (filters.category && quote.category !== filters.category) {
        return false;
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          quote.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // 难度过滤
      if (filters.difficulty && quote.difficulty !== filters.difficulty) {
        return false;
      }

      return true;
    });
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 模拟API调用延迟（减少延迟以提升搜索体验）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 模拟随机网络错误（开发模式下5%概率）
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      
      // 数据验证
      if (!quotesData || !Array.isArray(quotesData)) {
        throw new Error('箴言数据格式错误');
      }
      
      // 检查数据完整性
      const validQuotes = quotesData.filter(quote => {
        return quote && 
               typeof quote.id === 'string' && 
               typeof quote.text === 'string' && 
               typeof quote.author === 'string' && 
               Array.isArray(quote.tags);
      });
      
      if (validQuotes.length === 0) {
        throw new Error('没有找到有效的箴言数据');
      }
      
      const filteredQuotes = filterQuotes(validQuotes, filters);
      setQuotes(filteredQuotes);
      setHasMore(filteredQuotes.length < validQuotes.length);
      setRetryCount(0); // 成功后重置重试计数
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取箴言失败';
      
      // 根据重试次数调整错误信息
      if (retryCount > 0) {
        setError(`${errorMessage}（已重试 ${retryCount} 次）`);
      } else {
        setError(errorMessage);
      }
      
      // 如果是网络错误且重试次数小于3，自动重试
      if (errorMessage.includes('网络') && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchQuotes();
        }, Math.pow(2, retryCount) * 1000); // 指数退避
      }
      
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setRetryCount(0);
    fetchQuotes();
  };

  // 使用useMemo优化过滤器依赖项
  const filterDeps = useMemo(() => ({
    search: filters.search,
    category: filters.category,
    difficulty: filters.difficulty,
    tags: filters.tags?.join(',') || ''
  }), [filters.search, filters.category, filters.difficulty, filters.tags]);
  
  useEffect(() => {
    fetchQuotes();
  }, [filterDeps.search, filterDeps.category, filterDeps.difficulty, filterDeps.tags]);

  return {
    quotes,
    loading,
    error,
    refetch,
    retryCount,
    hasMore,
  };
}