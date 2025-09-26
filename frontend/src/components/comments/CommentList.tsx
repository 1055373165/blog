import React from 'react';
import { Comment, CreateCommentRequest } from '../../types';
import CommentItem from './CommentItem';
import CommentSkeleton from './CommentSkeleton';

interface CommentListProps {
  comments: Comment[];
  articleId: number;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<void>;
  onReply: (parentId: number, data: CreateCommentRequest) => Promise<void>;
  onLike: (commentId: number) => Promise<void>;
  onReport?: (commentId: number) => void;
  onEdit?: (commentId: number, content: string) => void;
  onDelete?: (commentId: number) => void;
  currentUserId?: number;
  maxDepth?: number;
  className?: string;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  articleId,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onReply,
  onLike,
  onReport,
  onEdit,
  onDelete,
  currentUserId,
  maxDepth = 3,
  className = ''
}) => {
  // Handle load more click
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !onLoadMore) return;
    try {
      await onLoadMore();
    } catch (error) {
      console.error('Failed to load more comments:', error);
    }
  };

  // Show loading skeleton on initial load
  if (loading && comments.length === 0) {
    return (
      <div className={className}>
        <CommentSkeleton count={5} showReplies={true} />
      </div>
    );
  }

  // Show empty state
  if (!loading && comments.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-800 dark:to-go-700 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-go-500 dark:text-go-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            暂无评论
          </h3>

          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            成为第一个评论者，分享你的想法和见解
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment, index) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            articleId={articleId}
            depth={0}
            maxDepth={maxDepth}
            onReply={onReply}
            onLike={onLike}
            onReport={onReport}
            onEdit={onEdit}
            onDelete={onDelete}
            currentUserId={currentUserId}
            className={`comment-fade-in comment-will-change ${
              index < 5 ? `comment-stagger-${Math.min(index + 1, 5)}` : ''
            } sm:comment-item-mobile md:comment-item-xs`}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`
              inline-flex items-center px-6 py-3 rounded-lg font-medium text-sm
              transition-all duration-200
              ${
                loadingMore
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-go-600 dark:text-go-400 border-2 border-go-200 dark:border-go-700 hover:border-go-300 dark:hover:border-go-600 hover:bg-go-50 dark:hover:bg-go-900/20 hover:shadow-soft hover:-translate-y-0.5'
              }
            `}
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                加载中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
                加载更多评论
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading More Skeleton */}
      {loadingMore && (
        <div className="mt-6">
          <CommentSkeleton count={3} showReplies={false} />
        </div>
      )}

      {/* End of Comments Message */}
      {!hasMore && comments.length > 0 && (
        <div className="mt-8 text-center py-6 border-t border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            已显示全部 {comments.length} 条评论
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentList;