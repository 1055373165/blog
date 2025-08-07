import apiClient from '../api/client';
import { PaginatedResponse } from '../types';

export interface Series {
  id: number;
  name: string;
  slug: string;
  description: string;
  articles_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  author_id: number;
  category_id: number | null;
  series_id: number | null;
  series_order: number | null;
  views_count: number;
  likes_count: number;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    username: string;
    email: string;
    avatar: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  series?: {
    id: number;
    name: string;
    slug: string;
  };
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

class SeriesApi {
  // 获取所有系列
  async getSeries(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Series>> {
    const response = await apiClient.get(`/api/series?page=${page}&limit=${limit}`);
    return {
      items: response.data.series,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.total_pages,
    };
  }

  // 根据ID获取系列
  async getSeriesById(id: number): Promise<Series> {
    const response = await apiClient.get(`/api/series/${id}`);
    return response.data;
  }

  // 根据slug获取系列
  async getSeriesBySlug(slug: string): Promise<Series> {
    const response = await apiClient.get(`/api/series/slug/${slug}`);
    return response.data;
  }

  // 获取系列下的文章
  async getArticlesBySeries(id: number, page: number = 1, limit: number = 10): Promise<PaginatedResponse<Article>> {
    const response = await apiClient.get(`/api/series/${id}/articles?page=${page}&limit=${limit}`);
    return {
      items: response.data.articles,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.total_pages,
    };
  }

  // 根据系列slug获取文章
  async getArticlesBySeriesSlug(slug: string, page: number = 1, limit: number = 10): Promise<{ series: Series } & PaginatedResponse<Article>> {
    const response = await apiClient.get(`/api/series/slug/${slug}/articles?page=${page}&limit=${limit}`);
    return {
      series: response.data.series,
      items: response.data.articles,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
      totalPages: response.data.pagination.total_pages,
    };
  }

  // 创建系列 (需要管理员权限)
  async createSeries(data: { name: string; slug: string; description?: string }): Promise<Series> {
    const response = await apiClient.post('/api/series', data);
    return response.data;
  }

  // 更新系列 (需要管理员权限)
  async updateSeries(id: number, data: { name?: string; slug?: string; description?: string }): Promise<Series> {
    const response = await apiClient.put(`/api/series/${id}`, data);
    return response.data;
  }

  // 删除系列 (需要管理员权限)
  async deleteSeries(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/series/${id}`);
    return response.data;
  }
}

export default new SeriesApi();