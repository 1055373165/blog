import React, { useEffect, useState, useRef, useCallback } from 'react';
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
}

export default function QuoteDetailModal({ 
  quote, 
  isOpen, 
  onClose, 
  onLike, 
  onShare, 
  likesCount = 0, 
  isLiked = false 
}: QuoteDetailModalProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showContent, setShowContent] = useState(false);
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

  // 处理打开动画
  useEffect(() => {
    if (isOpen && quote) {
      setIsFlipping(true);
      // 延迟显示背面内容，让翻转动画更自然
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsFlipping(false);
      setShowContent(false);
    }
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

  // 处理分享功能
  const handleShare = useCallback(async () => {
    if (!quote) return;
    
    const shareUrl = `https://www.godepth.top/quotes/${quote.id}`;
    const shareText = `"${quote.text}" —— ${quote.author}`;
    
    try {
      if (navigator.share) {
        // 使用原生分享API
        await navigator.share({
          title: '技术箴言分享',
          text: shareText,
          url: shareUrl,
        });
      } else {
        // 复制到剪贴板
        await navigator.clipboard.writeText(`${shareText}\n\n查看详情：${shareUrl}`);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      }
      
      onShare?.(quote);
    } catch (error) {
      console.error('分享失败:', error);
      // 降级处理：手动复制
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n查看详情：${shareUrl}`);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (clipboardError) {
        console.error('复制到剪贴板失败:', clipboardError);
      }
    }
  }, [quote, onShare]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleClose();
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
  }, [isOpen, handleLike, handleShare]);

  // 处理关闭动画
  const handleClose = () => {
    setIsFlipping(false);
    setShowContent(false);
    setTimeout(() => {
      onClose();
    }, 300);
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
      {/* 翻书动画容器 */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-6xl h-auto min-h-96 perspective-1000"
        style={{ perspective: '1000px' }}
      >
        {/* 书本 */}
        <div 
          className={`
            relative w-full h-full duration-700 transform-style-preserve-3d transition-transform
            ${isFlipping ? 'rotate-y-180' : ''}
          `}
          style={{ 
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* 书的正面（封面） */}
          <div 
            className="absolute inset-0 backface-hidden rounded-xl shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className={`
              w-full h-full rounded-xl bg-gradient-to-br ${getCategoryColor(quote.category)}
              flex flex-col items-center justify-center text-white p-8 relative overflow-hidden
            `}>
              {/* 装饰性背景 */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 text-6xl opacity-50">📖</div>
                <div className="absolute bottom-4 right-4 text-4xl opacity-30">✨</div>
                <div className="absolute top-1/2 left-8 text-2xl opacity-40 transform -rotate-12">💭</div>
              </div>

              {/* 内容 */}
              <div className="text-center z-10">
                <div className="text-6xl mb-4">{getCategoryIcon(quote.category)}</div>
                <h2 className="text-2xl font-bold mb-2">{getCategoryLabel(quote.category)}</h2>
                <p className="text-lg opacity-90 mb-6">点击查看详情</p>
                <div className="w-16 h-0.5 bg-white opacity-50 mx-auto"></div>
              </div>

              {/* 点击提示 */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-sm opacity-75 animate-pulse">
                点击任意位置翻开
              </div>
            </div>
          </div>

          {/* 书的背面（内容） */}
          <div 
            className="absolute inset-0 backface-hidden rounded-xl shadow-2xl rotate-y-180"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="w-full min-h-96 bg-white dark:bg-gray-800 rounded-xl flex overflow-hidden relative">
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
                    </div>
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