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
  CogIcon,
  VideoCameraIcon,
  UserIcon,
  ArrowRightEndOnRectangleIcon,
  UserCircleIcon,
  PlusIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import type { ColorTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ThemeSettings from './ThemeSettings';
import AuthModal from './AuthModal';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
}

// 定义导航项优先级
interface PrioritizedNavigationItem extends NavigationItem {
  priority: 'primary' | 'secondary';
  mobileOrder?: number;
}

const navigationItems: PrioritizedNavigationItem[] = [
  { name: '首页', href: '/', icon: HomeIcon, description: '回到首页', priority: 'primary', mobileOrder: 1 },
  { name: '文章', href: '/articles', icon: DocumentTextIcon, description: '技术文章', priority: 'primary', mobileOrder: 2 },
  { name: '搜索', href: '/search', icon: MagnifyingGlassIcon, description: '搜索内容', priority: 'primary', mobileOrder: 3 },
  { name: '博客', href: '/blogs', icon: VideoCameraIcon, description: '音频视频博客', priority: 'secondary', mobileOrder: 4 },
  { name: '分类', href: '/categories', icon: FolderIcon, description: '文章分类', priority: 'secondary', mobileOrder: 5 },
  { name: '标签', href: '/tags', icon: TagIcon, description: '文章标签', priority: 'secondary', mobileOrder: 6 },
  { name: '系列', href: '/series', icon: BookOpenIcon, description: '文章系列', priority: 'secondary', mobileOrder: 7 },
  { name: '箴言', href: '/quotes', icon: ChatBubbleBottomCenterTextIcon, description: '技术箴言', priority: 'secondary', mobileOrder: 8 },
];

// 分离主要和次要导航项
const primaryNavItems = navigationItems.filter(item => item.priority === 'primary');
const secondaryNavItems = navigationItems.filter(item => item.priority === 'secondary');

interface FloatingNavigationProps {
  className?: string;
}

export default function FloatingNavigation({ className }: FloatingNavigationProps) {
  const location = useLocation();
  const { settings, isDark, updateColorTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const [isTogglingTheme, setIsTogglingTheme] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // 处理用户登录
  const handleLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  // 处理用户注册
  const handleRegister = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  // 处理用户登出
  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 移动端检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // 更新指示器位置 - 仅在桌面端生效
  useEffect(() => {
    if (!isMobile && indicatorRef.current && navRef.current) {
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
  }, [activeIndex, isExpanded, isMobile]);

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 移动端菜单体验优化
  useEffect(() => {
    // 阻止背景滚动
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 点击外部关闭菜单
    const handleClickOutside = (event: MouseEvent) => {
      // 检查是否有PhotoProvider活跃
      const photoViewPortal = document.querySelector('.PhotoView-Portal');
      if (photoViewPortal) {
        // 如果PhotoProvider活跃，不处理点击事件，让PhotoProvider处理
        return;
      }

      // 关闭移动端菜单
      if (
        isExpanded &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !navRef.current?.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }

      // 关闭用户菜单
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };

    // ESC键关闭菜单
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // 检查是否有PhotoProvider活跃（通过检查是否存在PhotoView-Portal元素）
        const photoViewPortal = document.querySelector('.PhotoView-Portal');
        if (photoViewPortal) {
          // 如果PhotoProvider活跃，不处理ESC键，让PhotoProvider处理
          return;
        }

        if (isExpanded) {
          setIsExpanded(false);
        }
        if (userMenuOpen) {
          setUserMenuOpen(false);
        }
      }
    };

    if (isExpanded || userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded, userMenuOpen]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const shortcuts: { [key: string]: string } = {
          '1': '/',
          '2': '/articles',
          '3': '/blogs',
          '4': '/categories',
          '5': '/tags',
          '6': '/series',
          '7': '/quotes',
          '8': '/search'
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
          'relative transition-all duration-500',
          'bg-white/80 dark:bg-gray-900/80',
          'border-white/20 dark:border-gray-800/20',
          'shadow-2xl shadow-black/10 dark:shadow-black/20',
          isScrolled && 'shadow-4xl',
          'hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
          // Mobile-specific styles
          isMobile
            ? 'px-3 py-2 rounded-xl border backdrop-blur-md'
            : 'px-6 py-3 rounded-2xl border backdrop-blur-xl'
        )}>
          {/* 背景装饰 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/5 via-transparent to-go-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* 导航项容器 */}
          <div className="relative flex items-center space-x-1">
            {/* 活跃指示器 - 仅在桌面端显示 */}
            {!isMobile && (
              <div
                ref={indicatorRef}
                className="absolute top-0 bottom-0 bg-gradient-to-r from-primary-500/20 to-go-500/20 rounded-xl transition-all duration-300 ease-out"
                style={{ left: 0, width: 0 }}
              />
            )}

            {/* 导航项 - 响应式布局 */}
            <nav ref={navRef} className="flex items-center space-x-1">
              {/* 桌面端：显示所有导航项 */}
              {!isMobile && navigationItems.map((item, index) => {
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
                        'w-4 h-4 transition-all duration-300 flex-shrink-0',
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      )} />
                      <span className="text-sm whitespace-nowrap">{item.name}</span>
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

              {/* 移动端：只显示主要导航项 */}
              {isMobile && primaryNavItems.map((item) => {
                const allItemIndex = navigationItems.findIndex(navItem => navItem.href === item.href);
                const isActive = activeIndex === allItemIndex;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={clsx(
                      'relative p-2 rounded-lg transition-all duration-300 group',
                      'min-h-[40px] min-w-[40px] touch-manipulation',
                      'flex items-center justify-center',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    title={item.description}
                    aria-label={item.name}
                  >
                    <Icon className={clsx(
                      'w-5 h-5 transition-all duration-300 flex-shrink-0',
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    )} />
                  </Link>
                );
              })}
            </nav>

            {/* 分隔线 - 桌面端显示 */}
            {!isMobile && <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />}

































            {/* 用户按钮 */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={clsx(
                    'p-2 rounded-xl transition-all duration-300 group',
                    'min-h-[44px] min-w-[44px] touch-manipulation',
                    'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                    'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700',
                    userMenuOpen && 'bg-gray-100 dark:bg-gray-800'
                  )}
                  title={`${user?.name || '用户'} (${user?.email})`}
                  aria-label="用户菜单"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-6 h-6" />
                  )}
                </button>

                {/* 用户下拉菜单 */}
                {userMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className={clsx(
                      'absolute top-full right-0 mt-2 w-56 rounded-xl backdrop-blur-xl transition-all duration-200 z-50',
                      'bg-white/95 dark:bg-gray-900/95',
                      'border border-white/30 dark:border-gray-800/30',
                      'shadow-2xl shadow-black/20'
                    )}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="w-10 h-10 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={clsx(
                          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                          'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <UserIcon className="w-5 h-5" />
                        <span>个人资料</span>
                      </Link>

                      <Link
                        to="/submissions"
                        onClick={() => setUserMenuOpen(false)}
                        className={clsx(
                          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                          'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <DocumentPlusIcon className="w-5 h-5" />
                        <span>我的投稿</span>
                      </Link>

                      <Link
                        to="/submissions/new"
                        onClick={() => setUserMenuOpen(false)}
                        className={clsx(
                          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                          'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>新建投稿</span>
                      </Link>

                      {user?.is_admin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className={clsx(
                            'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                        >
                          <CogIcon className="w-5 h-5" />
                          <span>后台管理</span>
                        </Link>
                      )}

                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                      <button
                        onClick={handleLogout}
                        className={clsx(
                          'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors w-full text-left',
                          'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        )}
                      >
                        <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-300 group',
                  'min-h-[44px] min-w-[44px] touch-manipulation',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                )}
                title="登录"
                aria-label="登录"
              >
                <UserCircleIcon className="w-6 h-6" />
              </button>
            )}

            {/* 主题切换 */}
            <button
              onClick={toggleTheme}
              disabled={isTogglingTheme}
              className={clsx(
                'p-2 rounded-xl transition-all duration-300 group',
                'min-h-[44px] min-w-[44px] touch-manipulation', // Proper touch target
                'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700',
                isTogglingTheme && 'scale-95 opacity-75'
              )}
              title={`切换主题模式 (当前: ${isDark ? '暗黑' : '明亮'})`}
              aria-label={`切换到${isDark ? '明亮' : '暗黑'}主题`}
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

            {/* 主题设置 - 桌面端显示 */}
            {!isMobile && (
              <button
                onClick={() => setThemeSettingsOpen(true)}
                className={clsx(
                  'p-2 rounded-xl transition-all duration-300 group items-center justify-center',
                  'min-h-[44px] min-w-[44px] touch-manipulation',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                )}
                title="主题设置"
                aria-label="打开主题设置"
              >
                <CogIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}

            {/* 移动端菜单按钮 - 仅在移动端显示 */}
            {isMobile && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={clsx(
                  'p-2 rounded-lg transition-all duration-300',
                  'min-h-[40px] min-w-[40px] touch-manipulation',
                  'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700',
                  isExpanded && 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                )}
                aria-label={isExpanded ? '关闭菜单' : '打开更多功能'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <XMarkIcon className="w-5 h-5" />
                ) : (
                  <Bars3Icon className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 移动端展开菜单 - 优化布局 */}
        {isMobile && isExpanded && (
          <div
            ref={mobileMenuRef}
            className={clsx(
              'absolute top-full left-0 right-0 mt-2 rounded-xl backdrop-blur-md transition-all duration-300 z-50',
              'bg-white/95 dark:bg-gray-900/95',
              'border border-white/30 dark:border-gray-800/30',
              'shadow-xl shadow-black/15'
            )}>
            {/* 次要导航项 */}
            <div className="p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                内容分类
              </div>
              <div className="space-y-1">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsExpanded(false)}
                      className={clsx(
                        'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'min-h-[44px] touch-manipulation',
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 设置区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                设置
              </div>
              <div className="space-y-1">
                {/* 主题设置 */}
                <button
                  onClick={() => {
                    setThemeSettingsOpen(true);
                    setIsExpanded(false);
                  }}
                  className={clsx(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'min-h-[44px] touch-manipulation w-full text-left',
                    'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                  )}
                >
                  <CogIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">主题设置</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* 回到顶部按钮 - 响应式 */}
      {isScrolled && (
        <button
          onClick={scrollToTop}
          className={clsx(
            'fixed z-50 rounded-full backdrop-blur-md transition-all duration-500',
            'bg-white/80 dark:bg-gray-900/80',
            'border border-white/20 dark:border-gray-800/20',
            'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400',
            'hover:scale-110 hover:-translate-y-1 group',
            // 移动端样式
            isMobile
              ? 'bottom-6 right-4 p-2.5 shadow-lg hover:shadow-xl'
              : 'bottom-8 right-8 p-3 shadow-2xl hover:shadow-4xl'
          )}
          title="回到顶部"
        >
          <ChevronUpIcon className={clsx(
            'group-hover:-translate-y-1 transition-transform',
            isMobile ? 'w-5 h-5' : 'w-6 h-6'
          )} />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-go-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* 主题设置面板 */}
      <ThemeSettings
        isOpen={themeSettingsOpen}
        onClose={() => setThemeSettingsOpen(false)}
      />

      {/* 登录注册模态框 */}
      <AuthModal
        isOpen={authModalOpen}
        defaultMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}