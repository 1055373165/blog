import { useState, useRef, useEffect, ReactNode, CSSProperties } from 'react';
import { clsx } from 'clsx';

interface LayoutStabilizerProps {
  children: ReactNode;
  className?: string;
  minHeight?: number | string;
  skeleton?: ReactNode;
  aspectRatio?: string; // 如 "16:9", "4:3", "1:1"
  loading?: boolean;
  onResize?: (dimensions: { width: number; height: number }) => void;
}

// 防止 CLS 的容器组件
export default function LayoutStabilizer({
  children,
  className,
  minHeight,
  skeleton,
  aspectRatio,
  loading = false,
  onResize
}: LayoutStabilizerProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isStabilized, setIsStabilized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const newDimensions = { width, height };
        
        setDimensions(newDimensions);
        onResize?.(newDimensions);
        
        // 首次测量后标记为已稳定
        if (!isStabilized) {
          setIsStabilized(true);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isStabilized, onResize]);

  // 计算稳定的样式
  const getStableStyle = (): CSSProperties => {
    const style: CSSProperties = {};
    
    // 设置最小高度
    if (minHeight) {
      style.minHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
    }
    
    // 设置宽高比
    if (aspectRatio) {
      style.aspectRatio = aspectRatio.replace(':', '/');
    }
    
    // 如果已经有尺寸信息且处于加载状态，保持尺寸稳定
    if (loading && dimensions && isStabilized) {
      style.width = `${dimensions.width}px`;
      style.height = `${dimensions.height}px`;
    }
    
    return style;
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative',
        // 防止内容溢出导致布局偏移
        'overflow-hidden',
        className
      )}
      style={getStableStyle()}
    >
      {/* 骨架屏或加载状态 */}
      {loading && skeleton && (
        <div className="absolute inset-0 z-10">
          {skeleton}
        </div>
      )}
      
      {/* 实际内容 */}
      <div 
        className={clsx(
          'transition-opacity duration-300',
          loading && skeleton ? 'opacity-0' : 'opacity-100'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// 预设的骨架屏组件
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {/* 标题骨架 */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
      
      {/* 内容行骨架 */}
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i}
          className={clsx(
            "h-4 bg-gray-200 dark:bg-gray-700 rounded",
            // 最后一行稍短
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
      
      {/* 底部信息骨架 */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5"></div>
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 文章标题 */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-4/5"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/5"></div>
      </div>
      
      {/* 文章元信息 */}
      <div className="flex items-center space-x-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      
      {/* 封面图片占位 */}
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      
      {/* 文章内容 */}
      <div className="space-y-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div 
            key={i}
            className={clsx(
              "h-4 bg-gray-200 dark:bg-gray-700 rounded",
              // 随机宽度模拟真实文本
              ['w-full', 'w-5/6', 'w-4/5', 'w-3/4'][i % 4]
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <CardSkeleton lines={2} />
        </div>
      ))}
    </div>
  );
}

// Hook: 用于检测和报告 CLS
export function useCLSMonitoring() {
  const [clsScore, setCLSScore] = useState(0);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    let cls = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // 只统计没有用户输入的布局偏移
        if (!(entry as any).hadRecentInput) {
          cls += (entry as any).value;
          setCLSScore(cls);
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return clsScore;
}

export type { LayoutStabilizerProps };