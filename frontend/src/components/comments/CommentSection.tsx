import React, { useState, useMemo } from 'react';
import { CommentSortOption, CreateCommentRequest } from '../../types';
import { useComments } from '../../hooks/useComments';
import { useAuth } from '../../contexts/AuthContext';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

interface CommentSectionProps {
  articleId: string;
  currentUserId?: number;
  className?: string;
  maxDepth?: number;
  pageSize?: number;
  autoFocus?: boolean;
  showNewCommentForm?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  articleId,
  currentUserId,
  className = '',
  maxDepth = 3,
  pageSize = 10,
  autoFocus = false,
  showNewCommentForm = true
}) => {
  const { user, isAuthenticated } = useAuth();
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // 调试：检查用户认证状态（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 CommentSection Debug:');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - user:', user);
    console.log('  - currentUserId prop:', currentUserId);
    console.log('  - localStorage auth_token:', localStorage.getItem('auth_token') ? 'exists' : 'not found');
  }

  // Use comments hook
  const {
    comments,
    loading,
    error,
    totalComments,
    hasMore,
    sortBy,
    setSortBy,
    addComment,
    replyToComment,
    toggleLike,
    loadMore,
    refresh,
    deleteComment
  } = useComments({
    articleId,
    pageSize
  });

  // Sort options configuration
  const sortOptions = useMemo(() => [
    { value: 'newest' as CommentSortOption, label: '最新评论', icon: 'clock' },
    { value: 'oldest' as CommentSortOption, label: '最早评论', icon: 'clock-reverse' },
    { value: 'most_liked' as CommentSortOption, label: '最多点赞', icon: 'heart' }
  ], []);

  // Handle new comment submission
  const handleNewComment = async (data: CreateCommentRequest) => {
    try {
      await addComment(data);
      setNotification({
        message: '评论发布成功！',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发布评论失败';
      setNotification({
        message: errorMessage,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
      throw error;
    }
  };

  // Handle reply submission
  const handleReply = async (parentId: number, data: CreateCommentRequest) => {
    try {
      await replyToComment(parentId, data);
      setNotification({
        message: '回复发布成功！',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发布回复失败';
      setNotification({
        message: errorMessage,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
      throw error;
    }
  };

  // Handle like toggle
  const handleLike = async (commentId: number) => {
    try {
      await toggleLike(commentId);
    } catch (error) {
      setNotification({
        message: '操作失败，请重试',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle report (placeholder)
  const handleReport = (commentId: number) => {
    console.log('Report comment:', commentId);
    setNotification({
      message: '举报已提交，我们会及时处理',
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3000);
  };


  // Handle delete
  const handleDelete = async (commentId: number) => {
    if (!window.confirm('确定要删除这条评论吗？此操作无法撤销。')) {
      return;
    }

    try {
      await deleteComment(commentId);
      setNotification({
        message: '评论删除成功！',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除评论失败';
      setNotification({
        message: errorMessage,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Render sort option icon
  const renderSortIcon = (iconType: string) => {
    switch (iconType) {
      case 'clock':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'clock-reverse':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l-3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'heart':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className={`comment-section ${className}`} role="complementary" aria-labelledby="comments-heading">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 sm:top-4 sm:right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-xl shadow-medium transition-all duration-300 backdrop-blur-sm notification-slide comment-notification-mobile ${
            notification.type === 'error'
              ? 'bg-red-50/90 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
              : 'bg-go-50/90 border border-go-200 text-go-700 dark:bg-go-900/20 dark:border-go-700 dark:text-go-400'
          }`}
        >
          <div className="flex items-center">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
              aria-label="关闭通知"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              评论
            </h2>
            {totalComments > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totalComments} 条
              </span>
            )}
          </div>

          {/* Sort Options */}
          {totalComments > 0 && (
            <div className="flex items-center gap-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200
                    ${
                      sortBy === option.value
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Global Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-start">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              加载失败
            </p>
            <p className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
          <button
            onClick={refresh}
            className="ml-3 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* New Comment Form */}
      {showNewCommentForm && (
        <div className="mb-8">
          <CommentForm
            articleId={parseInt(articleId)}
            onSubmit={handleNewComment}
            placeholder="分享你的想法和见解..."
            autoFocus={autoFocus}
          />
        </div>
      )}

      {/* Comments List */}
      <CommentList
        comments={comments}
        articleId={parseInt(articleId)}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReply={handleReply}
        onLike={handleLike}
        onReport={handleReport}
        onDelete={handleDelete}
        currentUserId={currentUserId}
        maxDepth={maxDepth}
      />

      {/* Footer Message */}
      {totalComments === 0 && !loading && (
        <div className="text-center py-6 border-t border-gray-200 dark:border-gray-700 mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            成为第一个评论者，开启讨论！
          </p>
        </div>
      )}
    </section>
  );
};

export default CommentSection;