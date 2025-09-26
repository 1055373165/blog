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
    console.log('Comments API - getComments response:', response);
    
    // 检查响应格式 - 后端可能直接返回评论数据，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response.data;
    } else if (responseAny && responseAny.comments) {
      // 如果后端直接返回评论数据
      return responseAny as CommentsResponse;
    } else {
      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from server');
    }
  },

  // 发布新评论
  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const response = await apiClient.post<Comment>(
      `/api/articles/${data.article_id}/comments`,
      data
    );
    console.log('Comments API - createComment response:', response);
    
    // 检查响应格式 - 后端可能直接返回评论对象，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response.data;
    } else if (responseAny && responseAny.id) {
      // 如果后端直接返回评论对象
      return responseAny as Comment;
    } else {
      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from server');
    }
  },

  // 回复评论
  async replyToComment(commentId: number, data: CreateCommentRequest): Promise<Comment> {
    // 回复使用相同的创建评论端点，但在请求体中包含 parent_id
    const replyData = {
      ...data,
      parent_id: commentId
    };
    
    const response = await apiClient.post<Comment>(
      `/api/articles/${data.article_id}/comments`,
      replyData
    );
    console.log('Comments API - replyToComment response:', response);
    
    // 检查响应格式 - 后端可能直接返回评论对象，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response.data;
    } else if (responseAny && responseAny.id) {
      // 如果后端直接返回评论对象
      return responseAny as Comment;
    } else {
      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from server');
    }
  },

  // 点赞/取消点赞评论
  async toggleCommentLike(commentId: number): Promise<{ liked: boolean; likes_count: number }> {
    const response = await apiClient.post<{ liked: boolean; likes_count: number }>(
      `/api/comments/${commentId}/like`
    );
    console.log('Comments API - toggleCommentLike response:', response);
    
    // 检查响应格式 - 后端可能直接返回点赞数据，而不是包装在 ApiResponse 中
    const responseAny = response as any;
    
    if (response && response.data) {
      // 如果是 ApiResponse 格式
      return response.data;
    } else if (responseAny && typeof responseAny.liked === 'boolean') {
      // 如果后端直接返回点赞数据
      return responseAny as { liked: boolean; likes_count: number };
    } else {
      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from server');
    }
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