import { apiClient } from './client';
import {
  Comment,
  CommentsResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters
} from '../types';

export const commentsApi = {
  // 获取文章评论列表
  async getComments(articleId: string, filters?: CommentFilters): Promise<CommentsResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.parent_id) params.append('parent_id', filters.parent_id.toString());

    const queryString = params.toString();
    const response = await apiClient.get<CommentsResponse>(
      `/api/articles/${articleId}/comments${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  // 发布新评论
  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const response = await apiClient.post<Comment>(
      `/api/articles/${data.article_id}/comments`,
      data
    );
    return response.data;
  },

  // 回复评论
  async replyToComment(commentId: number, data: CreateCommentRequest): Promise<Comment> {
    const response = await apiClient.post<Comment>(
      `/api/comments/${commentId}/reply`,
      data
    );
    return response.data;
  },

  // 点赞/取消点赞评论
  async toggleCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    const response = await apiClient.post<{ liked: boolean; likes_count: number }>(
      `/api/comments/${commentId}/like`
    );
    return response.data;
  },

  // 更新评论内容
  async updateComment(commentId: number, data: UpdateCommentRequest): Promise<Comment> {
    const response = await apiClient.put<Comment>(
      `/api/comments/${commentId}`,
      data
    );
    return response.data;
  },

  // 删除评论
  async deleteComment(commentId: number): Promise<void> {
    await apiClient.delete(`/api/comments/${commentId}`);
  },

  // 获取单个评论（包含回复）
  async getComment(commentId: number): Promise<Comment> {
    const response = await apiClient.get<Comment>(`/api/comments/${commentId}`);
    return response.data;
  },

  // 获取评论的回复列表
  async getCommentReplies(commentId: number, filters?: CommentFilters): Promise<CommentsResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);

    const queryString = params.toString();
    const response = await apiClient.get<CommentsResponse>(
      `/api/comments/${commentId}/replies${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  // 批量操作：获取多篇文章的评论数
  async getArticleCommentCounts(articleIds: number[]): Promise<Record<number, number>> {
    const response = await apiClient.post<Record<number, number>>(
      '/api/comments/counts',
      { article_ids: articleIds }
    );
    return response.data;
  },

  // 举报评论
  async reportComment(commentId: number, reason: string): Promise<void> {
    await apiClient.post(`/api/comments/${commentId}/report`, { reason });
  },

  // 管理员审核评论
  async approveComment(commentId: number): Promise<Comment> {
    const response = await apiClient.post<Comment>(`/api/comments/${commentId}/approve`);
    return response.data;
  },

  // 管理员拒绝评论
  async rejectComment(commentId: number): Promise<void> {
    await apiClient.post(`/api/comments/${commentId}/reject`);
  }
};