import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  ChatBubbleBottomCenterTextIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  { name: '首页', href: '/', icon: HomeIcon, description: '回到首页' },
  { name: '文章', href: '/articles', icon: DocumentTextIcon, description: '技术文章' },
  { name: '系列', href: '/series', icon: BookOpenIcon, description: '文章系列' },
  { name: '箴言', href: '/quotes', icon: ChatBubbleBottomCenterTextIcon, description: '技术箴言' },
  { name: '搜索', href: '/search', icon: MagnifyingGlassIcon, description: '搜索内容' },
];

interface FloatingNavigationProps {
  className?: string;
}

export default function FloatingNavigation({ className }: FloatingNavigationProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 判断是否滚动
      setIsScrolled(currentScrollY > 50);
      
      // 判断滚动方向
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // 更新活跃状态
  useEffect(() => {
    const currentIndex = navigationItems.findIndex(item => 
      item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
    );
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [location.pathname]);

  // 更新指示器位置
  useEffect(() => {
    if (indicatorRef.current && navRef.current) {
      const activeButton = navRef.current.children[activeIndex] as HTMLElement;
      if (activeButton) {
        const rect = activeButton.getBoundingClientRect();
        const navRect = navRef.current.getBoundingClientRect();
        const left = rect.left - navRect.left;
        const width = rect.width;
        
        indicatorRef.current.style.transform = `translateX(${left}px)`;
        indicatorRef.current.style.width = `${width}px`;
      }
    }
  }, [activeIndex, isExpanded]);

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const shortcuts: { [key: string]: string } = {
          '1': '/',
          '2': '/articles',
          '3': '/series',
          '4': '/quotes',
          '5': '/search'
        };
        
        if (shortcuts[key]) {
          e.preventDefault();
          window.location.href = shortcuts[key];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* 主导航栏 */}
      <nav
        className={clsx(
          'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out',
          scrollDirection === 'down' && isScrolled ? '-translate-y-20 opacity-0' : 'translate-y-0 opacity-100',
          className
        )}
      >
        <div className={clsx(
          'relative px-6 py-3 rounded-2xl border backdrop-blur-xl transition-all duration-500',
          'bg-white/80 dark:bg-gray-900/80',
          'border-white/20 dark:border-gray-800/20',
          'shadow-2xl shadow-black/10 dark:shadow-black/20',
          isScrolled && 'shadow-4xl',
          'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]'
        )}>
          {/* 背景装饰 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/5 via-transparent to-go-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* 导航项容器 */}
          <div className="relative flex items-center space-x-1">
            {/* 活跃指示器 */}
            <div
              ref={indicatorRef}
              className="absolute top-0 bottom-0 bg-gradient-to-r from-primary-500/20 to-go-500/20 rounded-xl transition-all duration-300 ease-out"
              style={{ left: 0, width: 0 }}
            />
            
            {/* 导航项 */}
            <nav ref={navRef} className="flex items-center space-x-1">
              {navigationItems.map((item, index) => {
                const isActive = activeIndex === index;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={clsx(
                      'relative px-4 py-2 rounded-xl transition-all duration-300 group',
                      'text-sm font-medium whitespace-nowrap',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                    title={`${item.description} (Ctrl+${index + 1})`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className={clsx(
                        'w-4 h-4 transition-all duration-300',
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      )} />
                      <span className="hidden sm:inline">{item.name}</span>
                    </div>
                    
                    {/* 悬浮提示 */}
                    <div className={clsx(
                      'absolute -top-12 left-1/2 transform -translate-x-1/2 px-2 py-1',
                      'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg',
                      'opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
                      'whitespace-nowrap'
                    )}>
                      {item.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                    </div>
                  </Link>
                );
              })}
            </nav>
            
            {/* 分隔线 */}
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            
            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              className={clsx(
                'p-2 rounded-xl transition-all duration-300 group',
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              title={`切换到${theme === 'dark' ? '明亮' : '暗黑'}模式`}
            >
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <MoonIcon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-500" />
              )}
            </button>
            
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={clsx(
                'sm:hidden p-2 rounded-xl transition-all duration-300',
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {isExpanded ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        
        {/* 移动端展开菜单 */}
        {isExpanded && (
          <div className={clsx(
            'absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl backdrop-blur-xl transition-all duration-300',
            'bg-white/90 dark:bg-gray-900/90',
            'border border-white/20 dark:border-gray-800/20',
            'shadow-2xl'
          )}>
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsExpanded(false)}
                    className={clsx(
                      'flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      
      {/* 回到顶部按钮 */}
      {isScrolled && (
        <button
          onClick={scrollToTop}
          className={clsx(
            'fixed bottom-8 right-8 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-500',
            'bg-white/80 dark:bg-gray-900/80',
            'border border-white/20 dark:border-gray-800/20',
            'shadow-2xl hover:shadow-4xl',
            'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400',
            'hover:scale-110 hover:-translate-y-1',
            'group'
          )}
          title="回到顶部"
        >
          <ChevronUpIcon className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-go-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </>
  );
}