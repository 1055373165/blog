import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// 页面组件
import HomePage from './pages/HomePage';
import ArticlesPage from './pages/ArticlesPage';
import ArticlePage from './pages/ArticlePage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryPage from './pages/CategoryPage';
import TagsPage from './pages/TagsPage';
import TagPage from './pages/TagPage';
import SeriesPage from './pages/SeriesPage';
import SeriesDetailPage from './pages/SeriesDetailPage';
import QuotesPage from './pages/QuotesPage';
import SearchPage from './pages/SearchPage';
import ArticlePreviewPage from './pages/ArticlePreviewPage';
import NotFoundPage from './pages/NotFoundPage';

// 管理后台页面
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArticleList from './pages/admin/ArticleList';
import ArticleEditor from './pages/admin/ArticleEditor';
import AdminCategories from './pages/admin/AdminCategories';
import AdminTags from './pages/admin/AdminTags';

// 布局组件
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import PerformanceOptimizer from './components/PerformanceOptimizer';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

// 内部应用组件，用于访问主题上下文
function AppContent() {
  const { settings } = useTheme();
  
  // 根据字号设置获取基础字号类
  const getFontSizeClass = () => {
    const sizeMap = {
      sm: 'text-sm',
      base: 'text-base', 
      lg: 'text-lg',
      xl: 'text-xl',
    };
    return sizeMap[settings.fontSize] || 'text-base';
  };

  return (
    <PerformanceOptimizer>
      <Router>
        <div className={`min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 ${getFontSizeClass()}`}>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
              {/* 前台路由 */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="articles" element={<ArticlesPage />} />
                <Route path="article/:slug" element={<ArticlePage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="category/:slug" element={<CategoryPage />} />
                <Route path="tags" element={<TagsPage />} />
                <Route path="tag/:slug" element={<TagPage />} />
                <Route path="series" element={<SeriesPage />} />
                <Route path="series/:slug" element={<SeriesDetailPage />} />
                <Route path="quotes" element={<QuotesPage />} />
                <Route path="search" element={<SearchPage />} />
              </Route>

              {/* 文章预览路由 */}
              <Route path="/articles/:id/preview" element={<ArticlePreviewPage />} />

              {/* 管理后台路由 */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="articles" element={<ArticleList />} />
                <Route path="articles/new" element={<ArticleEditor />} />
                <Route path="articles/:id/edit" element={<ArticleEditor />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="tags" element={<AdminTags />} />
              </Route>

              {/* 404页面 */}
              <Route path="*" element={<NotFoundPage />} />
              </Routes>
                </Suspense>
              </div>
            </Router>
    </PerformanceOptimizer>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
