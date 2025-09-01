import { apiClient } from './client';
import { Series, SeriesListResponse, CreateSeriesRequest, UpdateSeriesRequest, ApiResponse } from '../types';

export const seriesApi = {
  // 获取系列列表
  async getSeries(params?: {
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<SeriesListResponse>(`/api/series${queryString ? '?' + queryString : ''}`);
  },

  // 获取单个系列
  async getSeriesById(id: string) {
    return apiClient.get<Series>(`/api/series/${id}`);
  },

  // 根据slug获取系列
  async getSeriesBySlug(slug: string) {
    return apiClient.get<Series>(`/api/series/slug/${slug}`);
  },

  // 创建系列
  async createSeries(data: CreateSeriesRequest) {
    return apiClient.post<Series>('/api/series', data);
  },

  // 更新系列
  async updateSeries(id: string, data: UpdateSeriesRequest) {
    return apiClient.put<Series>(`/api/series/${id}`, data);
  },

  // 删除系列
  async deleteSeries(id: string) {
    return apiClient.delete<{ message: string }>(`/api/series/${id}`);
  },

  // 批量删除系列
  async deleteSeriesBatch(ids: string[]) {
    return apiClient.post<void>('/api/series/batch-delete', { ids });
  },
};