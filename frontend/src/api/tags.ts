import { apiClient } from './client';
import { Tag, PaginatedResponse } from '../types';

export const tagsApi = {
  // 获取标签列表
  async getTags(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'articlesCount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    return apiClient.get<PaginatedResponse<Tag>>(`/api/tags${queryString ? '?' + queryString : ''}`);
  },

  // 获取热门标签
  async getPopularTags(limit: number = 20) {
    return apiClient.get<Tag[]>(`/api/tags/popular?limit=${limit}`);
  },

  // 获取单个标签
  async getTag(id: string) {
    return apiClient.get<Tag>(`/api/tags/${id}`);
  },

  // 根据slug获取标签
  async getTagBySlug(slug: string) {
    return apiClient.get<Tag>(`/api/tags/slug/${slug}`);
  },

  // 创建标签
  async createTag(data: {
    name: string;
    slug?: string;
    color?: string;
  }) {
    return apiClient.post<Tag>('/api/tags', data);
  },

  // 更新标签
  async updateTag(id: string, data: {
    name?: string;
    slug?: string;
    color?: string;
  }) {
    return apiClient.put<Tag>(`/api/tags/${id}`, data);
  },

  // 删除标签
  async deleteTag(id: string) {
    return apiClient.delete<void>(`/api/tags/${id}`);
  },

  // 批量删除标签
  async deleteTags(ids: string[]) {
    return apiClient.post<void>('/api/tags/batch-delete', { ids });
  },

  // 搜索标签
  async searchTags(query: string, limit: number = 10) {
    return apiClient.get<Tag[]>(`/api/tags/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },
};