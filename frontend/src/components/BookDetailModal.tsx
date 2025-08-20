import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Book } from '../api/books';
import { useResponsive, useTouch } from '../hooks/useResponsive';
import { useScrollLock } from '../hooks/useScrollLock';
import OptimizedImage from './ui/OptimizedImage';

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  books?: Book[];
  onNavigateToBook?: (book: Book) => void;
}

export default function BookDetailModal({ 
  book, 
  isOpen, 
  onClose, 
  books = [],
  onNavigateToBook
}: BookDetailModalProps) {
  const [showContent, setShowContent] = useState(true);
  const [detailedDescription, setDetailedDescription] = useState<string>('');
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { isMobile, isTablet } = useResponsive();
  const isTouch = useTouch();
  
  // 使用滚动锁定Hook来保持滚动位置
  useScrollLock(isOpen);

  // 直接显示内容，无动画延迟
  useEffect(() => {
    setShowContent(isOpen && !!book);
  }, [isOpen, book]);

  // 获取书籍详细描述
  const fetchDetailedDescription = async (bookTitle: string) => {
    try {
      setIsLoadingDescription(true);
      const response = await fetch(`/api/books/description?book_name=${encodeURIComponent(bookTitle)}`);
      const data = await response.json();
      
      if (data.success && data.description) {
        setDetailedDescription(data.description);
      } else {
        // 使用默认描述
        setDetailedDescription(book?.description || '暂无详细描述');
      }
    } catch (error) {
      console.error('获取书籍详细描述失败:', error);
      setDetailedDescription(book?.description || '暂无详细描述');
    } finally {
      setIsLoadingDescription(false);
    }
  };

  // 当书籍变化时获取详细描述
  useEffect(() => {
    if (book && isOpen) {
      // 如果书籍已经有详细描述，就使用它，否则调用API
      if (book.detailed_description) {
        setDetailedDescription(book.detailed_description);
      } else {
        fetchDetailedDescription(book.title);
      }
    }
  }, [book, isOpen]);

  // 获取当前书籍在列表中的索引
  const currentIndex = useMemo(() => {
    if (!book || !books.length) return -1;
    return books.findIndex(b => b.id === book.id);
  }, [book, books]);

  // 导航到上一本书籍
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && onNavigateToBook) {
      onNavigateToBook(books[currentIndex - 1]);
    }
  }, [currentIndex, books, onNavigateToBook]);

  // 导航到下一本书籍
  const handleNext = useCallback(() => {
    if (currentIndex < books.length - 1 && onNavigateToBook) {
      onNavigateToBook(books[currentIndex + 1]);
    }
  }, [currentIndex, books, onNavigateToBook]);

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
  }, [isOpen, handlePrevious, handleNext]);

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

  if (!isOpen || !book) {
    return null;
  }

  const getCategoryColor = (category?: string) => {
    const colors = {
      '并发编程': 'from-blue-500 to-blue-600',
      'Web开发': 'from-green-500 to-green-600',
      '软件架构': 'from-purple-500 to-purple-600',
      '性能优化': 'from-yellow-500 to-yellow-600',
      '系统编程': 'from-red-500 to-red-600',
      '代码质量': 'from-pink-500 to-pink-600',
      '学习教程': 'from-indigo-500 to-indigo-600',
      '设计模式': 'from-teal-500 to-teal-600',
      '网络编程': 'from-cyan-500 to-cyan-600',
    };
    return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (category?: string) => {
    const icons = {
      '并发编程': '⚡',
      'Web开发': '🌐',
      '软件架构': '🏗️',
      '性能优化': '🚀',
      '系统编程': '⚙️',
      '代码质量': '✨',
      '学习教程': '📚',
      '设计模式': '🧩',
      '网络编程': '🌍',
      '编程范式': '🔬',
      '测试开发': '🧪',
      '操作系统': '💻',
      '开发效率': '⚡',
      '计算机系统': '🖥️',
      '代码重构': '🔄',
      '高级编程': '🎯',
      '编程哲学': '🧠',
      '技术参考': '📖',
      '技术读物': '📗',
      '最佳实践': '⭐',
      '系统设计': '🏛️',
      '软件工程': '🛠️',
    };
    return icons[category as keyof typeof icons] || '📘';
  };

  const getDifficultyLabel = (difficulty?: string) => {
    const labels = {
      'beginner': '🌱 入门',
      'intermediate': '🌿 进阶', 
      'advanced': '🌳 高级',
    };
    return labels[difficulty as keyof typeof labels] || '📚 通用';
  };

  const getDifficultyColor = (difficulty?: string) => {
    const colors = {
      'beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'advanced': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500
        ${isOpen 
          ? 'bg-black bg-opacity-50 backdrop-blur-sm' 
          : 'bg-black bg-opacity-0 backdrop-blur-none pointer-events-none'
        }
      `}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-title"
      aria-describedby="book-content"
    >
      {/* 直接显示内容容器 */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-7xl h-auto min-h-96"
      >
        {/* 内容卡片 */}
        <div className="relative w-full h-full">
          {/* 导航按钮 - 左 */}
          {books.length > 1 && currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-md backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 opacity-70 hover:opacity-100"
              aria-label="上一本书籍 (←)"
              title="上一本书籍 (←)"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* 导航按钮 - 右 */}
          {books.length > 1 && currentIndex < books.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 rounded-full shadow-md backdrop-blur-sm transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 opacity-70 hover:opacity-100"
              aria-label="下一本书籍 (→)"
              title="下一本书籍 (→)"
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
                aria-label="关闭图书详情模态框 (Esc)"
                title="关闭 (Esc)"
              >
                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* 左页 - 图书封面和基本信息 */}
              <div className="w-2/5 p-8 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-96">
                {/* 书籍封面 */}
                <div className="flex-1 flex items-center justify-center mb-6">
                  <div className="relative">
                    <OptimizedImage
                      src={book.url}
                      alt={book.title}
                      aspectRatio="3/4"
                      className="w-48 md:w-56 lg:w-64 rounded-lg shadow-2xl"
                      sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 256px"
                      placeholder="skeleton"
                      priority={true}
                    />
                    {/* 分类标签 */}
                    {book.category && (
                      <div className={`
                        absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-medium text-white
                        bg-gradient-to-r ${getCategoryColor(book.category)} shadow-lg
                      `}>
                        <span className="mr-1">{getCategoryIcon(book.category)}</span>
                        {book.category}
                      </div>
                    )}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h1 
                      id="book-title"
                      className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight"
                    >
                      {book.title}
                    </h1>
                    {book.author && (
                      <p className="text-md text-gray-600 dark:text-gray-400 font-medium">
                        作者：{book.author}
                      </p>
                    )}
                  </div>

                  {/* 难度和标签 */}
                  <div className="space-y-3">
                    {book.difficulty && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">难度等级</label>
                        <span className={`
                          inline-block px-3 py-1 rounded-full text-sm font-medium
                          ${getDifficultyColor(book.difficulty)}
                        `}>
                          {getDifficultyLabel(book.difficulty)}
                        </span>
                      </div>
                    )}

                    {book.tags && book.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">相关标签</label>
                        <div className="flex flex-wrap gap-2">
                          {book.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 右页 - 详细描述和内容 */}
              <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 flex flex-col min-h-96 overflow-y-auto">
                {/* 简要描述 */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    内容简介
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {book.description}
                  </p>
                </div>

                {/* 详细描述 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="text-xl mr-2">📖</span>
                    深度解读
                    {isLoadingDescription && (
                      <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start">
                      <div className="text-blue-500 dark:text-blue-400 mr-3 mt-1 flex-shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                          {isLoadingDescription ? (
                            <div className="flex items-center space-x-2 text-gray-500">
                              <span>正在获取详细内容简介...</span>
                            </div>
                          ) : (
                            detailedDescription
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 页脚信息 */}
                <div className="mt-auto">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="text-center text-xs text-gray-400 space-y-2">
                      <p>Go语言技术图书 · 助力编程成长</p>
                      <div className="flex flex-wrap justify-center gap-2 text-xs">
                        <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">Esc</kbd> 关闭</span>
                        {books.length > 1 && (
                          <>
                            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">←</kbd> 上一本</span>
                            <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">→</kbd> 下一本</span>
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
    </div>
  );
}