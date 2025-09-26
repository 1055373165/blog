import React, { useState, useRef, useEffect } from 'react';
import { CreateCommentRequest } from '../../types';

interface CommentFormProps {
  articleId: number;
  parentId?: number;
  replyToAuthor?: string;
  onSubmit: (data: CreateCommentRequest) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  articleId,
  parentId,
  replyToAuthor,
  onSubmit,
  onCancel,
  placeholder = '写下你的想法...',
  autoFocus = false,
  className = ''
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when component mounts
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
    }
  }, [content]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('评论内容不能为空');
      return;
    }

    if (trimmedContent.length < 2) {
      setError('评论内容至少需要2个字符');
      return;
    }

    if (trimmedContent.length > 2000) {
      setError('评论内容不能超过2000字符');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const commentData: CreateCommentRequest = {
        content: trimmedContent,
        article_id: articleId,
        parent_id: parentId
      };

      await onSubmit(commentData);

      // Reset form on success
      setContent('');
      setShowPreview(false);

      // Call onCancel if this is a reply form to close it
      if (parentId && onCancel) {
        onCancel();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发布失败，请重试';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setContent('');
    setError(null);
    setShowPreview(false);
    if (onCancel) {
      onCancel();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape' && onCancel) {
      handleCancel();
    }
  };

  // Render content preview (basic markdown support)
  const renderPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">$1</code>')
      .split('\n')
      .map((line, index) => `<p key="${index}">${line || '<br>'}</p>`)
      .join('');
  };

  return (
    <div className={`card border-2 border-go-200 dark:border-go-800 comment-form-expand comment-form-mobile sm:comment-form-xs comment-gpu-acceleration ${className}`}>
      <div className="p-4 sm:p-6">
        {/* Reply Context */}
        {parentId && replyToAuthor && (
          <div className="mb-4 p-3 bg-go-50 dark:bg-go-900/20 rounded-lg border border-go-200 dark:border-go-700">
            <p className="text-sm text-go-700 dark:text-go-300">
              <span className="font-medium">回复 @{replyToAuthor}:</span>
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tab Header */}
          <div className="flex items-center space-x-4 mb-3">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`text-sm font-medium transition-colors duration-200 ${
                !showPreview
                  ? 'text-go-600 dark:text-go-400 border-b-2 border-go-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400'
              }`}
            >
              编写
            </button>

            {content.trim() && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`text-sm font-medium transition-colors duration-200 ${
                  showPreview
                    ? 'text-go-600 dark:text-go-400 border-b-2 border-go-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400'
                }`}
              >
                预览
              </button>
            )}
          </div>

          {/* Content Input/Preview */}
          {!showPreview ? (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSubmitting}
                className={`
                  w-full px-3 sm:px-4 py-2 sm:py-3 min-h-[100px] sm:min-h-[120px] resize-none
                  border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800
                  text-gray-900 dark:text-gray-100 text-sm sm:text-base
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:ring-2 focus:ring-go-500 focus:border-transparent
                  transition-all duration-200 comment-focus-ring
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
                maxLength={2000}
              />

              {/* Character Counter */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
                {content.length}/2000
              </div>
            </div>
          ) : (
            <div className="min-h-[120px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div
                className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: content.trim() ? renderPreview(content) : '<p class="text-gray-400 dark:text-gray-500 italic">暂无内容预览</p>'
                }}
              />
            </div>
          )}

          {/* Markdown Help */}
          {!showPreview && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              支持基础 Markdown: **粗体**, *斜体*, `代码`
              {!parentId && (
                <span className="ml-4">
                  快捷键: <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Ctrl/Cmd + Enter</kbd> 发布
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4 sm:mt-6 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2">
              {parentId && onCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400
                           hover:text-gray-800 dark:hover:text-gray-200
                           transition-colors duration-200 comment-mobile-touch comment-focus-ring"
                >
                  取消
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className={`
                  px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 comment-mobile-touch comment-focus-ring
                  focus:ring-2 focus:ring-go-500 focus:ring-opacity-50
                  ${
                    content.trim() && !isSubmitting
                      ? 'bg-go-600 hover:bg-go-700 text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 comment-action-hover'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    {parentId ? '回复中...' : '发布中...'}
                  </span>
                ) : (
                  <span>{parentId ? '发布回复' : '发布评论'}</span>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Helpful Tips for First Time Users */}
        {!parentId && content.length === 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 写下你的想法，与其他读者分享观点和见解
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentForm;