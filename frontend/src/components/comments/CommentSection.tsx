import React, { useState, useMemo } from 'react';
import { CommentSortOption, CreateCommentRequest } from '../../types';
import { useComments } from '../../hooks/useComments';
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
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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
    refresh
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

  // Handle edit (placeholder)
  const handleEdit = (commentId: number, content: string) => {
    console.log('Edit comment:', commentId, content);
    // TODO: Implement edit functionality
  };

  // Handle delete (placeholder)
  const handleDelete = (commentId: number) => {
    console.log('Delete comment:', commentId);
    // TODO: Implement delete functionality
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
        <div className="flex items-center justify-between mb-6">
          <h2 id="comments-heading" className="text-2xl font-bold text-gray-900 dark:text-white font-heading">
            评论讨论
            {totalComments > 0 && (
              <span className="ml-3 text-lg font-medium text-go-600 dark:text-go-400">
                ({totalComments})
              </span>
            )}
          </h2>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                     hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20
                     rounded-lg transition-all duration-200"
            title="刷新评论"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>刷新</span>
          </button>
        </div>

        {/* Sort Options */}
        {totalComments > 0 && (
          <div className="flex items-center space-x-2 comment-sort-mobile">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium hidden sm:inline">
              排序：
            </span>
            <div className="flex items-center space-x-1 comment-sort-mobile">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      sortBy === option.value
                        ? 'bg-go-600 text-white shadow-soft'
                        : 'text-gray-600 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20'
                    }
                  `}
                >
                  {renderSortIcon(option.icon)}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                加载失败
              </p>
              <p className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
            <button
              onClick={refresh}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              重试
            </button>
          </div>
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
        onEdit={handleEdit}
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