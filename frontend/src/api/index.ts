// 导出所有API模块
import { apiClient } from './client';
import type { 
  User, 
  Article, 
  Submission, 
  CreateSubmissionRequest, 
  UpdateSubmissionRequest,
  ReviewSubmissionRequest,
  PaginatedResponse,
  BlogStats
} from '../types';

export { apiClient } from './client';
export { articlesApi } from './articles';
export { categoriesApi } from './categories';
export { tagsApi } from './tags';
export { seriesApi } from './series';
export { commentsApi } from './comments';
export * from './books';

// 认证相关API
export const authApi = {
  async register(data: { email: string; name: string; password: string; github_url?: string; bio?: string }) {
    return apiClient.post<{ token: string; user: User }>('/api/auth/register', data);
  },

  async login(email: string, password: string) {
    return apiClient.post<{ token: string; user: User }>('/api/auth/login', {
      email,
      password,
    });
  },

  async logout() {
    return apiClient.post<void>('/api/auth/logout');
  },

  async getProfile() {
    return apiClient.get<User>('/api/auth/profile');
  },

  async updateProfile(data: Partial<User>) {
    return apiClient.put<User>('/api/auth/profile', data);
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return apiClient.post<void>('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};

// 统计相关API
export const statsApi = {
  async getStats() {
    return apiClient.get<BlogStats>('/api/stats');
  },

  async getPopularArticles(days: number = 30) {
    return apiClient.get<Article[]>(`/api/stats/popular-articles?days=${days}`);
  },

  async getViewsStats(days: number = 30) {
    return apiClient.get<{ date: string; views: number }[]>(`/api/stats/views?days=${days}`);
  },
};

// 文件上传相关API
export const uploadApi = {
  async uploadImage(file: File, onProgress?: (progress: number) => void) {
    return apiClient.upload<{ url: string; filename: string }>('/api/upload/image', file, onProgress);
  },

  async uploadFile(file: File, onProgress?: (progress: number) => void, timeout?: number) {
    return apiClient.upload<{ url: string; filename: string }>('/api/upload/file', file, onProgress, timeout);
  },
};

// 封面图片相关API
export const coverApi = {
  async getCoverImages() {
    return apiClient.get<{
      images: Array<{
        name: string;
        url: string;
        relative_path: string;
        size: number;
        mod_time: string;
        is_default: boolean;
      }>;
      total: number;
    }>('/api/cover');
  },

  async uploadCoverImage(file: File, onProgress?: (progress: number) => void) {
    return apiClient.upload<{
      url: string;
      filename: string;
      relative_path: string;
      size: number;
      type: string;
    }>('/api/cover/upload', file, onProgress);
  },
};

// 投稿相关API
export const submissionsApi = {
  async createSubmission(data: CreateSubmissionRequest) {
    return apiClient.post<Submission>('/api/submissions', data);
  },

  async getMySubmissions(params?: { page?: number; limit?: number; status?: string; type?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    
    const queryString = query.toString();
    return apiClient.get<PaginatedResponse<Submission>>(`/api/submissions/my${queryString ? '?' + queryString : ''}`);
  },

  async getSubmission(id: number) {
    return apiClient.get<Submission>(`/api/submissions/${id}`);
  },

  async updateSubmission(id: number, data: UpdateSubmissionRequest) {
    return apiClient.put<Submission>(`/api/submissions/${id}`, data);
  },

  async submitSubmission(id: number) {
    return apiClient.post<void>(`/api/submissions/${id}/submit`);
  },

  async deleteSubmission(id: number) {
    return apiClient.delete<void>(`/api/submissions/${id}`);
  },

  // 管理员API
  async getAllSubmissions(params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);
    
    const queryString = query.toString();
    return apiClient.get<PaginatedResponse<Submission>>(`/api/submissions/admin/all${queryString ? '?' + queryString : ''}`);
  },

  async reviewSubmission(id: number, data: ReviewSubmissionRequest) {
    return apiClient.post<void>(`/api/submissions/${id}/review`, data);
  },

  async publishSubmission(id: number) {
    return apiClient.post<{ article_id: number; article_slug: string }>(`/api/submissions/${id}/publish`);
  },
};