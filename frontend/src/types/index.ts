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
  current_page: number;
  per_page: number;
  total_pages: number;

  // The backend uses different keys for the items array based on the endpoint.
  // To handle this without breaking existing code, we'll add them as optional fields.
  articles?: T[];
  categories?: T[];
  tags?: T[];
  submissions?: T[];

  // Compatibility aliases
  page?: number;
  limit?: number;
  totalPages?: number;
  pagination?: {
    current: number;
    total: number;
    per_page: number;
    total_pages: number;
  };
}

// 系列分页响应类型 - 匹配后端实际格式
export interface SeriesListResponse {
  series: Series[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// 用户相关类型
export interface User {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  github_url?: string;
  bio?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 分类相关类型
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  parent?: Category;
  children?: Category[];
  articles_count: number;
  created_at: string;
  updated_at: string;
}

// 分类创建请求类型
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number;
}

// 分类更新请求类型
export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: number;
}

// 标签相关类型
export interface Tag {
  id: number;
  name: string;
  slug: string;
  color?: string;
  articles_count: number;
  created_at: string;
  updated_at: string;
}

// 系列相关类型
export interface Series {
  id: number;
  name: string;
  slug: string;
  description?: string;
  articles_count: number;
  created_at: string;
  updated_at: string;
}

// 文章相关类型
export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string;
  is_published: boolean;
  is_draft: boolean;
  published_at?: string;
  reading_time: number;
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  
  // 关联数据
  author: User;
  author_id: number;
  categories?: Category[];
  tags: Tag[];
  series_id?: number;
  series?: Series;
  series_order?: number;
  
  // SEO相关
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  
  created_at: string;
  updated_at: string;
}

// 文章创建/更新输入类型
export interface CreateArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  category_ids?: number[];
  tag_ids?: number[];
  series_id?: number;
  series_order?: number;
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  // 新增：可选作者显示名，供后台编辑时更新作者信息
  author_name?: string;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: number;
}

// 分类创建/更新输入类型
export interface CreateCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
}

// 系列创建/更新请求类型
export interface CreateSeriesRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateSeriesRequest extends Partial<CreateSeriesRequest> {
}

// 搜索相关类型
export interface SearchFilters {
  query?: string;
  category_ids?: number[];
  tag_ids?: number[];
  series_id?: number;
  date_from?: string;
  date_to?: string;
  is_published?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'published_at' | 'views_count' | 'likes_count' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface SearchResult {
  articles: Article[];
  categories: Category[];
  tags: Tag[];
  series: Series[];
  total: number;
}

// 投稿相关类型
export interface Submission {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'published';
  type: 'article' | 'blog';
  submitted_at?: string;
  reviewed_at?: string;
  review_notes?: string;
  reading_time: number;
  author_id: number;
  category_ids?: number[];
  series_id?: number;
  reviewer_id?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  created_at: string;
  updated_at: string;
  author: User;
  categories?: Category[];
  series?: Series;
  reviewer?: User;
  tags: Tag[];
}

export interface CreateSubmissionRequest {
  title: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  type: 'article' | 'blog';
  category_ids?: number[];
  series_id?: number;
  tag_ids?: number[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface UpdateSubmissionRequest extends Partial<CreateSubmissionRequest> {
}

export interface ReviewSubmissionRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}

// 统计相关类型
export interface BlogStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles?: number;
  totalViews: number;
  totalLikes: number;
  totalCategories: number;
  totalTags: number;
  totalSeries?: number;
}

// 组件Props类型
export interface PaginationProps {
  current_page: number;
  total_pages: number;
  onPageChange: (page: number) => void;
  show_size_changer?: boolean;
  page_size?: number;
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

// 箴言相关类型
export type QuoteCategory = 'programming' | 'architecture' | 'management' | 'philosophy' | 'design';


export interface Quote {
  id: string;
  text: string;
  author: string;
  source?: string;
  category: QuoteCategory;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
  // 新增中文解释字段
  chineseExplanation?: string;
}

export interface QuoteFilters {
  search?: string;
  category?: QuoteCategory;
  tags?: string[];
  difficulty?: Quote['difficulty'];
}


// 箴言视图模式类型
export type ViewMode = 'grid' | 'list' | 'detailed' | 'masonry';

export interface ViewModeConfig {
  mode: ViewMode;
  label: string;
  description: string;
  icon: string;
}

// 博客相关类型
export interface Blog {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  type: 'audio' | 'video';
  
  // 媒体文件信息
  media_url: string;
  thumbnail?: string;
  duration: number; // 时长（秒）
  file_size: number; // 文件大小（字节）
  mime_type?: string;
  
  // 音频文件信息
  audio_url?: string;
  audio_duration?: number;
  audio_file_size?: number;
  audio_mime_type?: string;
  
  // 状态字段
  is_published: boolean;
  is_draft: boolean;
  published_at?: string;
  
  // 统计字段
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  
  // 关联数据
  author: User;
  author_id: number;
  categories?: Category[];
  tags: Tag[];
  
  // SEO相关
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  
  created_at: string;
  updated_at: string;
}

// 博客创建/更新输入类型
export interface CreateBlogInput {
  title: string;
  description?: string;
  content?: string;
  type: 'audio' | 'video';
  media_url: string;
  thumbnail?: string;
  duration?: number;
  file_size?: number;
  mime_type?: string;
  // 音频文件相关字段
  audio_url?: string;
  audio_duration?: number;
  audio_file_size?: number;
  audio_mime_type?: string;
  category_ids?: number[];
  tag_ids?: number[];
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface UpdateBlogInput extends Partial<CreateBlogInput> {
  id: number;
}

// 博客分页响应类型
export interface BlogListResponse {
  blogs: Blog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// 博客筛选类型
export interface BlogFilters {
  search?: string;
  type?: 'audio' | 'video';
  category_ids?: number[];
  tag_ids?: number[];
  is_published?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'published_at' | 'views_count' | 'likes_count' | 'title' | 'duration';
  sort_order?: 'asc' | 'desc';
}