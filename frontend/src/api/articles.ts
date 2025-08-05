import { apiClient } from './client';
import { 
  Article, 
  CreateArticleInput, 
  UpdateArticleInput, 
  PaginatedResponse, 
  SearchFilters,
  SearchResult 
} from '../types';
import { buildQueryString } from '../utils';

export const articlesApi = {
  // 获取文章列表
  async getArticles(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    tagIds?: string[];
    seriesId?: string;
    isPublished?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<Article>>(`/api/articles?${queryString}`);
  },

  // 获取单篇文章
  async getArticle(id: string) {
    return apiClient.get<Article>(`/api/articles/${id}`);
  },

  // 根据slug获取文章
  async getArticleBySlug(slug: string) {
    return apiClient.get<Article>(`/api/articles/slug/${slug}`);
  },

  // 创建文章
  async createArticle(data: CreateArticleInput) {
    return apiClient.post<Article>('/api/articles', data);
  },

  // 更新文章
  async updateArticle(id: string, data: UpdateArticleInput) {
    return apiClient.put<Article>(`/api/articles/${id}`, data);
  },

  // 删除文章
  async deleteArticle(id: string) {
    return apiClient.delete<void>(`/api/articles/${id}`);
  },

  // 批量删除文章
  async deleteArticles(ids: string[]) {
    return apiClient.post<void>('/api/articles/batch-delete', { ids });
  },

  // 发布文章
  async publishArticle(id: string) {
    return apiClient.patch<Article>(`/api/articles/${id}/publish`);
  },

  // 取消发布文章
  async unpublishArticle(id: string) {
    return apiClient.patch<Article>(`/api/articles/${id}/unpublish`);
  },

  // 复制文章
  async duplicateArticle(id: string) {
    return apiClient.post<Article>(`/api/articles/${id}/duplicate`);
  },

  // 增加文章浏览量
  async incrementViews(id: string) {
    return apiClient.post<void>(`/api/articles/${id}/views`);
  },

  // 点赞/取消点赞文章
  async toggleLike(id: string) {
    return apiClient.post<{ liked: boolean; likesCount: number }>(`/api/articles/${id}/like`);
  },

  // 获取相关文章
  async getRelatedArticles(id: string, limit: number = 5) {
    return apiClient.get<Article[]>(`/api/articles/${id}/related?limit=${limit}`);
  },

  // 搜索文章
  async searchArticles(filters: SearchFilters) {
    const queryString = buildQueryString(filters);
    return apiClient.get<SearchResult>(`/api/search?${queryString}`);
  },

  // 获取热门文章
  async getPopularArticles(limit: number = 10, days: number = 30) {
    return apiClient.get<Article[]>(`/api/stats/popular-articles?limit=${limit}&days=${days}`);
  },

  // 获取最新文章
  async getLatestArticles(limit: number = 10) {
    const response = await articlesApi.getArticles({
      page: 1,
      limit,
      isPublished: true,
      sortBy: 'published_at',
      sortOrder: 'desc'
    });
    return { ...response, data: response.data.articles || [] };
  },

  // 获取推荐文章
  async getRecommendedArticles(limit: number = 10) {
    return apiClient.get<Article[]>(`/api/articles/recommended?limit=${limit}`);
  },

  // 按分类获取文章
  async getArticlesByCategory(categoryId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<Article>>(`/api/categories/${categoryId}/articles?${queryString}`);
  },

  // 按标签获取文章
  async getArticlesByTag(tagId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<Article>>(`/api/tags/${tagId}/articles?${queryString}`);
  },

  // 按系列获取文章
  async getArticlesBySeries(seriesId: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<Article>>(`/api/series/${seriesId}/articles?${queryString}`);
  },

  // 获取文章草稿
  async getDrafts(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryString = params ? buildQueryString(params) : '';
    return apiClient.get<PaginatedResponse<Article>>(`/api/articles/drafts?${queryString}`);
  },

  // 保存草稿
  async saveDraft(data: CreateArticleInput) {
    return apiClient.post<Article>('/api/articles/drafts', { ...data, isDraft: true });
  },

  // 从草稿发布
  async publishDraft(id: string) {
    return apiClient.patch<Article>(`/api/articles/${id}/publish-draft`);
  },
};