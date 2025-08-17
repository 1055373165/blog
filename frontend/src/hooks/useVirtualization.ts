import { useState, useEffect, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizedItem<T> {
  index: number;
  item: T;
  style: React.CSSProperties;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    const virtualizedItems: VirtualizedItem<T>[] = [];
    
    for (let i = Math.max(0, startIndex - overscan); i < endIndex; i++) {
      if (items[i]) {
        virtualizedItems.push({
          index: i,
          item: items[i],
          style: {
            position: 'absolute',
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }
    
    return virtualizedItems;
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return {
    visibleItems,
    totalHeight,
    handleScroll,
  };
}

// 性能优化的内存化Hook
export function useMemoizedQuotes<T>(
  quotes: T[],
  dependencies: unknown[] = []
): T[] {
  return useMemo(() => quotes, [quotes, ...dependencies]);
}

// 分页处理Hook
interface PaginationOptions {
  pageSize: number;
  currentPage?: number;
}

export function usePagination<T>(
  items: T[],
  options: PaginationOptions
) {
  const { pageSize, currentPage = 1 } = options;
  const [page, setPage] = useState(currentPage);

  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const goToNextPage = () => goToPage(page + 1);
  const goToPrevPage = () => goToPage(page - 1);

  return {
    currentPage: page,
    totalPages,
    paginatedItems,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    goToPage,
    goToNextPage,
    goToPrevPage,
    setPage,
  };
}