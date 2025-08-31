import { Outlet, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import FloatingNavigation from './FloatingNavigation';
import AnimatedBackground from './AnimatedBackground';
import { BlogStats } from '../types';
import { statsApi } from '../api';

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                快速链接
              </h3>
              <ul className="space-y-2">
                {navigation.slice(0, 4).map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 text-sm"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Stats */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                站点统计
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>文章总数</span>
                  <span className="font-medium">{stats?.totalArticles || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>分类数量</span>
                  <span className="font-medium">{stats?.totalCategories || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>标签数量</span>
                  <span className="font-medium">{stats?.totalTags || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>总浏览量</span>
                  <span className="font-medium">{stats?.totalViews?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              © 2025 我的博客. All rights reserved. Built with React + TypeScript + Go
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}