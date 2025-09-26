import React, { useState, useMemo } from 'react';
import { Comment, CreateCommentRequest } from '../../types';
import CommentActions from './CommentActions';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: Comment;
  articleId: number;
  depth?: number;
  maxDepth?: number;
  onReply: (parentId: number, data: CreateCommentRequest) => Promise<void>;
  onLike: (commentId: number) => Promise<void>;
  onReport?: (commentId: number) => void;
  onEdit?: (commentId: number, content: string) => void;
  onDelete?: (commentId: number) => void;
  currentUserId?: number;
  className?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  depth = 0,
  maxDepth = 3,
  onReply,
  onLike,
  onReport,
  onEdit,
  onDelete,
  currentUserId,
  className = ''
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 2); // Auto-show first 2 levels
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user owns this comment
  const isOwner = currentUserId === comment.author_id;

  // Determine if we should show nested replies or flatten them
  const shouldFlattenReplies = depth >= maxDepth;

  // Render comment content with basic markdown support
  const renderContent = useMemo(() => {
    const content = comment.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>');

    return { __html: content };
  }, [comment.content]);

  // Handle reply submission
  const handleReplySubmit = async (data: CreateCommentRequest) => {
    try {
      setIsSubmitting(true);
      await onReply(comment.id, data);
      setShowReplyForm(false);
      setShowReplies(true); // Auto-expand to show new reply
    } catch (error) {
      throw error; // Let CommentForm handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle like toggle
  const handleLike = async () => {
    await onLike(comment.id);
  };

  // Handle report
  const handleReport = () => {
    if (onReport) {
      onReport(comment.id);
    }
  };

  // Handle edit
  const handleEdit = () => {
    if (onEdit) {
      onEdit(comment.id, comment.content);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
  };

  return (
    <div
      id={`comment-${comment.id}`}
      className={`${
        depth > 0
          ? `ml-4 sm:ml-6 md:ml-8 pl-3 sm:pl-4 border-l-2 border-go-200 dark:border-go-700 comment-thread-line comment-reply-mobile sm:comment-reply-xs`
          : ''
      } comment-gpu-acceleration ${className}`}
    >
      {/* Main Comment Card */}
      <div className="card hover:shadow-strong transition-all duration-300 mb-4 sm:mb-6 comment-item-mobile sm:comment-item-xs comment-glow-dark">
        <div className="p-4 sm:p-6">
          {/* Comment Header */}
          <div className="flex items-start gap-3 mb-4">
            {/* Author Avatar */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-go-500 to-go-600 text-white rounded-xl
                          flex items-center justify-center font-semibold shadow-soft flex-shrink-0 comment-avatar-xs sm:comment-avatar comment-action-hover">
              {comment.author.name.charAt(0).toUpperCase()}
            </div>

            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {comment.author.name}
                </h4>

                {/* Author Badge */}
                {comment.author.is_admin && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    管理员
                  </span>
                )}

                {isOwner && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    我的评论
                  </span>
                )}
              </div>

              {/* Author Bio (optional) */}
              {comment.author.bio && (
                <p className="text-xs text-go-600 dark:text-go-400 truncate">
                  {comment.author.bio}
                </p>
              )}
            </div>

            {/* Comment Status */}
            {!comment.is_approved && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                               bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  待审核
                </span>
              </div>
            )}
          </div>

          {/* Comment Content */}
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            <div dangerouslySetInnerHTML={renderContent} />
          </div>

          {/* Comment Actions */}
          <CommentActions
            commentId={comment.id}
            likesCount={comment.likes_count}
            isLiked={comment.is_liked || false}
            repliesCount={comment.replies?.length || 0}
            createdAt={comment.created_at}
            onLike={handleLike}
            onReply={() => setShowReplyForm(true)}
            onReport={onReport ? handleReport : undefined}
            showReplies={showReplies}
            onToggleReplies={comment.replies && comment.replies.length > 0 ? () => setShowReplies(!showReplies) : undefined}
            isOwner={isOwner}
            onEdit={onEdit ? handleEdit : undefined}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mb-6">
          <CommentForm
            articleId={articleId}
            parentId={comment.id}
            replyToAuthor={comment.author.name}
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
            placeholder={`回复 @${comment.author.name}...`}
            autoFocus
          />
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && showReplies && (
        <div className={`space-y-4 ${shouldFlattenReplies ? 'ml-0' : ''}`}>
          {comment.replies.map((reply, index) => (
            <div key={reply.id}>
              {shouldFlattenReplies ? (
                // Flatten replies when max depth is reached
                <div className="card hover:shadow-strong transition-all duration-300 p-4
                              border-l-4 border-go-300 dark:border-go-600 bg-go-50/30 dark:bg-go-900/10">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-go-400 to-go-500 text-white rounded-lg
                                  flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {reply.author.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {reply.author.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          回复了 {comment.author.name}
                        </span>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: reply.content.replace(/\n/g, '<br>') }}
                      />

                      {/* Simplified actions for flattened replies */}
                      <div className="flex items-center space-x-4 mt-2">
                        <button
                          onClick={() => handleLike()}
                          className={`flex items-center space-x-1 text-xs ${
                            reply.is_liked
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                          } transition-colors duration-200`}
                        >
                          <svg className="w-3 h-3" fill={reply.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{reply.likes_count || ''}</span>
                        </button>

                        <button
                          onClick={() => setShowReplyForm(true)}
                          className="text-xs text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 transition-colors duration-200"
                        >
                          回复
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Regular nested reply
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  articleId={articleId}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  onReply={onReply}
                  onLike={onLike}
                  onReport={onReport}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show More Replies Button (for collapsed state) */}
      {comment.replies && comment.replies.length > 0 && !showReplies && (
        <div className="mb-6">
          <button
            onClick={() => setShowReplies(true)}
            className="flex items-center space-x-2 text-sm font-medium text-go-600 dark:text-go-400
                     hover:text-go-700 dark:hover:text-go-300 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>显示 {comment.replies.length} 条回复</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentItem;