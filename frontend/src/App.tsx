import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// 前台首屏 / 高频访问页面 — 保持 eager，避免首屏 LCP 受 chunk 拉取影响
import HomePage from './pages/HomePage';
import ArticlesPage from './pages/ArticlesPage';
import NotFoundPage from './pages/NotFoundPage';

// 二级前台页面 — lazy，按需加载
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const BlogsPage = lazy(() => import('./pages/BlogsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const TagPage = lazy(() => import('./pages/TagPage'));
const SeriesPage = lazy(() => import('./pages/SeriesPage'));
const SeriesDetailPage = lazy(() => import('./pages/SeriesDetailPage'));
const QuotesPage = lazy(() => import('./pages/QuotesPage'));
const QuoteDetailPage = lazy(() => import('./pages/QuoteDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ArticlePreviewPage = lazy(() => import('./pages/ArticlePreviewPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SubmissionsPage = lazy(() => import('./pages/SubmissionsPage'));
const SubmissionDetailPage = lazy(() => import('./pages/SubmissionDetailPage'));
const SubmissionEditorPage = lazy(() => import('./pages/SubmissionEditorPage'));

// 管理后台 — 全部 lazy
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminArticleList = lazy(() => import('./pages/admin/ArticleList'));
const ArticleEditor = lazy(() => import('./pages/admin/ArticleEditor'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminTags = lazy(() => import('./pages/admin/AdminTags'));
const AdminSeries = lazy(() => import('./pages/admin/AdminSeries'));
const AdminBlogs = lazy(() => import('./pages/admin/AdminBlogs'));
const BlogEditor = lazy(() => import('./pages/admin/BlogEditor'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminSubmissions'));
const AdminStudyPlans = lazy(() => import('./pages/admin/AdminStudyPlans'));
const AdminReminders = lazy(() => import('./pages/admin/AdminReminders'));
const AdminPrompts = lazy(() => import('./pages/admin/AdminPrompts'));
const PromptEditor = lazy(() => import('./pages/admin/PromptEditor'));
const SkillEditor = lazy(() => import('./pages/admin/SkillEditor'));
const AdminAlgorithms = lazy(() => import('./pages/admin/AdminAlgorithms'));
const AlgorithmAssetDetail = lazy(() => import('./pages/admin/AlgorithmAssetDetail'));
const NotebookLMImportCenter = lazy(() => import('./pages/admin/NotebookLMImportCenter'));

// 布局组件
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import PerformanceOptimizer from './components/PerformanceOptimizer';
import AmbientPlayer from './components/AmbientPlayer';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 30 * 60 * 1000, // 30分钟
    },
  },
});

// 路由内容组件，用于检测当前路由
function RouterContent() {
  const location = useLocation();
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

  // 检查当前路径是否需要禁用跳过链接
  const shouldDisableSkipLinks = () => {
    const pathsToDisableSkipLinks = ['/articles', '/quotes'];
    return pathsToDisableSkipLinks.includes(location.pathname);
  };

  // 是否为管理后台路径 - 后台不显示音乐播放器
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <PerformanceOptimizer enableSkipLinks={!shouldDisableSkipLinks()}>
      <div className={`min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300 ${getFontSizeClass()}`}>
        {/* 全局环境音乐播放器 — 位于 Suspense 之外，保证路由切换时不卸载 */}
        {!isAdminRoute && <AmbientPlayer />}
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
            {/* 前台路由 */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="articles" element={<ArticlesPage />} />
              <Route path="article/:slug" element={<ArticlePage />} />
              <Route path="blogs" element={<BlogsPage />} />
              <Route path="blog/:slug" element={<BlogPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="category/:slug" element={<CategoryPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="tag/:slug" element={<TagPage />} />
              <Route path="series" element={<SeriesPage />} />
              <Route path="series/:slug" element={<SeriesDetailPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/:id" element={<QuoteDetailPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="submissions" element={<SubmissionsPage />} />
              <Route path="submissions/new" element={<SubmissionEditorPage />} />
              <Route path="submissions/:id" element={<SubmissionDetailPage />} />
              <Route path="submissions/:id/edit" element={<SubmissionEditorPage />} />
            </Route>

            {/* 文章预览路由 */}
            <Route path="/articles/:id/preview" element={<ArticlePreviewPage />} />

            {/* 管理后台路由 */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="articles" element={<AdminArticleList />} />
              <Route path="articles/new" element={<ArticleEditor />} />
              <Route path="articles/:id/edit" element={<ArticleEditor />} />
              <Route path="blogs" element={<AdminBlogs />} />
              <Route path="blogs/new" element={<BlogEditor />} />
              <Route path="blogs/:id/edit" element={<BlogEditor />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="study-plans" element={<AdminStudyPlans />} />
              <Route path="reminders" element={<AdminReminders />} />
              <Route path="prompts" element={<AdminPrompts />} />
              <Route path="prompts/new" element={<PromptEditor />} />
              <Route path="prompts/:id/edit" element={<PromptEditor />} />
              <Route path="skills" element={<AdminPrompts defaultAssetType="skill" />} />
              <Route path="skills/new" element={<SkillEditor />} />
              <Route path="skills/:id/edit" element={<SkillEditor />} />
              <Route path="algorithms" element={<AdminAlgorithms />} />
              <Route path="algorithms/new" element={<AlgorithmAssetDetail />} />
              <Route path="algorithms/:id" element={<AlgorithmAssetDetail />} />
              <Route path="notebooklm" element={<NotebookLMImportCenter />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="tags" element={<AdminTags />} />
              <Route path="series" element={<AdminSeries />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* 404页面 */}
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
              </Suspense>
      </div>
    </PerformanceOptimizer>
  );
}

// 内部应用组件，用于访问主题上下文
function AppContent() {
  return (
    <Router>
      <RouterContent />
    </Router>
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
