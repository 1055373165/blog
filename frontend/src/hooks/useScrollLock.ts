import { useEffect, useRef } from 'react';

/**
 * Hook to prevent body scroll while preserving scroll position
 * 防止body滚动的同时保持滚动位置
 */
export function useScrollLock(isLocked: boolean) {
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (isLocked) {
      // 保存当前滚动位置
      scrollPositionRef.current = window.pageYOffset;
      
      // 设置body样式防止滚动
      const originalStyle = window.getComputedStyle(document.body);
      const originalPosition = originalStyle.position;
      const originalTop = originalStyle.top;
      const originalWidth = originalStyle.width;
      
      // 应用固定定位，保持当前滚动位置
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 恢复原始样式
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.overflow = '';
        
        // 恢复滚动位置
        window.scrollTo(0, scrollPositionRef.current);
      };
    }
  }, [isLocked]);
}