import { useEffect, useRef, useState, useCallback } from 'react';

// 键盘导航Hook
export const useKeyboardNavigation = (itemCount: number, onSelect?: (index: number) => void) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const setItemRef = useCallback((index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemCount && itemRefs.current[index]) {
      itemRefs.current[index]?.focus();
      setFocusedIndex(index);
    }
  }, [itemCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isNavigating) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // vim-style navigation
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = (prev + 1) % itemCount;
            focusItem(next);
            return next;
          });
          break;
        
        case 'ArrowUp':
        case 'k': // vim-style navigation
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev <= 0 ? itemCount - 1 : prev - 1;
            focusItem(next);
            return next;
          });
          break;
        
        case 'Home':
          e.preventDefault();
          focusItem(0);
          break;
        
        case 'End':
          e.preventDefault();
          focusItem(itemCount - 1);
          break;
        
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && onSelect) {
            onSelect(focusedIndex);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          setIsNavigating(false);
          setFocusedIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, isNavigating, itemCount, onSelect, focusItem]);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    if (focusedIndex === -1 && itemCount > 0) {
      focusItem(0);
    }
  }, [focusedIndex, itemCount, focusItem]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setFocusedIndex(-1);
  }, []);

  return {
    focusedIndex,
    isNavigating,
    setItemRef,
    startNavigation,
    stopNavigation,
    focusItem
  };
};

// 动画减少首选项Hook
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
};

// 高对比度首选项Hook
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersHighContrast;
};

// 跳过链接Hook
export const useSkipLinks = () => {
  const [skipLinks, setSkipLinks] = useState<Array<{ href: string; label: string }>>([]);

  const addSkipLink = useCallback((href: string, label: string) => {
    setSkipLinks(prev => {
      const exists = prev.some(link => link.href === href);
      if (exists) return prev;
      return [...prev, { href, label }];
    });
  }, []);

  const removeSkipLink = useCallback((href: string) => {
    setSkipLinks(prev => prev.filter(link => link.href !== href));
  }, []);

  const createSkipLinks = useCallback(() => {
    return skipLinks;
  }, [skipLinks]);

  return {
    addSkipLink,
    removeSkipLink,
    createSkipLinks
  };
};

export default {
  useKeyboardNavigation,
  useReducedMotion,
  useHighContrast,
  useSkipLinks
};