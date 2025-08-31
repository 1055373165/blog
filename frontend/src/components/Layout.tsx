import { Outlet, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import FloatingNavigation from './FloatingNavigation';
import AnimatedBackground from './AnimatedBackground';
import { BlogStats } from '../types';
import { statsApi } from '../api';
import policeBadge from '../assets/公安备案编号图标.png';

export default function Layout() {
  const [stats, setStats] = useState<BlogStats | null>(null);


  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await statsApi.getStats();
      setStats(response.data);
    } catch (err) {
      // Silently fail for stats, they're not critical
      console.error('Failed to load stats:', err);
    }
  };

  const navigation = [
    { name: '首页', href: '/', icon: 'home' },
    { name: '文章', href: '/articles', icon: 'document' },
    { name: '分类', href: '/categories', icon: 'folder' },
    { name: '标签', href: '/tags', icon: 'tag' },
  ];

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* 动态背景 */}
      <AnimatedBackground 
        variant="grid" 
        intensity="medium" 
        enableScrollEffect={true}
      />
      
      {/* 悬浮导航 */}
      <FloatingNavigation />
      
      {/* 传统导航栏已移除 - 统一使用悬浮导航 */}

      {/* 主内容区 */}
      <main 
        id="main"
        className="flex-1 relative z-10"
        role="main"
        aria-label="主要内容"
      >
        <Outlet />
      </main>

      {/* 主题设置面板现在由 FloatingNavigation 管理 */}


      {/* 页脚 */}
      <footer 
        className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12 relative z-10"
        role="contentinfo"
        aria-label="网站信息"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <img 
                src={policeBadge} 
                alt="公安备案" 
                className="h-4 w-4"
              />
              <a 
                href="https://beian.mps.gov.cn/#/query/webSearch" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                京公网安备11010502057450号
              </a>
              <a 
                href="https://beian.miit.gov.cn" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                京ICP备2025141145号-1
              </a>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              © 2025 我的博客. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}