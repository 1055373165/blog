import React, { useState, useMemo } from 'react';
import { Comment, CreateCommentRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
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

  // Get current user info for admin check
  const { user } = useAuth();
  
  // Check if current user owns this comment
  const isOwner = currentUserId === comment.author_id;
  
  // Check if current user is admin
  const isAdmin = user?.is_admin || false;

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
          ? `ml-6 pl-6 border-l border-gray-200 dark:border-gray-700 relative`
          : ''
      } ${className}`}
    >
      {/* Reply connection line for nested comments */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 w-px h-6 bg-gray-200 dark:bg-gray-700 -translate-x-px"></div>
      )}

      {/* Main Comment */}
      <div className="py-6 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-200">
        {/* Comment Header */}
        <div className="flex items-start gap-4 mb-3">
          {/* Author Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full
                        flex items-center justify-center font-medium text-sm flex-shrink-0">
            {comment.author.avatar ? (
              <img 
                src={comment.author.avatar} 
                alt={comment.author.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              comment.author.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Author Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                {comment.author.name}
              </h4>

              {/* Author Badge */}
              {comment.author.is_admin && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                               bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  管理员
                </span>
              )}

              {isOwner && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                               bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  我的
                </span>
              )}

              {/* Comment Status */}
              {!comment.is_approved && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                               bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  待审核
                </span>
              )}
            </div>

            {/* Author Bio (optional) */}
            {comment.author.bio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {comment.author.bio}
              </p>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="ml-14 mb-3">
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
            <div dangerouslySetInnerHTML={renderContent} />
          </div>
        </div>

        {/* Comment Actions */}
        <div className="ml-14">
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
            isAdmin={isAdmin}
            onEdit={onEdit ? handleEdit : undefined}
            onDelete={onDelete ? handleDelete : undefined}
          />
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="ml-14 mt-4 mb-6">
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