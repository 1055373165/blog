// API响应基础类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  warning?: string;
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
  prompts?: T[];
  skills?: T[];
  submissions?: T[];
  assets?: T[];

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

// 分类树节点（包含文章列表，用于分类维度视图）
export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
  articles?: Article[];
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
  author_display_name?: string; // 每篇文章独立的作者显示名
  category?: Category; // 文章的主分类
  categories?: Category[]; // 支持多分类（向后兼容）
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
  category_id?: number; // 文章分类ID
  tag_ids?: number[];
  series_id?: number;
  series_order?: number;
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  // 每篇文章独立的作者显示名，不影响其他文章
  author_display_name?: string;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: number;
}

export type AiAssetType = 'prompt' | 'skill';
export type AiAssetStatus = 'draft' | 'active' | 'archived';
export type PromptStatus = AiAssetStatus;
export type SkillStatus = AiAssetStatus;

export interface AiAssetBase {
  id: number;
  name: string;
  slug: string;
  description?: string;
  content: string;
  notes?: string;
  status: AiAssetStatus;
  tags: string[];
  parent_id?: number;
  child_count: number;
  author_id: number;
  author?: User;
  created_at: string;
  updated_at: string;
}

export interface Prompt extends AiAssetBase {
  status: PromptStatus;
  applicable_models: string[];
  parent_id?: number;
  parent?: Prompt;
  children?: Prompt[];
}

export interface SkillSupportingFile {
  path: string;
  content: string;
}

export interface Skill extends AiAssetBase {
  status: SkillStatus;
  anthropic_config: Record<string, unknown>;
  supporting_files: SkillSupportingFile[];
  parent?: Skill;
  children?: Skill[];
}

export interface CreateAiAssetInput {
  name: string;
  slug?: string;
  description?: string;
  content: string;
  notes?: string;
  status: AiAssetStatus;
  tags: string[];
  parent_id?: number;
}

export interface CreatePromptInput extends CreateAiAssetInput {
  applicable_models: string[];
}

export interface UpdatePromptInput extends CreatePromptInput {
  id: number;
}

export interface CreateSkillInput extends CreateAiAssetInput {
  anthropic_config: Record<string, unknown>;
  supporting_files: SkillSupportingFile[];
}

export interface UpdateSkillInput extends CreateSkillInput {
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
  // 点赞相关字段 - 每个箴言独立的状态
  isLiked?: boolean;
  likesCount?: number;
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

// 评论相关类型
export interface Comment {
  id: number;
  content: string;
  author: User;
  author_id: number;
  article_id: number;
  parent_id?: number;
  likes_count: number;
  replies_count: number;
  is_liked?: boolean;
  is_approved?: boolean;
  replies?: Comment[];
  depth?: number; // 嵌套深度，用于UI渲染
  created_at: string;
  updated_at: string;
}

// 评论创建请求类型
export interface CreateCommentRequest {
  content: string;
  article_id: number;
  parent_id?: number;
}


// 评论分页响应类型
export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  total_comments: number;
}

// 评论排序选项
export type CommentSortOption = 'newest' | 'oldest' | 'most_liked';

// 评论筛选参数
export interface CommentFilters {
  page?: number;
  limit?: number;
  sort_by?: CommentSortOption;
  parent_id?: number;
}

// 评论表单状态
export interface CommentFormState {
  content: string;
  isSubmitting: boolean;
  replyToId?: number;
  replyToAuthor?: string;
  isDraft: boolean;
}

// 评论操作结果
export interface CommentActionResult {
  success: boolean;
  comment?: Comment;
  error?: string;
}

export type AlgorithmAssetStatus = 'draft' | 'ready' | 'archived';
export type AlgorithmReviewStatus =
  | 'new'
  | 'read'
  | 'failed_recall'
  | 'passed_recall'
  | 'needs_review';
export type AlgorithmDifficulty = '' | 'easy' | 'medium' | 'hard';
export type AlgorithmAssetFileKind = 'markdown' | 'video';
export type AlgorithmAssetFileRole =
  | 'primary_analysis'
  | 'supplement'
  | 'animation'
  | 'alternate_animation';

export interface AlgorithmAssetFile {
  id: number;
  asset_id: number;
  file_kind: AlgorithmAssetFileKind;
  role: AlgorithmAssetFileRole;
  display_name: string;
  original_name: string;
  sort_order: number;
  is_primary: boolean;
  markdown_content?: string;
  storage_url?: string;
  mime_type?: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface AlgorithmAsset {
  id: number;
  title: string;
  slug: string;
  leetcode_id?: number | null;
  source_url?: string;
  source_dir_name: string;
  description?: string;
  difficulty: AlgorithmDifficulty;
  tags: string[];
  status: AlgorithmAssetStatus;
  summary_note?: string;
  weak_points?: string;
  review_status: AlgorithmReviewStatus;
  next_review_at?: string | null;
  primary_markdown_file_id?: number | null;
  primary_video_file_id?: number | null;
  markdown_count: number;
  video_count: number;
  author_id: number;
  author?: User;
  files: AlgorithmAssetFile[];
  primary_markdown_file?: AlgorithmAssetFile;
  primary_video_file?: AlgorithmAssetFile;
  created_at: string;
  updated_at: string;
}

export interface AlgorithmAssetListResponse {
  assets: AlgorithmAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SaveAlgorithmAssetInput {
  title: string;
  slug?: string;
  leetcode_id?: number | null;
  source_url?: string;
  source_dir_name: string;
  description?: string;
  difficulty?: AlgorithmDifficulty;
  tags?: string[];
  status?: AlgorithmAssetStatus;
  summary_note?: string;
  weak_points?: string;
  review_status?: AlgorithmReviewStatus;
  next_review_at?: string | null;
  primary_markdown_file_id?: number | null;
  primary_video_file_id?: number | null;
}

export interface SaveAlgorithmAssetMarkdownFileInput {
  display_name: string;
  original_name?: string;
  role?: Extract<AlgorithmAssetFileRole, 'primary_analysis' | 'supplement'>;
  sort_order?: number;
  is_primary?: boolean;
  markdown_content?: string;
}

export interface SaveAlgorithmAssetVideoFileInput {
  display_name: string;
  original_name?: string;
  role?: Extract<AlgorithmAssetFileRole, 'animation' | 'alternate_animation' | 'supplement'>;
  sort_order?: number;
  is_primary?: boolean;
  storage_url: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface UpdateAlgorithmAssetFileInput {
  display_name: string;
  original_name?: string;
  role?: AlgorithmAssetFileRole;
  sort_order?: number;
  is_primary?: boolean;
  markdown_content?: string;
  storage_url?: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface UpdateAlgorithmAssetPrimaryFilesInput {
  primary_markdown_file_id?: number | null;
  primary_video_file_id?: number | null;
}

export interface UpdateAlgorithmAssetLearningInput {
  summary_note?: string;
  weak_points?: string;
  review_status?: AlgorithmReviewStatus;
  next_review_at?: string | null;
}

export interface UploadMediaResponse {
  url: string;
  filename: string;
  size: number;
  mime_type: string;
}

export type NotebookLMNotebookStatus = 'draft' | 'ready' | 'archived';
export type NotebookLMSourceType = 'web_url' | 'local_file' | 'local_folder' | 'wechat_channel';
export type NotebookLMCaptureMode = 'none' | 'desktop_watch' | 'desktop_watch_with_network_assist';
export type NotebookLMImportJobStatus =
  | 'created'
  | 'awaiting_capture'
  | 'capturing'
  | 'artifact_received'
  | 'processing'
  | 'syncing_to_notebooklm'
  | 'completed'
  | 'completed_with_degradation'
  | 'failed'
  | 'cancelled';

export interface NotebookLMNotebook {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  provider_notebook_id?: string;
  status: NotebookLMNotebookStatus;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookLMImportArtifact {
  id: number;
  job_id: number;
  artifact_kind: string;
  storage_type: string;
  storage_path?: string;
  mime_type?: string;
  file_size: number;
  checksum?: string;
  origin?: string;
  is_primary: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotebookLMCaptureEvent {
  id: number;
  job_id: number;
  event_kind: string;
  summary?: string;
  origin?: string;
  payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotebookLMImportJob {
  id: number;
  user_id: number;
  notebook_id: number;
  notebook?: NotebookLMNotebook;
  source_type: NotebookLMSourceType;
  source_label: string;
  source_input: Record<string, unknown>;
  capture_mode: NotebookLMCaptureMode;
  status: NotebookLMImportJobStatus;
  stage: string;
  progress: number;
  error_code?: string;
  error_message?: string;
  degraded: boolean;
  degraded_reason?: string;
  started_at?: string | null;
  finished_at?: string | null;
  artifacts?: NotebookLMImportArtifact[];
  capture_events?: NotebookLMCaptureEvent[];
  created_at: string;
  updated_at: string;
}

export interface NotebookLMImportJobListResponse {
  jobs: NotebookLMImportJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CreateNotebookLMNotebookInput {
  title: string;
  description?: string;
}

export interface CreateNotebookLMImportJobInput {
  notebook_id: number;
  source_type: NotebookLMSourceType;
  source_label: string;
  source_input: Record<string, unknown>;
  capture_mode?: NotebookLMCaptureMode;
}
