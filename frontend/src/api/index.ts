// 导出所有API模块
import { apiClient } from './client';
export { apiClient } from './client';
export { articlesApi } from './articles';
export { categoriesApi } from './categories';
export { tagsApi } from './tags';
export * from './books';

// 认证相关API
export const authApi = {
  async login(email: string, password: string) {
    return apiClient.post<{ token: string; user: any }>('/api/auth/login', {
      email,
      password,
    });
  },

  async logout() {
    return apiClient.post<void>('/api/auth/logout');
  },

  async getProfile() {
    return apiClient.get<any>('/api/auth/profile');
  },

  async updateProfile(data: any) {
    return apiClient.put<any>('/api/auth/profile', data);
  },
};

// 统计相关API
export const statsApi = {
  async getStats() {
    return apiClient.get<{
      totalArticles: number;
      publishedArticles: number;
      totalViews: number;
      totalLikes: number;
      totalCategories: number;
      totalTags: number;
    }>('/api/stats');
  },

  async getPopularArticles(days: number = 30) {
    return apiClient.get<any[]>(`/api/stats/popular-articles?days=${days}`);
  },

  async getViewsStats(days: number = 30) {
    return apiClient.get<any[]>(`/api/stats/views?days=${days}`);
  },
};

// 文件上传相关API
export const uploadApi = {
  async uploadImage(file: File, onProgress?: (progress: number) => void) {
    return apiClient.upload<{ url: string; filename: string }>('/api/upload/image', file, onProgress);
  },

  async uploadFile(file: File, onProgress?: (progress: number) => void) {
    return apiClient.upload<{ url: string; filename: string }>('/api/upload/file', file, onProgress);
  },
};