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

    // 初始化所有评论，添加 replies 数组
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [], depth: 0 });
    });

    // 构建树结构
    flatComments.forEach(comment => {
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

      const response: CommentsResponse = await commentsApi.getComments(articleId, filters);

      if (isFirstPage) {
        setComments(response.comments);
        setCurrentPage(1);
      } else {
        setComments(prev => [...prev, ...response.comments]);
      }

      setTotalComments(response.total_comments);
      setHasMore(response.pagination.has_next);
      setCurrentPage(response.pagination.page);
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

      // 乐观更新
      setComments(prev => {
        const updatedComments = [newComment, ...prev];
        return buildCommentTree(updatedComments);
      });
      setTotalComments(prev => prev + 1);

      return newComment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布评论失败';
      setError(errorMessage);
      throw err;
    }
  }, [buildCommentTree]);

  // 回复评论
  const replyToComment = useCallback(async (parentId: number, data: CreateCommentRequest): Promise<Comment> => {
    try {
      setError(null);
      const reply = await commentsApi.replyToComment(parentId, data);

      // 乐观更新
      setComments(prev => {
        const updatedComments = [...prev.flat(), reply]; // 展平后添加回复
        return buildCommentTree(updatedComments);
      });
      setTotalComments(prev => prev + 1);

      return reply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布回复失败';
      setError(errorMessage);
      throw err;
    }
  }, [buildCommentTree]);

  // 切换点赞
  const toggleLike = useCallback(async (commentId: number): Promise<void> => {
    try {
      setError(null);

      // 乐观更新UI
      updateCommentInList(commentId, (comment) => ({
        is_liked: !comment.is_liked,
        likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1
      }));

      const result = await commentsApi.toggleCommentLike(commentId);

      // 使用服务器返回的实际数据
      updateCommentInList(commentId, {
        is_liked: result.liked,
        likes_count: result.likes_count
      });
    } catch (err) {
      // 回滚乐观更新
      updateCommentInList(commentId, (comment) => ({
        is_liked: !comment.is_liked,
        likes_count: comment.is_liked ? comment.likes_count + 1 : comment.likes_count - 1
      }));

      const errorMessage = err instanceof Error ? err.message : '操作失败';
      setError(errorMessage);
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

  // 构建最终的嵌套评论树
  const nestedComments = buildCommentTree(comments);

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
    removeCommentFromList
  };
}