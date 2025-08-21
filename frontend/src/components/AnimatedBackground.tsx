import React, { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';

interface AnimatedBackgroundProps {
  variant?: 'grid' | 'particles' | 'waves' | 'matrix';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
  enableScrollEffect?: boolean;
}

// 网格动画背景
const GridBackground = ({ intensity, enableScrollEffect }: { intensity: string; enableScrollEffect?: boolean }) => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enableScrollEffect) return;

    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enableScrollEffect]);

  const getGridSize = () => {
    switch (intensity) {
      case 'high': return 20;
      case 'medium': return 30;
      case 'low': default: return 40;
    }
  };

  const gridSize = getGridSize();

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
      {/* 主网格 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          transform: `translate3d(${mousePosition.x * 10}px, ${mousePosition.y * 10 + scrollY * 0.1}px, 0)`
        }}
      />
      
      {/* 次级网格 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize * 5}px ${gridSize * 5}px`,
          transform: `translate3d(${mousePosition.x * -5}px, ${mousePosition.y * -5 + scrollY * 0.05}px, 0)`
        }}
      />
      
      {/* 动态节点 */}
      {Array.from({ length: intensity === 'high' ? 12 : intensity === 'medium' ? 8 : 4 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-primary-500/20 rounded-full animate-pulse"
          style={{
            left: `${(i * 23 + 10) % 90}%`,
            top: `${(i * 31 + 15) % 85}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${2 + (i % 3)}s`,
            transform: `translate3d(${mousePosition.x * (i % 3) * 5}px, ${mousePosition.y * (i % 3) * 5 + scrollY * 0.02}px, 0)`
          }}
        />
      ))}
    </div>
  );
};

// 粒子动画背景
const ParticleBackground = ({ intensity }: { intensity: string }) => {
  const particleCount = intensity === 'high' ? 50 : intensity === 'medium' ? 30 : 15;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: particleCount }).map((_, i) => {
        const size = Math.random() * 4 + 1;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 20;
        
        return (
          <div
            key={i}
            className="absolute opacity-20 dark:opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: ['#3b82f6', '#14b8a6', '#8b5cf6'][i % 3],
              borderRadius: '50%',
              animation: `particleFloat ${duration}s linear infinite ${delay}s`
            }}
          />
        );
      })}
    </div>
  );
};

// 波浪动画背景
const WaveBackground = ({ intensity }: { intensity: string }) => {
  const waveCount = intensity === 'high' ? 4 : intensity === 'medium' ? 3 : 2;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: waveCount }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 opacity-10 dark:opacity-5"
          style={{
            background: `radial-gradient(ellipse at ${50 + i * 30}% ${50 + i * 20}%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)`,
            animation: `waveMotion ${15 + i * 5}s ease-in-out infinite ${i * 2}s`,
            transform: `scale(${1 + i * 0.2})`
          }}
        />
      ))}
    </div>
  );
};

// 矩阵代码雨背景
const MatrixBackground = ({ intensity }: { intensity: string }) => {
  const [matrixChars, setMatrixChars] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>?/|\\~`'.split('');
    setMatrixChars(chars);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const columns = Math.floor(canvas.width / 20);
    const drops: number[] = new Array(columns).fill(1);
    
    const dropCount = intensity === 'high' ? columns : intensity === 'medium' ? columns * 0.7 : columns * 0.4;
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.font = '15px monospace';
      
      for (let i = 0; i < dropCount; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 20, drops[i] * 20);
        
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    
    const interval = setInterval(draw, 100);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, matrixChars]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-10 dark:opacity-5 pointer-events-none"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
};

// 滚动进度指示器
const ScrollProgressIndicator = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollTop / documentHeight;
      setScrollProgress(Math.min(Math.max(progress, 0), 1));
    };
    
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();
    
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);
  
  return (
    <>
      {/* 顶部进度条 */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200/30 dark:bg-gray-800/30">
        <div 
          className="h-full bg-gradient-to-r from-primary-500 to-go-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
      
      {/* 侧边进度指示器 */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="w-1 h-32 bg-gray-200/30 dark:bg-gray-800/30 rounded-full overflow-hidden">
          <div 
            className="w-full bg-gradient-to-t from-primary-500 to-go-500 rounded-full transition-all duration-150 ease-out"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        
        {/* 进度百分比 */}
        <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 font-mono">
          {Math.round(scrollProgress * 100)}%
        </div>
      </div>
    </>
  );
};

export default function AnimatedBackground({
  variant = 'grid',
  intensity = 'medium',
  className,
  enableScrollEffect = true
}: AnimatedBackgroundProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  const renderBackground = () => {
    switch (variant) {
      case 'particles':
        return <ParticleBackground intensity={intensity} />;
      case 'waves':
        return <WaveBackground intensity={intensity} />;
      case 'matrix':
        return <MatrixBackground intensity={intensity} />;
      case 'grid':
      default:
        return <GridBackground intensity={intensity} enableScrollEffect={enableScrollEffect} />;
    }
  };
  
  return (
    <>
      <div className={clsx(
        'fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}>
        {renderBackground()}
      </div>
      
      <ScrollProgressIndicator />
    </>
  );
}