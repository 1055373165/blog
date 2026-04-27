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
export { promptsApi } from './prompts';
export { skillsApi } from './skills';
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
    const response = await apiClient.upload<{ url: string; filename: string }>('/api/upload/image', file, onProgress);
    console.log('Upload API - uploadImage response:', response);
    
    // 检查响应格式 - 后端可能直接返回上传数据，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response;
    } else if (responseAny && responseAny.url) {
      // 如果后端直接返回上传数据，包装成 ApiResponse 格式
      return {
        success: true,
        data: responseAny,
        message: '上传成功'
      };
    } else {
      console.error('Unexpected upload response format:', response);
      throw new Error('Invalid response format from server');
    }
  },

  async uploadFile(file: File, onProgress?: (progress: number) => void, timeout?: number) {
    const response = await apiClient.upload<{ url: string; filename: string }>('/api/upload/file', file, onProgress, timeout);
    console.log('Upload API - uploadFile response:', response);
    
    // 检查响应格式 - 后端可能直接返回上传数据，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response;
    } else if (responseAny && responseAny.url) {
      // 如果后端直接返回上传数据，包装成 ApiResponse 格式
      return {
        success: true,
        data: responseAny,
        message: '上传成功'
      };
    } else {
      console.error('Unexpected upload response format:', response);
      throw new Error('Invalid response format from server');
    }
  },

  async uploadMedia(file: File, onProgress?: (progress: number) => void, timeout?: number) {
    const response = await apiClient.upload<{ url: string; filename: string; size: number; mime_type: string }>('/api/upload/media', file, onProgress, timeout);
    console.log('Upload API - uploadMedia response:', response);

    // 检查响应格式 - 后端可能直接返回上传数据，而不是包装在 ApiResponse 中
    const responseAny = response as any;

    if (response && response.data) {
      return response;
    } else if (responseAny && responseAny.url) {
      return {
        success: true,
        data: responseAny,
        message: '上传成功'
      };
    } else {
      console.error('Unexpected upload response format:', response);
      throw new Error('Invalid response format from server');
    }
  },
};

// 封面图片相关API
export const coverApi = {
  async getCoverImages() {
    return apiClient.get<{
      images: Array<{
        name: string;
        url: string;
        thumbnail_url: string;
        relative_path: string;
        size: number;
        mod_time: string;
        is_default: boolean;
        category: string;
      }>;
      categories: Array<{
        name: string;
        image_count: number;
      }>;
      total: number;
    }>('/api/cover');
  },

  async getCoverCategories() {
    return apiClient.get<{
      categories: Array<{
        name: string;
        image_count: number;
      }>;
    }>('/api/cover/categories');
  },

  async uploadCoverImage(file: File, category?: string, onProgress?: (progress: number) => void) {
    const fields: Record<string, string> = {};
    if (category) {
      fields.category = category;
    }
    return apiClient.uploadWithFields<{
      url: string;
      thumbnail_url: string;
      filename: string;
      category: string;
      relative_path: string;
      size: number;
      type: string;
    }>('/api/cover/upload', file, fields, onProgress);
  },

  async deleteCoverImage(category: string, filename: string) {
    // For default category, images are at root level
    const path = category === '默认' ? filename : `${category}/${filename}`;
    return apiClient.delete<null>(`/api/cover/images/${encodeURIComponent(path)}`);
  },

  async renameCoverCategory(oldName: string, newName: string) {
    return apiClient.put<null>(`/api/cover/categories/${encodeURIComponent(oldName)}`, { new_name: newName });
  },

  async deleteCoverCategory(name: string) {
    return apiClient.delete<null>(`/api/cover/categories/${encodeURIComponent(name)}`);
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
