import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

interface ReadingProgressProps {
  target?: string; // 目标容器选择器，默认监听整个页面
  color?: string; // 进度条颜色
  height?: number; // 进度条高度（px）
  position?: 'top' | 'bottom'; // 进度条位置
  showPercentage?: boolean; // 是否显示百分比
  className?: string;
  smoothing?: boolean; // 是否启用平滑动画
  threshold?: number; // 开始显示的阈值（0-1）
  onProgressChange?: (progress: number) => void;
}

// 读取进度计算 Hook
function useReadingProgress(
  targetSelector?: string,
  threshold = 0,
  onProgressChange?: (progress: number) => void
) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  const calculateProgress = useCallback(() => {
    let element: Element | null = null;
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (targetSelector) {
      element = document.querySelector(targetSelector);
      if (!element) return;
      
      scrollTop = element.scrollTop;
      scrollHeight = element.scrollHeight;
      clientHeight = element.clientHeight;
    } else {
      // 监听整个页面
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight;
    }

    const scrollableHeight = scrollHeight - clientHeight;
    
    if (scrollableHeight <= 0) {
      setProgress(100);
      setIsVisible(false);
      return;
    }

    const newProgress = (scrollTop / scrollableHeight) * 100;
    const clampedProgress = Math.min(100, Math.max(0, newProgress));
    
    setProgress(clampedProgress);
    setIsVisible(clampedProgress >= threshold * 100);
    
    onProgressChange?.(clampedProgress);
  }, [targetSelector, threshold, onProgressChange]);

  const handleScroll = useCallback(() => {
    // 使用 requestAnimationFrame 优化性能
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(calculateProgress);
  }, [calculateProgress]);

  useEffect(() => {
    const target = targetSelector 
      ? document.querySelector(targetSelector)
      : window;

    if (!target) return;

    // 初始计算
    calculateProgress();

    // 监听滚动事件
    target.addEventListener('scroll', handleScroll, { passive: true });
    
    // 监听窗口大小变化
    if (!targetSelector) {
      window.addEventListener('resize', calculateProgress, { passive: true });
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      target.removeEventListener('scroll', handleScroll);
      
      if (!targetSelector) {
        window.removeEventListener('resize', calculateProgress);
      }
    };
  }, [targetSelector, handleScroll, calculateProgress]);

  return { progress, isVisible };
}

export default function ReadingProgress({
  target,
  color = 'rgb(59, 130, 246)', // blue-500
  height = 3,
  position = 'top',
  showPercentage = false,
  className,
  smoothing = true,
  threshold = 0,
  onProgressChange
}: ReadingProgressProps) {
  const { progress, isVisible } = useReadingProgress(target, threshold, onProgressChange);

  // 如果还没开始阅读，不显示进度条
  if (!isVisible && threshold > 0) {
    return null;
  }

  return (
    <>
      {/* 进度条 */}
      <div
        className={clsx(
          'fixed left-0 right-0 z-50',
          position === 'top' ? 'top-0' : 'bottom-0',
          smoothing && 'transition-opacity duration-300',
          className
        )}
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-label="阅读进度"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* 背景 */}
        <div 
          className="w-full h-full bg-gray-200 dark:bg-gray-700 opacity-80"
          aria-hidden="true"
        />
        
        {/* 进度填充 */}
        <div
          className={clsx(
            'h-full transition-all duration-150 ease-out',
            position === 'top' ? 'absolute top-0' : 'absolute bottom-0'
          )}
          style={{
            width: `${progress}%`,
            backgroundColor: color,
            transformOrigin: 'left center'
          }}
          aria-hidden="true"
        />
      </div>

      {/* 百分比显示 */}
      {showPercentage && (
        <div
          className={clsx(
            'fixed right-4 z-50 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-lg border border-gray-200 dark:border-gray-600',
            position === 'top' ? 'top-4' : 'bottom-4',
            smoothing && 'transition-all duration-300',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          )}
          aria-live="polite"
          aria-label={`阅读进度 ${Math.round(progress)}%`}
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </>
  );
}

// 简化版组件，仅显示进度条
export function SimpleReadingProgress({ 
  className,
  color 
}: { 
  className?: string;
  color?: string;
}) {
  return (
    <ReadingProgress
      color={color}
      height={2}
      position="top"
      smoothing={true}
      threshold={0.05} // 滚动5%后显示
      className={className}
    />
  );
}

// 圆形进度指示器
export function CircularReadingProgress({
  size = 48,
  strokeWidth = 3,
  color = 'rgb(59, 130, 246)',
  backgroundColor = 'rgb(229, 231, 235)',
  showPercentage = true,
  className,
  target
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
  target?: string;
}) {
  const { progress, isVisible } = useReadingProgress(target, 0.05);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 z-50 transition-all duration-300',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
      role="progressbar"
      aria-label="阅读进度"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* 百分比文字 */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Hook: 监听阅读完成事件
export function useReadingCompletion(onComplete?: () => void, threshold = 90) {
  const [isCompleted, setIsCompleted] = useState(false);
  
  const { progress } = useReadingProgress();
  
  useEffect(() => {
    if (progress >= threshold && !isCompleted) {
      setIsCompleted(true);
      onComplete?.();
    } else if (progress < threshold && isCompleted) {
      setIsCompleted(false);
    }
  }, [progress, threshold, isCompleted, onComplete]);
  
  return isCompleted;
}

export type { ReadingProgressProps };