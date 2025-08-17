import { useState, useEffect, useRef, useMemo } from 'react';

interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveBreakpoints {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });
  
  // 使用useRef来防抖resize事件
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleResize = () => {
      // 清除之前的超时
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // 防抖处理，减少状态更新频率
      resizeTimeoutRef.current = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150); // 150ms防抖
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // 使用useMemo缓存计算结果
  const breakpoints = useMemo(() => {
    const isMobile = dimensions.width < 768;
    const isTablet = dimensions.width >= 768 && dimensions.width < 1024;
    const isDesktop = dimensions.width >= 1024 && dimensions.width < 1280;
    const isLarge = dimensions.width >= 1280;
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      isLarge,
      width: dimensions.width,
      height: dimensions.height,
    };
  }, [dimensions.width, dimensions.height]);

  return breakpoints;
}

// 优化的触摸设备检测 - 使用useMemo缓存结果
export function useTouch() {
  const [isTouch, setIsTouch] = useState(() => {
    // 初始化时直接检测，避免不必要的重新渲染
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0
    );
  });

  useEffect(() => {
    // 只在初始值为false时才添加事件监听器
    if (!isTouch) {
      const checkTouch = () => {
        setIsTouch(true);
      };
      
      window.addEventListener('touchstart', checkTouch, { once: true, passive: true });
      
      return () => {
        window.removeEventListener('touchstart', checkTouch);
      };
    }
  }, [isTouch]);

  return isTouch;
}

// 视口方向检测
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return orientation;
}