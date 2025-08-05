import { apiClient } from './client';
import { Category, PaginatedResponse } from '../types';

export const categoriesApi = {
  // 获取分类列表
  async getCategories(params?: {
    page?: number;
    limit?: number;
    parentId?: string;
    includeChildren?: boolean;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.parentId) queryParams.append('parentId', params.parentId);
    if (params?.includeChildren) queryParams.append('includeChildren', 'true');
    
    const queryString = queryParams.toString();
    return apiClient.get<PaginatedResponse<Category>>(`/api/categories${queryString ? '?' + queryString : ''}`);
  },

  // 获取分类树结构
  async getCategoryTree() {
    return apiClient.get<Category[]>('/api/categories/tree');
  },

  // 获取单个分类
  async getCategory(id: string) {
    return apiClient.get<Category>(`/api/categories/${id}`);
  },

  // 根据slug获取分类
  async getCategoryBySlug(slug: string) {
    return apiClient.get<Category>(`/api/categories/slug/${slug}`);
  },

  // 创建分类
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
  }) {
    return apiClient.post<Category>('/api/categories', data);
  },

  // 更新分类
  async updateCategory(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: string;
  }) {
    return apiClient.put<Category>(`/api/categories/${id}`, data);
  },

  // 删除分类
  async deleteCategory(id: string) {
    return apiClient.delete<void>(`/api/categories/${id}`);
  },

  // 批量删除分类
  async deleteCategories(ids: string[]) {
    return apiClient.post<void>('/api/categories/batch-delete', { ids });
  },
};