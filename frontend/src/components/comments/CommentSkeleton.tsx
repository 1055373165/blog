import React from 'react';

interface CommentSkeletonProps {
  count?: number;
  showReplies?: boolean;
}

const CommentItemSkeleton: React.FC<{ depth?: number }> = ({ depth = 0 }) => {
  return (
    <div className={`comment-skeleton-pulse comment-loading-shimmer ${depth > 0 ? `ml-4 sm:ml-6 md:ml-8 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-gray-700 comment-reply-mobile sm:comment-reply-xs` : ''}`}>
      {/* Card Container */}
      <div className="card p-4 sm:p-6 mb-4 sm:mb-6 comment-item-mobile sm:comment-item-xs">
        {/* Header - Author and Meta */}
        <div className="flex items-start gap-3 mb-4">
          {/* Avatar Skeleton */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-xl flex-shrink-0 comment-avatar-xs sm:comment-avatar" />

          {/* Author Info */}
          <div className="flex-1 space-y-2">
            {/* Author Name */}
            <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg w-32" />

            {/* Timestamp */}
            <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-24" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 mb-4">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-full" />
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-4/5" />
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-3/5" />
        </div>

        {/* Actions Bar */}
        <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Like Button */}
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded" />
            <div className="h-3 w-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded" />
          </div>

          {/* Reply Button */}
          <div className="h-3 w-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded" />

          {/* Timestamp */}
          <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
};

const CommentSkeleton: React.FC<CommentSkeletonProps> = ({
  count = 3,
  showReplies = true
}) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <CommentItemSkeleton />

          {/* Show nested reply skeletons occasionally */}
          {showReplies && index < 2 && Math.random() > 0.5 && (
            <div className="space-y-4">
              <CommentItemSkeleton depth={1} />
              {Math.random() > 0.7 && (
                <CommentItemSkeleton depth={2} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentSkeleton;