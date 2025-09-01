import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  BookOpenIcon, 
  ChatBubbleBottomCenterTextIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  TagIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronUpIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import type { ColorTheme } from '../contexts/ThemeContext';
import ThemeSettings from './ThemeSettings';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  { name: '首页', href: '/', icon: HomeIcon, description: '回到首页' },
  { name: '文章', href: '/articles', icon: DocumentTextIcon, description: '技术文章' },
  { name: '分类', href: '/categories', icon: FolderIcon, description: '文章分类' },
  { name: '标签', href: '/tags', icon: TagIcon, description: '文章标签' },
  { name: '系列', href: '/series', icon: BookOpenIcon, description: '文章系列' },
  { name: '箴言', href: '/quotes', icon: ChatBubbleBottomCenterTextIcon, description: '技术箴言' },
  { name: '搜索', href: '/search', icon: MagnifyingGlassIcon, description: '搜索内容' },
];

interface FloatingNavigationProps {
  className?: string;
}

export default function FloatingNavigation({ className }: FloatingNavigationProps) {
  const location = useLocation();
  const { settings, isDark, updateColorTheme } = useTheme();
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [isTogglingTheme, setIsTogglingTheme] = useState(false);
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  
  // Theme toggle function - simple light/dark toggle only
  const toggleTheme = () => {
    if (isTogglingTheme) return; // Prevent rapid clicking
    
    setIsTogglingTheme(true);
    
    // Simple light/dark toggle logic
    let nextTheme: ColorTheme;
    
    if (settings.colorTheme === 'system') {
      // If currently on system, toggle to opposite of what system currently is
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      nextTheme = mediaQuery.matches ? 'light' : 'dark';
    } else if (settings.colorTheme === 'dark') {
      nextTheme = 'light';
    } else {
      nextTheme = 'dark';
    }
    
    updateColorTheme(nextTheme);
    
    // Reset toggle state after a short delay
    setTimeout(() => setIsTogglingTheme(false), 150);
  };
  const [isScrolled, setIsScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const expandedMenuRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);

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

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && expandedMenuRef.current && !expandedMenuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  // 全局点击监听，用于隐藏/显示导航
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // 如果点击的是主题设置面板或展开的移动菜单，不处理
      if (themeSettingsOpen || isExpanded) {
        return;
      }

      const target = event.target as Node;
      const clickedElement = event.target as HTMLElement;
      
      // 如果点击的是导航栏内部，显示导航
      if (navigationRef.current && navigationRef.current.contains(target)) {
        setIsNavigationVisible(true);
        return;
      }

      // 简化逻辑：只检查真正的交互内容元素
      const isClickOnInteractiveContent = clickedElement.closest([
        // 交互元素
        'button', 'a', 'input', 'select', 'textarea', 'form',
        '[role="button"]', '[tabindex]', '.interactive',
        // 内容卡片和组件
        'article', '.group', '[data-article]', '.card',
        '.carousel', '.book-card', '[data-book]', '.clickable',
        // 具体的文本内容（不包括布局容器）
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
        'div[class*="prose"]', '.content', '.text-content',
        // 媒体元素
        'img', 'video', 'audio', 'canvas', 'svg',
        // 列表内容
        'ul li', 'ol li', 'dl dt', 'dl dd',
        // 表格内容
        'table td', 'table th',
        // 有交互行为的元素
        '[onclick]', '.hover\\:',
        // 代码块和预格式化文本
        'pre', 'code'
      ].join(', '));
      
      if (isClickOnInteractiveContent) {
        // 点击交互内容时隐藏导航
        setIsNavigationVisible(false);
      } else {
        // 点击其他任何地方（空白区域、边距、背景等）都显示导航
        setIsNavigationVisible(true);
      }
    };

    // 使用bubble阶段而不是capture阶段，让交互元素优先处理点击
    document.addEventListener('click', handleGlobalClick, false);
    return () => {
      document.removeEventListener('click', handleGlobalClick, false);
    };
  }, [themeSettingsOpen, isExpanded, isNavigationVisible]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key closes mobile menu
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const shortcuts: { [key: string]: string } = {
          '1': '/',
          '2': '/articles',
          '3': '/categories',
          '4': '/tags',
          '5': '/series',
          '6': '/quotes',
          '7': '/search'
        };
        
        if (shortcuts[key]) {
          e.preventDefault();
          setIsExpanded(false); // Close mobile menu if open
          window.location.href = shortcuts[key];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <>
      {/* 主导航栏 */}
      <nav
        ref={navigationRef}
        data-floating-nav
        className={clsx(
          'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out',
          'w-full max-w-7xl mx-auto px-4 sm:px-6', // Add responsive width constraints
          // 组合滚动和可见性状态
          (scrollDirection === 'down' && isScrolled) || !isNavigationVisible 
            ? '-translate-y-20 opacity-0 pointer-events-none' 
            : 'translate-y-0 opacity-100 pointer-events-auto',
          className
        )}
      >
        <div className={clsx(
          'relative mx-auto backdrop-blur-xl transition-all duration-500',
          // Mobile-first responsive padding and sizing
          'px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl border',
          'bg-white/80 dark:bg-gray-900/80',
          'border-white/20 dark:border-gray-800/20',
          'shadow-2xl shadow-black/10 dark:shadow-black/20',
          isScrolled && 'shadow-4xl',
          'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
          // Responsive width constraints
          'max-w-fit'
        )}>
          {/* 背景装饰 */}
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary-500/5 via-transparent to-go-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* 导航项容器 */}
          <div className="relative flex items-center justify-center">
            {/* Desktop Navigation (hidden on mobile) */}
            <div className="hidden sm:flex items-center space-x-1">
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
                        <span>{item.name}</span>
                      </div>
                      
                      {/* 悬浮提示 */}
                      <div className={clsx(
                        'absolute -top-12 left-1/2 transform -translate-x-1/2 px-2 py-1',
                        'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg',
                        'opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none',
                        'whitespace-nowrap z-10'
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
                disabled={isTogglingTheme}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-300 group',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  isTogglingTheme && 'scale-95 opacity-75'
                )}
                title={`切换主题模式 (当前: ${isDark ? '暗黑' : '明亮'})`}
              >
                {isDark ? (
                  <SunIcon className={clsx(
                    'w-5 h-5 transition-transform duration-300',
                    isTogglingTheme ? 'rotate-180 scale-110' : 'group-hover:rotate-180'
                  )} />
                ) : (
                  <MoonIcon className={clsx(
                    'w-5 h-5 transition-transform duration-300',
                    isTogglingTheme ? '-rotate-12 scale-110' : 'group-hover:-rotate-12'
                  )} />
                )}
              </button>
              
              {/* 主题设置 */}
              <button
                onClick={() => setThemeSettingsOpen(true)}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-300 group',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
                title="主题设置"
              >
                <CogIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
            
            {/* Mobile Navigation (visible on mobile only) */}
            <div className="flex sm:hidden items-center justify-between w-full mobile-nav-container">
              {/* Mobile Navigation Items - Horizontal Scroll */}
              <div className="mobile-nav-items space-x-1 flex-1 px-1 mobile-scrollbar">
                {navigationItems.slice(0, 5).map((item, index) => { // Show only first 5 items
                  const isActive = activeIndex === index;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        'mobile-nav-item relative flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 group',
                        'min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation', // Touch-friendly size
                        isActive
                          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      title={item.description}
                    >
                      <Icon className={clsx(
                        'w-5 h-5 transition-all duration-300',
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      )} />
                    </Link>
                  );
                })}
              </div>
              
              {/* Mobile Controls */}
              <div className="flex items-center space-x-1 ml-2">
                {/* 主题切换 */}
                <button
                  onClick={toggleTheme}
                  disabled={isTogglingTheme}
                  className={clsx(
                    'p-2.5 rounded-xl transition-all duration-300 group touch-manipulation',
                    'min-w-[44px] min-h-[44px] flex items-center justify-center',
                    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    isTogglingTheme && 'scale-95 opacity-75'
                  )}
                  title={`切换主题模式 (当前: ${isDark ? '暗黑' : '明亮'})`}
                >
                  {isDark ? (
                    <SunIcon className={clsx(
                      'w-5 h-5 transition-transform duration-300',
                      isTogglingTheme ? 'rotate-180 scale-110' : 'group-hover:rotate-180'
                    )} />
                  ) : (
                    <MoonIcon className={clsx(
                      'w-5 h-5 transition-transform duration-300',
                      isTogglingTheme ? '-rotate-12 scale-110' : 'group-hover:-rotate-12'
                    )} />
                  )}
                </button>
                
                {/* 移动端菜单按钮 */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={clsx(
                    'p-2.5 rounded-xl transition-all duration-300 touch-manipulation',
                    'min-w-[44px] min-h-[44px] flex items-center justify-center',
                    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                    'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                  title="展开菜单"
                >
                  {isExpanded ? (
                    <XMarkIcon className="w-5 h-5" />
                  ) : (
                    <Bars3Icon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 移动端展开菜单 */}
        {isExpanded && (
          <div 
            ref={expandedMenuRef}
            className={clsx(
              'absolute top-full left-0 right-0 mt-2 mx-4 p-4 rounded-2xl mobile-backdrop transition-all duration-300 sm:hidden',
              'bg-white/95 dark:bg-gray-900/95',
              'border border-white/20 dark:border-gray-800/20',
              'shadow-2xl max-h-screen overflow-y-auto mobile-scrollbar landscape-menu',
              'animate-fade-in-down prevent-horizontal-scroll'
            )}>
            <div className="space-y-1">
              {/* All Navigation Items in Expanded Menu */}
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsExpanded(false)}
                    className={clsx(
                      'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200',
                      'min-h-[44px] touch-manipulation', // Touch-friendly sizing
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      Ctrl+{index + 1}
                    </span>
                  </Link>
                );
              })}
              
              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              
              {/* Mobile Theme Settings Button */}
              <button
                onClick={() => {
                  setThemeSettingsOpen(true);
                  setIsExpanded(false);
                }}
                className={clsx(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left',
                  'min-h-[44px] touch-manipulation',
                  'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                )}
              >
                <CogIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">主题设置</span>
              </button>
              
              {/* Close Button */}
              <button
                onClick={() => setIsExpanded(false)}
                className={clsx(
                  'flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 w-full',
                  'min-h-[44px] touch-manipulation mt-2',
                  'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                )}
              >
                <XMarkIcon className="w-5 h-5" />
                <span className="font-medium">关闭菜单</span>
              </button>
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
      
      {/* 主题设置面板 */}
      <ThemeSettings 
        isOpen={themeSettingsOpen} 
        onClose={() => setThemeSettingsOpen(false)} 
      />
    </>
  );
}