// API响应基础类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 用户相关类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// 分类相关类型
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
}

// 标签相关类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
}

// 系列相关类型
export interface Series {
  id: string;
  name: string;
  slug: string;
  description?: string;
  articlesCount: number;
  createdAt: string;
  updatedAt: string;
}

// 文章相关类型
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  isPublished: boolean;
  isDraft: boolean;
  publishedAt?: string;
  readingTime: number;
  viewsCount: number;
  likesCount: number;
  
  // 关联数据
  author: User;
  categoryId?: string;
  category?: Category;
  tags: Tag[];
  seriesId?: string;
  series?: Series;
  seriesOrder?: number;
  
  // SEO相关
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  
  createdAt: string;
  updatedAt: string;
}

// 文章创建/更新输入类型
export interface CreateArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  categoryId?: string;
  tagIds?: string[];
  seriesId?: string;
  seriesOrder?: number;
  isPublished: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: string;
}

// 搜索相关类型
export interface SearchFilters {
  query?: string;
  categoryId?: string;
  tagIds?: string[];
  seriesId?: string;
  dateFrom?: string;
  dateTo?: string;
  isPublished?: boolean;
  sortby?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewsCount' | 'likesCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  articles: Article[];
  categories: Category[];
  tags: Tag[];
  series: Series[];
  total: number;
}

// 统计相关类型
export interface BlogStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  totalLikes: number;
  totalCategories: number;
  totalTags: number;
  totalSeries: number;
}

// 组件Props类型
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showSizeChanger?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
  loading?: boolean;
}

export interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  categories: Category[];
  tags: Tag[];
  series: Series[];
}

// 主题相关类型
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

// 通知相关类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 表单相关类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

// 路由相关类型
export interface NavItem {
  name: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  adminOnly?: boolean;
}