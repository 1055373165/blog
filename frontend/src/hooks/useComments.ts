import { useState, useCallback, useEffect } from 'react';
import { commentsApi } from '../api';
import {
  Comment,
  CommentFilters,
  CommentSortOption,
  CreateCommentRequest,
  CommentsResponse
} from '../types';

export interface UseCommentsOptions {
  articleId: string;
  initialSort?: CommentSortOption;
  pageSize?: number;
}

export interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  totalComments: number;
  hasMore: boolean;
  sortBy: CommentSortOption;
  setSortBy: (sort: CommentSortOption) => void;
  addComment: (data: CreateCommentRequest) => Promise<Comment>;
  replyToComment: (parentId: number, data: CreateCommentRequest) => Promise<Comment>;
  toggleLike: (commentId: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateCommentInList: (commentId: number, updates: Partial<Comment>) => void;
  removeCommentFromList: (commentId: number) => void;
  editComment: (commentId: number, content: string) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
}

export function useComments({
  articleId,
  initialSort = 'newest',
  pageSize = 10
}: UseCommentsOptions): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalComments, setTotalComments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<CommentSortOption>(initialSort);

  // 构建嵌套评论结构
  const buildCommentTree = useCallback((flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const rootComments: Comment[] = [];

    // 过滤掉无效的评论并初始化所有评论，添加 replies 数组
    flatComments.filter(comment => comment && comment.id).forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [], depth: 0 });
    });

    // 构建树结构
    flatComments.filter(comment => comment && comment.id).forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id);
      if (!commentWithReplies) return;

      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          commentWithReplies.depth = (parent.depth || 0) + 1;
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    // 递归排序评论及其回复
    const sortComments = (commentsList: Comment[]): Comment[] => {
      return commentsList
        .sort((a, b) => {
          switch (sortBy) {
            case 'newest':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'oldest':
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'most_liked':
              return b.likes_count - a.likes_count;
            default:
              return 0;
          }
        })
        .map(comment => ({
          ...comment,
          replies: comment.replies ? sortComments(comment.replies) : []
        }));
    };

    return sortComments(rootComments);
  }, [sortBy]);

  // 加载评论
  const loadComments = useCallback(async (page: number = 1, sort: CommentSortOption = sortBy) => {
    try {
      const isFirstPage = page === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const filters: CommentFilters = {
        page,
        limit: pageSize,
        sort_by: sort
      };

      const response = await commentsApi.getComments(articleId, filters);

      // 验证响应数据结构 - 处理可能的不同响应格式
      console.log('Comments API response:', response);
      
      let comments: Comment[] = [];
      let totalComments = 0;
      let pagination = { has_next: false, page: 1 };

      // 检查响应是否是 CommentsResponse 格式
      if (response && typeof response === 'object') {
        if ('comments' in response && Array.isArray(response.comments)) {
          // 后端实际返回的格式：{comments, total, page, page_size, has_more, total_pages}
          comments = response.comments;
          totalComments = (response as any).total || (response as any).total_comments || 0;
          
          // 构建 pagination 对象
          const responseAny = response as any;
          pagination = {
            has_next: responseAny.has_more || false,
            page: responseAny.page || 1
          };
          
          // 调试日志：检查评论数据结构（仅开发环境）
          if (process.env.NODE_ENV === 'development') {
            console.log('Raw comments from backend:', comments);
            console.log('Comments with replies:', comments.filter(c => c.replies && c.replies.length > 0));
          }
        } else if (Array.isArray(response)) {
          // 直接返回评论数组的格式
          comments = response;
          totalComments = response.length;
          pagination = { has_next: false, page: 1 };
        } else {
          console.warn('Unexpected comments response format:', response);
          comments = [];
          totalComments = 0;
          pagination = { has_next: false, page: 1 };
        }
      }

      if (isFirstPage) {
        setComments(comments);
        setCurrentPage(1);
      } else {
        setComments(prev => [...prev, ...comments]);
      }

      setTotalComments(totalComments);
      setHasMore(pagination.has_next);
      setCurrentPage(pagination.page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载评论失败';
      setError(errorMessage);
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [articleId, pageSize, sortBy]);

  // 添加新评论
  const addComment = useCallback(async (data: CreateCommentRequest): Promise<Comment> => {
    try {
      setError(null);
      const newComment = await commentsApi.createComment(data);
      
      console.log('Raw API response for new comment:', newComment);
      
      // 验证新评论数据 - 检查不同的响应格式
      let validComment: Comment;
      
      if (!newComment) {
        throw new Error('No comment data received from API');
      }
      
      // 将响应转换为 any 类型以便检查不同的格式
      const response = newComment as any;
      
      // 检查是否是直接的评论对象
      if (response.id) {
        validComment = response as Comment;
      }
      // 检查是否是包装在 data 属性中的评论对象
      else if (response.data && response.data.id) {
        validComment = response.data as Comment;
      }
      // 检查其他可能的包装格式
      else if (typeof response === 'object' && Object.keys(response).length > 0) {
        // 尝试找到包含 id 的对象
        const possibleComment = Object.values(response).find((value: any) => 
          value && typeof value === 'object' && value.id
        );
        if (possibleComment) {
          validComment = possibleComment as Comment;
        } else {
          console.error('Cannot find valid comment in response:', response);
          throw new Error('Invalid comment data structure received');
        }
      } else {
        console.error('Invalid comment response format:', response);
        throw new Error('Invalid comment data received');
      }

      console.log('Validated comment:', validComment);

      // 更新评论计数
      setTotalComments(prev => prev + 1);

      // 刷新评论列表以获取最新数据（包括服务器端的任何处理）
      await loadComments(1, sortBy);

      return validComment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布评论失败';
      setError(errorMessage);
      console.error('Failed to create comment:', err);
      throw err;
    }
  }, [buildCommentTree, loadComments, sortBy]);

  // 回复评论
  const replyToComment = useCallback(async (parentId: number, data: CreateCommentRequest): Promise<Comment> => {
    try {
      setError(null);
      const reply = await commentsApi.replyToComment(parentId, data);

      console.log('Raw API response for new reply:', reply);
      
      // 验证回复数据 - 检查不同的响应格式
      let validReply: Comment;
      
      if (!reply) {
        throw new Error('No reply data received from API');
      }
      
      // 将响应转换为 any 类型以便检查不同的格式
      const response = reply as any;
      
      // 检查是否是直接的评论对象
      if (response.id) {
        validReply = response as Comment;
      }
      // 检查是否是包装在 data 属性中的评论对象
      else if (response.data && response.data.id) {
        validReply = response.data as Comment;
      }
      // 检查其他可能的包装格式
      else if (typeof response === 'object' && Object.keys(response).length > 0) {
        // 尝试找到包含 id 的对象
        const possibleReply = Object.values(response).find((value: any) => 
          value && typeof value === 'object' && value.id
        );
        if (possibleReply) {
          validReply = possibleReply as Comment;
        } else {
          console.error('Cannot find valid reply in response:', response);
          throw new Error('Invalid reply data structure received');
        }
      } else {
        console.error('Invalid reply response format:', response);
        throw new Error('Invalid reply data received');
      }

      console.log('Validated reply:', validReply);

      // 更新评论计数
      setTotalComments(prev => prev + 1);

      // 刷新评论列表以获取最新数据（包括服务器端的任何处理）
      await loadComments(1, sortBy);

      return validReply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布回复失败';
      setError(errorMessage);
      console.error('Failed to create reply:', err);
      throw err;
    }
  }, [buildCommentTree, loadComments, sortBy]);

  // 切换点赞
  const toggleLike = useCallback(async (commentId: number): Promise<void> => {
    try {
      setError(null);

      // 直接调用 API，不使用乐观更新以避免双重更新
      const result = await commentsApi.toggleCommentLike(commentId);
      
      console.log('Toggle like result:', result);

      // 验证响应数据
      if (result && typeof result.liked === 'boolean' && typeof result.likes_count === 'number') {
        // 使用服务器返回的实际数据更新UI
        updateCommentInList(commentId, {
          is_liked: result.liked,
          likes_count: result.likes_count
        });
      } else {
        console.error('Invalid like response:', result);
        throw new Error('Invalid response from like API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '操作失败';
      setError(errorMessage);
      console.error('Failed to toggle like:', err);
      throw err;
    }
  }, []);

  // 更新评论列表中的单个评论
  const updateCommentInList = useCallback((commentId: number, updates: Partial<Comment> | ((comment: Comment) => Partial<Comment>)) => {
    const updateComment = (commentsList: Comment[]): Comment[] => {
      return commentsList.map(comment => {
        if (comment.id === commentId) {
          const newUpdates = typeof updates === 'function' ? updates(comment) : updates;
          return { ...comment, ...newUpdates };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateComment(comment.replies)
          };
        }
        return comment;
      });
    };

    setComments(prev => updateComment(prev));
  }, []);

  // 从列表中删除评论
  const removeCommentFromList = useCallback((commentId: number) => {
    const removeComment = (commentsList: Comment[]): Comment[] => {
      return commentsList.filter(comment => {
        if (comment.id === commentId) {
          return false;
        }
        if (comment.replies && comment.replies.length > 0) {
          comment.replies = removeComment(comment.replies);
        }
        return true;
      });
    };

    setComments(prev => removeComment(prev));
    setTotalComments(prev => Math.max(0, prev - 1));
  }, []);

  // 加载更多评论
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await loadComments(currentPage + 1);
  }, [loadComments, loadingMore, hasMore, currentPage]);

  // 刷新评论列表
  const refresh = useCallback(async () => {
    await loadComments(1, sortBy);
  }, [loadComments, sortBy]);

  // 更改排序方式
  const handleSortChange = useCallback((newSort: CommentSortOption) => {
    setSortBy(newSort);
    loadComments(1, newSort);
  }, [loadComments]);

  // 初始加载
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 检查后端是否已经返回了嵌套结构
  const hasNestedReplies = comments.some(comment => comment.replies && comment.replies.length > 0);
  console.log('Backend returned nested replies:', hasNestedReplies);
  
  // 编辑评论
  const editComment = useCallback(async (commentId: number, content: string) => {
    try {
      const updatedComment = await commentsApi.updateComment(commentId, { content });
      updateCommentInList(commentId, {
        content: updatedComment.content,
        updated_at: updatedComment.updated_at
      });
    } catch (error) {
      console.error('Failed to edit comment:', error);
      throw error;
    }
  }, [updateCommentInList]);

  // 删除评论
  const deleteComment = useCallback(async (commentId: number) => {
    try {
      await commentsApi.deleteComment(commentId);
      removeCommentFromList(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }, [removeCommentFromList]);

  // 如果后端已经返回了嵌套结构，直接使用；否则构建评论树
  const nestedComments = hasNestedReplies ? comments : buildCommentTree(comments);

  return {
    comments: nestedComments,
    loading,
    error,
    totalComments,
    hasMore,
    sortBy,
    setSortBy: handleSortChange,
    addComment,
    replyToComment,
    toggleLike,
    loadMore,
    refresh,
    updateCommentInList,
    removeCommentFromList,
    editComment,
    deleteComment
  };
}