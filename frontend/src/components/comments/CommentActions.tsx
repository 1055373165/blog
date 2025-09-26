import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CommentActionsProps {
  commentId: number;
  likesCount: number;
  isLiked: boolean;
  repliesCount: number;
  createdAt: string;
  onLike: () => Promise<void>;
  onReply: () => void;
  onReport?: () => void;
  showReplies?: boolean;
  onToggleReplies?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const CommentActions: React.FC<CommentActionsProps> = ({
  commentId,
  likesCount,
  isLiked,
  repliesCount,
  createdAt,
  onLike,
  onReply,
  onReport,
  showReplies = false,
  onToggleReplies,
  isOwner = false,
  onEdit,
  onDelete,
  className = ''
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Handle like action
  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      await onLike();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: zhCN
      });
    } catch (error) {
      return '时间未知';
    }
  };

  return (
    <div className={`flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 comment-actions-mobile sm:comment-actions-xs ${className}`}>
      {/* Left Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`
            flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
            transition-all duration-200 comment-action-hover comment-mobile-touch comment-focus-ring
            ${isLiked
              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 like-bounce'
              : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
            }
            ${isLiking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={isLiked ? '取消点赞' : '点赞'}
        >
          {isLiking ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg
              className="w-4 h-4"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke={isLiked ? 'none' : 'currentColor'}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          )}
          <span>{likesCount > 0 ? likesCount : ''}</span>
        </button>

        {/* Reply Button */}
        <button
          onClick={onReply}
          className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
                   text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300
                   bg-go-50 dark:bg-go-900/20 hover:bg-go-100 dark:hover:bg-go-900/30
                   transition-all duration-200 comment-action-hover comment-mobile-touch comment-focus-ring"
          title="回复评论"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <span>回复</span>
        </button>

        {/* Replies Toggle */}
        {repliesCount > 0 && onToggleReplies && (
          <button
            onClick={onToggleReplies}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium
                     text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200
                     bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-all duration-200 comment-action-hover comment-mobile-touch comment-focus-ring"
            title={showReplies ? '收起回复' : '查看回复'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showReplies ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span>{repliesCount} 条回复</span>
          </button>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Time Stamp */}
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium hidden sm:block">
          {formatRelativeTime(createdAt)}
        </span>

        {/* More Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-all duration-200 comment-mobile-touch comment-focus-ring comment-action-hover"
            title="更多选项"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700 rounded-lg shadow-strong z-50">
              <div className="py-2">
                {/* Owner Actions */}
                {isOwner && (
                  <>
                    {onEdit && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onEdit();
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                                 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>编辑</span>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          onDelete();
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400
                                 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>删除</span>
                      </button>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                  </>
                )}

                {/* Report Action */}
                {onReport && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onReport();
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span>举报</span>
                  </button>
                )}

                {/* Copy Link */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigator.clipboard.writeText(`${window.location.href}#comment-${commentId}`);
                    // TODO: Show toast notification
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>复制链接</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler for dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default CommentActions;