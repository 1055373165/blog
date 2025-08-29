import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Quote } from '../../types';
import { useResponsive, useTouch } from '../../hooks/useResponsive';
import { useScrollLock } from '../../hooks/useScrollLock';

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (quoteId: string, isLiked: boolean) => void;
  onShare?: (quote: Quote) => void;
  likesCount?: number;
  isLiked?: boolean;
  // 新增导航支持
  quotes?: Quote[];
  onNavigateToQuote?: (quote: Quote) => void;
}

export default function QuoteDetailModal({ 
  quote, 
  isOpen, 
  onClose, 
  onLike, 
  onShare, 
  likesCount = 0, 
  isLiked = false,
  quotes = [],
  onNavigateToQuote
}: QuoteDetailModalProps) {
  // 移除动画相关状态
  const [showContent, setShowContent] = useState(true);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { isMobile, isTablet } = useResponsive();
  const isTouch = useTouch();
  
  // 使用滚动锁定Hook来保持滚动位置
  useScrollLock(isOpen);

  // 同步props到本地状态
  useEffect(() => {
    setLocalLikesCount(likesCount);
    setLocalIsLiked(isLiked);
  }, [likesCount, isLiked]);

  // 直接显示内容，无动画延迟
  useEffect(() => {
    setShowContent(isOpen && !!quote);
  }, [isOpen, quote]);

  // 处理喜欢功能
  const handleLike = useCallback(async () => {
    if (!quote || isLiking) return;
    
    setIsLiking(true);
    const newIsLiked = !localIsLiked;
    const newCount = newIsLiked ? localLikesCount + 1 : localLikesCount - 1;
    
    // 乐观更新UI
    setLocalIsLiked(newIsLiked);
    setLocalLikesCount(newCount);
    
    try {
      await onLike?.(quote.id, newIsLiked);
    } catch (error) {
      // 如果失败，回滚状态
      setLocalIsLiked(!newIsLiked);
      setLocalLikesCount(localLikesCount);
      console.error('点赞失败:', error);
    } finally {
      setIsLiking(false);
    }
  }, [quote, localIsLiked, localLikesCount, isLiking, onLike]);

  // 优化分享功能 - 直接复制链接
  const handleShare = useCallback(async () => {
    if (!quote) return;
    
    const shareUrl = `http://www.godepth.top/quotes/${quote.id}`;
    
    try {
      // 直接复制链接到剪贴板
      await navigator.clipboard.writeText(shareUrl);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
      onShare?.(quote);
    } catch (error) {
      console.error('复制链接失败:', error);
      // 降级处理：显示链接供用户手动复制
      const fallbackText = `无法自动复制，请手动复制链接：${shareUrl}`;
      alert(fallbackText);
    }
  }, [quote, onShare]);

  // 获取当前箴言在列表中的索引
  const currentIndex = useMemo(() => {
    if (!quote || !quotes.length) return -1;
    return quotes.findIndex(q => q.id === quote.id);
  }, [quote, quotes]);

  // 导航到上一个箴言
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && onNavigateToQuote) {
      onNavigateToQuote(quotes[currentIndex - 1]);
    }
  }, [currentIndex, quotes, onNavigateToQuote]);

  // 导航到下一个箴言
  const handleNext = useCallback(() => {
    if (currentIndex < quotes.length - 1 && onNavigateToQuote) {
      onNavigateToQuote(quotes[currentIndex + 1]);
    }
  }, [currentIndex, quotes, onNavigateToQuote]);

  // 处理键盘事件（包含导航功能）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case 'l':
        case 'L':
          if (!event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            handleLike();
          }
          break;
        case 's':
        case 'S':
          if (!event.ctrlKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            handleShare();
          }
          break;
        case 'Enter':
        case ' ':
          // 如果关闭按钮是焦点，触发关闭
          if (document.activeElement === closeButtonRef.current) {
            event.preventDefault();
            handleClose();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleLike, handleShare, handlePrevious, handleNext]);

  // 直接关闭，无动画延迟
  const handleClose = () => {
    setShowContent(false);
    onClose();
  };

  // 点击背景关闭
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !quote) {
    return null;
  }

  const getCategoryColor = (category: Quote['category']) => {
    const colors = {
      programming: 'from-blue-500 to-blue-600',
      architecture: 'from-green-500 to-green-600',
      management: 'from-purple-500 to-purple-600',
      philosophy: 'from-yellow-500 to-yellow-600',
      design: 'from-pink-500 to-pink-600',
    };
    return colors[category] || colors.programming;
  };

  const getCategoryIcon = (category: Quote['category']) => {
    const icons = {
      programming: '💻',
      architecture: '🏗️',
      management: '👥',
      philosophy: '🧠',
      design: '🎨',
    };
    return icons[category] || '💡';
  };

  const getCategoryLabel = (category: Quote['category']) => {
    const labels = {
      programming: '编程智慧',
      architecture: '架构思维',
      management: '管理哲学',
      philosophy: '人生哲理',
      design: '设计美学',
    };
    return labels[category] || '技术箴言';
  };

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500
        ${isOpen 
          ? 'bg-black bg-opacity-75 backdrop-blur-sm' 
          : 'bg-black bg-opacity-0 backdrop-blur-none pointer-events-none'
        }
      `}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-title"
      aria-describedby="quote-content"
    >
      {/* 直接显示内容容器 */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-6xl h-auto min-h-96"
      >
        {/* 内容卡片 */}
        <div className="relative w-full h-full">
          {/* 导航按钮 - 左 */}
          {quotes.length > 1 && currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-md backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 opacity-70 hover:opacity-100"
              aria-label="上一个箴言 (←)"
              title="上一个箴言 (←)"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 导航按钮 - 右 */}
          {quotes.length > 1 && currentIndex < quotes.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-md backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 opacity-70 hover:opacity-100"
              aria-label="下一个箴言 (→)"
              title="下一个箴言 (→)"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="w-full min-h-96 bg-white dark:bg-gray-800 rounded-xl flex overflow-hidden relative shadow-2xl">
              {/* 关闭按钮 - 移动到右上角 */}
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200 ease-in-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label="关闭详情模态框 (Esc)"
                title="关闭 (Esc)"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 左页 */}
              <div className="flex-1 p-8 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-96">
                <div className="flex items-center mb-6 pr-12">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getCategoryIcon(quote.category)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {getCategoryLabel(quote.category)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {quote.author}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 箴言内容 */}
                <blockquote className="flex-1 flex items-center">
                  <div>
                    <div className="text-4xl text-primary-500 mb-4">"</div>
                    <p 
                      id="quote-content"
                      className="text-xl leading-relaxed text-gray-700 dark:text-gray-300 italic font-medium"
                    >
                      {showContent && quote.text}
                    </p>
                    <div className="text-4xl text-primary-500 text-right">"</div>
                  </div>
                </blockquote>

                {/* 作者签名 */}
                <div className="mt-6 text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    — {quote.author}
                  </p>
                  {quote.source && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {quote.source}
                    </p>
                  )}
                </div>
              </div>

              {/* 右页 */}
              <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 flex flex-col min-h-96 overflow-y-auto">
                {/* 中文解释 */}
                {quote.chineseExplanation && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <span className="text-xl mr-2">🧠</span>
                      深度解读
                    </h4>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <div className="text-blue-500 dark:text-blue-400 mr-3 mt-1 flex-shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
                          {quote.chineseExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 详细信息 */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    箴言背景
                  </h4>
                  
                  {/* 分类信息 */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">分类</label>
                    <div className={`
                      inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium mt-1
                      bg-gradient-to-r ${getCategoryColor(quote.category)} text-white
                    `}>
                      <span className="mr-2">{getCategoryIcon(quote.category)}</span>
                      {getCategoryLabel(quote.category)}
                    </div>
                  </div>

                  {/* 难度等级 */}
                  {quote.difficulty && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">理解难度</label>
                      <div className="mt-1">
                        <span className={`
                          inline-block px-2 py-1 rounded text-xs font-medium
                          ${quote.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            quote.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                        `}>
                          {quote.difficulty === 'beginner' ? '🌱 入门' : 
                           quote.difficulty === 'intermediate' ? '🌿 进阶' : '🌳 高级'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 标签 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">相关标签</label>
                    <div className="flex flex-wrap gap-2">
                      {quote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 相关操作 */}
                <div className="mt-auto">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex gap-3">
                      {/* 喜欢按钮 */}
                      <button 
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`
                          flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-900
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${localIsLiked 
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400'
                          }
                        `}
                        aria-label={`${localIsLiked ? '取消喜欢' : '喜欢'} (L键)`}
                        title={`${localIsLiked ? '取消喜欢' : '喜欢'} (L键)`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-base transition-transform duration-200 ${isLiking ? 'animate-pulse' : localIsLiked ? 'animate-bounce' : ''}`}>
                            {localIsLiked ? '❤️' : '🤍'}
                          </span>
                          <span>
                            {localIsLiked ? '已喜欢' : '喜欢'} 
                            {localLikesCount > 0 && ` (${localLikesCount})`}
                          </span>
                        </div>
                      </button>
                      
                      {/* 分享按钮 */}
                      <div className="relative flex-1">
                        <button 
                          onClick={handleShare}
                          className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 hover:shadow-lg"
                          aria-label="分享箴言 (S键)"
                          title="分享箴言 (S键)"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-base">🔗</span>
                            <span>分享</span>
                          </div>
                        </button>
                        
                        {/* 分享成功提示 */}
                        {showShareTooltip && (
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded-md shadow-lg z-20 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>✅</span>
                              <span>链接已复制到剪贴板</span>
                            </div>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-500 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 页脚信息 */}
                  <div className="mt-4 text-center text-xs text-gray-400 space-y-1">
                    <p>技术箴言 · 启发思考</p>
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">Esc</kbd> 关闭</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">L</kbd> 喜欢</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">S</kbd> 分享</span>
                      {quotes.length > 1 && (
                        <>
                          <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">←</kbd> 上一个</span>
                          <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">→</kbd> 下一个</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}