// 性能优化工具函数

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 检查元素是否在视口中
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Intersection Observer Hook
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options,
  });
}

/**
 * RAF池管理器
 */
class RAFManager {
  private callbacks: Map<string, () => void> = new Map();
  private animationId: number | null = null;

  add(id: string, callback: () => void): void {
    this.callbacks.set(id, callback);
    if (!this.animationId) {
      this.start();
    }
  }

  remove(id: string): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0 && this.animationId) {
      this.stop();
    }
  }

  private start(): void {
    const animate = () => {
      this.callbacks.forEach((callback) => callback());
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  clear(): void {
    this.callbacks.clear();
    this.stop();
  }
}

export const rafManager = new RAFManager();

/**
 * 内存使用监控
 */
export function getMemoryUsage(): any {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
}

/**
 * 性能标记
 */
export function performanceMark(name: string): void {
  if ('mark' in performance) {
    performance.mark(name);
  }
}

/**
 * 性能测量
 */
export function performanceMeasure(name: string, startMark: string, endMark?: string): void {
  if ('measure' in performance) {
    performance.measure(name, startMark, endMark);
  }
}

/**
 * 获取性能指标
 */
export function getPerformanceMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  
  return {
    // 页面加载时间
    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
    // DOM 解析时间
    domParseTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    // 首次绘制时间
    firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
    // 首次内容绘制时间
    firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
    // 内存使用情况
    memory: getMemoryUsage(),
  };
}

/**
 * 懒加载图片
 */
export function lazyLoadImage(img: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.onload = () => resolve();
          img.onerror = reject;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  });
}

/**
 * 预加载资源
 */
export function preloadResource(href: string, as: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * 清理事件监听器
 */
export class EventCleanup {
  private cleanupFunctions: (() => void)[] = [];

  add(cleanup: () => void): void {
    this.cleanupFunctions.push(cleanup);
  }

  addEventListener<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  addElementEventListener<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  cleanup(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
  }
}