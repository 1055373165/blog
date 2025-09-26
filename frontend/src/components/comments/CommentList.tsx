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
      <div className={`text-center py-16 ${className}`}>
        <div className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          暂无评论，成为第一个评论者
        </p>
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
        <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={`
              inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
              transition-colors duration-200
              ${
                loadingMore
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
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
        <div className="mt-8 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            已显示全部 {comments.length} 条评论
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentList;