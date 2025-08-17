import React, { useEffect, useState, useRef } from 'react';
import { Quote } from '../../types';
import { useResponsive, useTouch } from '../../hooks/useResponsive';
import { useScrollLock } from '../../hooks/useScrollLock';

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuoteDetailModal({ quote, isOpen, onClose }: QuoteDetailModalProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backContentRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();
  const isTouch = useTouch();
  
  // 使用滚动锁定Hook来保持滚动位置
  useScrollLock(isOpen);

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

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm"
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
            <div className="w-full min-h-96 bg-white dark:bg-gray-800 rounded-xl flex overflow-hidden">
              {/* 左页 */}
              <div className="flex-1 p-8 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-96">
                <div className="flex items-center justify-between mb-6">
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
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="关闭"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors">
                        💾 收藏
                      </button>
                      <button className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors">
                        🔗 分享
                      </button>
                    </div>
                  </div>

                  {/* 页脚信息 */}
                  <div className="mt-4 text-center text-xs text-gray-400">
                    <p>技术箴言 · 启发思考</p>
                    <p className="mt-1">按 ESC 键关闭</p>
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