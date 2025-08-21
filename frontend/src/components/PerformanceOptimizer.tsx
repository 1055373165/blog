import React, { useEffect, useState } from 'react';
import { usePerformanceMonitor } from '../hooks/usePerformanceOptimization';
import { useReducedMotion, useHighContrast, useSkipLinks } from '../hooks/useAccessibility';
import { clsx } from 'clsx';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
  enableAccessibilityFeatures?: boolean;
}

// 性能监控面板 (仅开发环境)
const PerformanceMonitorPanel = () => {
  const performance = usePerformanceMonitor('App');
  const [isVisible, setIsVisible] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-50 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
        title="性能监控面板"
      >
        📊 性能
      </button>
      
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-50 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl text-xs space-y-2 max-w-xs">
          <h3 className="font-bold text-gray-900 dark:text-white">性能监控</h3>
          <div className="space-y-1 text-gray-600 dark:text-gray-400">
            <div>渲染次数: {performance.renderCount}</div>
            <div>最后渲染耗时: {performance.lastRenderDuration}ms</div>
            <div className={clsx(
              'px-2 py-1 rounded text-white text-xs',
              performance.lastRenderDuration > 50 ? 'bg-red-500' :
              performance.lastRenderDuration > 20 ? 'bg-yellow-500' :
              'bg-green-500'
            )}>
              {performance.lastRenderDuration > 50 ? '性能较差' :
               performance.lastRenderDuration > 20 ? '性能一般' :
               '性能良好'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// 无障碍性辅助功能组件
const AccessibilityEnhancer = ({ children }: { children: React.ReactNode }) => {
  const prefersReducedMotion = useReducedMotion();
  const prefersHighContrast = useHighContrast();
  const { addSkipLink } = useSkipLinks();
  const [hasKeyboardUser, setHasKeyboardUser] = useState(false);

  useEffect(() => {
    // 添加跳过链接
    addSkipLink('#main', '跳转到主要内容');
    addSkipLink('#navigation', '跳转到导航');
    addSkipLink('#footer', '跳转到页脚');
  }, [addSkipLink]);

  useEffect(() => {
    // 检测键盘用户
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setHasKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setHasKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    // 应用用户首选项
    const root = document.documentElement;
    
    if (prefersReducedMotion) {
      root.classList.add('motion-reduce');
      // 禁用或减少动画
      const style = document.createElement('style');
      style.textContent = `
        .motion-reduce *,
        .motion-reduce *::before,
        .motion-reduce *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      root.classList.remove('motion-reduce');
    }

    if (prefersHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [prefersReducedMotion, prefersHighContrast]);

  return (
    <div 
      className={clsx(
        hasKeyboardUser && 'keyboard-navigation-active',
        prefersHighContrast && 'high-contrast',
        prefersReducedMotion && 'reduced-motion'
      )}
    >
      {children}
    </div>
  );
};

// 图片预加载组件
const ImagePreloader = ({ urls }: { urls: string[] }) => {
  useEffect(() => {
    const preloadImages = async () => {
      const promises = urls.map(url => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
      });

      try {
        await Promise.allSettled(promises);
      } catch (error) {
        console.warn('Some images failed to preload:', error);
      }
    };

    if (urls.length > 0) {
      preloadImages();
    }
  }, [urls]);

  return null;
};

// 字体预加载组件
const FontPreloader = ({ fonts }: { fonts: string[] }) => {
  useEffect(() => {
    const preloadFonts = async () => {
      if ('fonts' in document) {
        try {
          await Promise.all(
            fonts.map(font => (document as any).fonts.load(font))
          );
        } catch (error) {
          console.warn('Some fonts failed to preload:', error);
        }
      }
    };

    if (fonts.length > 0) {
      preloadFonts();
    }
  }, [fonts]);

  return null;
};

// 资源优化组件
const ResourceOptimizer = () => {
  useEffect(() => {
    // 预加载关键资源
    const criticalImages = [
      // 可以在这里添加关键图片路径
    ];

    const criticalFonts = [
      '16px Inter',
      '14px JetBrains Mono',
      'bold 24px Inter'
    ];

    // DNS预解析
    const dnsPrefetch = [
      '//fonts.googleapis.com',
      '//fonts.gstatic.com'
    ];

    dnsPrefetch.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }, []);

  return (
    <>
      <ImagePreloader urls={[]} />
      <FontPreloader fonts={['16px Inter', '14px JetBrains Mono']} />
    </>
  );
};

// 主优化器组件
export default function PerformanceOptimizer({
  children,
  enablePerformanceMonitoring = true,
  enableAccessibilityFeatures = true
}: PerformanceOptimizerProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 等待关键资源加载完成
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在优化加载...</p>
        </div>
      </div>
    );
  }

  const content = enableAccessibilityFeatures ? (
    <AccessibilityEnhancer>{children}</AccessibilityEnhancer>
  ) : (
    children
  );

  return (
    <>
      <ResourceOptimizer />
      {content}
      {enablePerformanceMonitoring && <PerformanceMonitorPanel />}
    </>
  );
}