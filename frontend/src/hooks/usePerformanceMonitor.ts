import { useEffect, useState, useCallback } from 'react';

// Core Web Vitals 指标类型
interface WebVitalsMetrics {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay (将被 INP 替代)
  cls: number | null; // Cumulative Layout Shift
  inp: number | null; // Interaction to Next Paint (新指标)
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
}

// 性能评级
type PerformanceRating = 'good' | 'needs-improvement' | 'poor';

interface PerformanceRating {
  lcp: PerformanceRating;
  fid: PerformanceRating;
  cls: PerformanceRating;
  inp: PerformanceRating;
  overall: PerformanceRating;
}

// 性能监控配置
interface PerformanceMonitorOptions {
  reportInterval?: number; // 上报间隔（毫秒）
  enableConsoleLog?: boolean; // 是否在控制台输出
  onMetric?: (metric: string, value: number, rating: PerformanceRating) => void;
  onReport?: (metrics: WebVitalsMetrics, ratings: PerformanceRating) => void;
}

// Web Vitals 阈值配置 (Google 标准)
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 }
} as const;

// 计算性能评级
function getRating(metric: keyof typeof THRESHOLDS, value: number): PerformanceRating {
  const threshold = THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// 计算整体评级
function getOverallRating(ratings: Omit<PerformanceRating, 'overall'>): PerformanceRating {
  const values = Object.values(ratings);
  const poorCount = values.filter(r => r === 'poor').length;
  const needsImprovementCount = values.filter(r => r === 'needs-improvement').length;
  
  if (poorCount > 0) return 'poor';
  if (needsImprovementCount > 1) return 'needs-improvement';
  return 'good';
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    reportInterval = 30000, // 30秒上报一次
    enableConsoleLog = process.env.NODE_ENV === 'development',
    onMetric,
    onReport
  } = options;

  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null
  });

  const [ratings, setRatings] = useState<PerformanceRating>({
    lcp: 'good',
    fid: 'good',
    cls: 'good',
    inp: 'good',
    overall: 'good'
  });

  // 更新指标
  const updateMetric = useCallback((
    metricName: keyof WebVitalsMetrics, 
    value: number
  ) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, [metricName]: value };
      
      // 计算评级
      if (metricName in THRESHOLDS) {
        const rating = getRating(metricName as keyof typeof THRESHOLDS, value);
        
        setRatings(prevRatings => {
          const newRatings = { ...prevRatings, [metricName]: rating };
          newRatings.overall = getOverallRating(newRatings);
          return newRatings;
        });

        // Console logging disabled
        // if (enableConsoleLog) {
        //   console.log(`🚀 ${metricName.toUpperCase()}: ${value}ms (${rating})`);
        // }

        onMetric?.(metricName, value, rating);
      }
      
      return newMetrics;
    });
  }, [enableConsoleLog, onMetric]);

  // 初始化性能监控
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // LCP 监控
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      updateMetric('lcp', lastEntry.startTime);
    });

    // FID 监控 (即将被 INP 替代，但仍然监控)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        updateMetric('fid', (entry as any).processingStart - entry.startTime);
      }
    });

    // CLS 监控
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          updateMetric('cls', clsValue);
        }
      }
    });

    // INP 监控 (新的响应性指标)
    const inpObserver = new PerformanceObserver((list) => {
      let longestInteraction = 0;
      for (const entry of list.getEntries()) {
        const interaction = entry as any;
        const duration = interaction.processingEnd - interaction.startTime;
        if (duration > longestInteraction) {
          longestInteraction = duration;
          updateMetric('inp', duration);
        }
      }
    });

    // FCP 监控
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          updateMetric('fcp', entry.startTime);
        }
      }
    });

    // TTFB 监控
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navigation = entry as PerformanceNavigationTiming;
        updateMetric('ttfb', navigation.responseStart - navigation.requestStart);
      }
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      fidObserver.observe({ type: 'first-input', buffered: true });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      fcpObserver.observe({ type: 'paint', buffered: true });
      navigationObserver.observe({ type: 'navigation', buffered: true });
      
      // INP 需要检查浏览器支持
      try {
        inpObserver.observe({ type: 'event', buffered: true });
      } catch (e) {
        // INP 可能不被支持，使用 FID 作为备选
        console.warn('INP monitoring not supported, falling back to FID');
      }
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      inpObserver.disconnect();
      fcpObserver.disconnect();
      navigationObserver.disconnect();
    };
  }, [updateMetric]);

  // 定期上报
  useEffect(() => {
    if (!onReport) return;

    const interval = setInterval(() => {
      const hasData = Object.values(metrics).some(value => value !== null);
      if (hasData) {
        onReport(metrics, ratings);
      }
    }, reportInterval);

    return () => clearInterval(interval);
  }, [metrics, ratings, onReport, reportInterval]);

  // 获取性能得分 (0-100)
  const getPerformanceScore = useCallback((): number => {
    const scores = {
      lcp: metrics.lcp ? Math.max(0, 100 - (metrics.lcp / 40)) : 0,
      cls: metrics.cls ? Math.max(0, 100 - (metrics.cls * 1000)) : 0,
      fid: metrics.fid ? Math.max(0, 100 - (metrics.fid / 3)) : 0,
      inp: metrics.inp ? Math.max(0, 100 - (metrics.inp / 5)) : 0
    };

    const avgScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;
    return Math.round(Math.max(0, Math.min(100, avgScore)));
  }, [metrics]);

  // 获取性能建议
  const getPerformanceAdvice = useCallback((): string[] => {
    const advice: string[] = [];

    if (ratings.lcp === 'poor') {
      advice.push('优化图片大小和格式，启用图片懒加载');
    }
    if (ratings.cls === 'poor') {
      advice.push('为图片和动态内容预分配空间，避免布局偏移');
    }
    if (ratings.fid === 'poor' || ratings.inp === 'poor') {
      advice.push('减少主线程阻塞，优化 JavaScript 执行');
    }
    if (metrics.ttfb && metrics.ttfb > THRESHOLDS.ttfb.poor) {
      advice.push('优化服务器响应时间，考虑使用 CDN');
    }

    return advice;
  }, [ratings, metrics]);

  return {
    metrics,
    ratings,
    performanceScore: getPerformanceScore(),
    advice: getPerformanceAdvice(),
    isGoodPerformance: ratings.overall === 'good'
  };
}

// 导出类型
export type { 
  WebVitalsMetrics, 
  PerformanceRating as PerformanceRatings,
  PerformanceMonitorOptions 
};

// 简化版 Hook，仅用于开发环境调试 (已禁用)
export function useDevPerformanceMonitor() {
  // Performance monitoring disabled to improve page load speed
  return {
    startTracking: () => {},
    stopTracking: () => {},
    getMetrics: () => ({}),
    resetMetrics: () => {}
  };
}