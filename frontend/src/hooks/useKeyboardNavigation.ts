import { useState, useEffect, useCallback, useRef } from 'react';
import { Quote } from '../types';

interface UseKeyboardNavigationProps {
  quotes: Quote[];
  onQuoteSelect: (quote: Quote) => void;
  isFloatingMode: boolean;
}

interface UseKeyboardNavigationReturn {
  focusedQuoteId: string | null;
  focusedIndex: number;
  handleKeyDown: (event: KeyboardEvent) => void;
  setFocusedQuoteId: (id: string | null) => void;
  announcementText: string;
}

export function useKeyboardNavigation({
  quotes,
  onQuoteSelect,
  isFloatingMode
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const [focusedQuoteId, setFocusedQuoteId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [announcementText, setAnnouncementText] = useState('');
  const lastAnnouncementRef = useRef<string>('');
  
  // 使用 ref 来存储 quotes，避免依赖项问题
  const quotesRef = useRef<Quote[]>(quotes);
  quotesRef.current = quotes;

  // 宣布内容给屏幕阅读器
  const announce = useCallback((text: string) => {
    if (text !== lastAnnouncementRef.current) {
      setAnnouncementText(text);
      lastAnnouncementRef.current = text;
      
      // 清除宣布文本，避免重复
      setTimeout(() => {
        setAnnouncementText('');
      }, 1000);
    }
  }, []);

  // 根据索引更新焦点 - 使用ref避免依赖项问题
  const updateFocusByIndex = useCallback((index: number) => {
    const currentQuotes = quotesRef.current;
    if (index >= 0 && index < currentQuotes.length) {
      const quote = currentQuotes[index];
      setFocusedQuoteId(quote.id);
      setFocusedIndex(index);
      
      // 宣布当前箴言信息
      announce(`第 ${index + 1} 条箴言，共 ${currentQuotes.length} 条。${quote.text.substring(0, 50)}${quote.text.length > 50 ? '...' : ''}，作者：${quote.author}`);
    }
  }, [announce]); // 只依赖announce

  // 键盘事件处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 防止在模态框打开时处理键盘事件
    if (document.querySelector('[role="dialog"]')) {
      return;
    }

    const currentQuotes = quotesRef.current;
    const currentIndex = focusedQuoteId 
      ? currentQuotes.findIndex(q => q.id === focusedQuoteId)
      : -1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        if (isFloatingMode) {
          // 浮动模式：按添加顺序导航
          const nextIndex = currentIndex < currentQuotes.length - 1 ? currentIndex + 1 : 0;
          updateFocusByIndex(nextIndex);
        } else {
          // 网格模式：考虑网格布局
          const nextIndex = currentIndex < currentQuotes.length - 1 ? currentIndex + 1 : 0;
          updateFocusByIndex(nextIndex);
        }
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (isFloatingMode) {
          // 浮动模式：按添加顺序导航
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentQuotes.length - 1;
          updateFocusByIndex(prevIndex);
        } else {
          // 网格模式：考虑网格布局
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentQuotes.length - 1;
          updateFocusByIndex(prevIndex);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedQuoteId) {
          const focusedQuote = currentQuotes.find(q => q.id === focusedQuoteId);
          if (focusedQuote) {
            onQuoteSelect(focusedQuote);
            announce(`打开箴言详情：${focusedQuote.text.substring(0, 30)}...`);
          }
        }
        break;

      case 'Home':
        event.preventDefault();
        updateFocusByIndex(0);
        break;

      case 'End':
        event.preventDefault();
        updateFocusByIndex(currentQuotes.length - 1);
        break;

      case 'Tab':
        // Tab 键导航时也更新焦点
        if (!event.shiftKey && currentIndex < currentQuotes.length - 1) {
          updateFocusByIndex(currentIndex + 1);
        } else if (event.shiftKey && currentIndex > 0) {
          updateFocusByIndex(currentIndex - 1);
        }
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // 数字键快速跳转到对应位置
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          const jumpIndex = parseInt(event.key) - 1;
          if (jumpIndex < currentQuotes.length) {
            updateFocusByIndex(jumpIndex);
          }
        }
        break;

      case 'f':
      case 'F':
        // F 键聚焦到搜索框
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
          event.preventDefault();
          const searchInput = document.querySelector('[role="searchbox"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            announce('聚焦到搜索框');
          }
        }
        break;

      case '?':
        // ? 键显示键盘快捷键帮助
        event.preventDefault();
        announce('键盘快捷键：方向键导航，回车或空格打开详情，Home/End 跳转首尾，数字键快速跳转，F 键聚焦搜索框');
        break;
    }
  }, [focusedQuoteId, onQuoteSelect, isFloatingMode, updateFocusByIndex, announce]); // 移除quotes依赖

  // 初始化焦点
  useEffect(() => {
    if (quotes.length > 0 && focusedQuoteId === null) {
      setFocusedQuoteId(quotes[0].id);
      setFocusedIndex(0);
    }
  }, [quotes.length, focusedQuoteId]); // 只依赖quotes.length

  // 如果当前焦点的箴言被过滤掉了，重置焦点
  useEffect(() => {
    if (focusedQuoteId && !quotes.find(q => q.id === focusedQuoteId)) {
      if (quotes.length > 0) {
        setFocusedQuoteId(quotes[0].id);
        setFocusedIndex(0);
      } else {
        setFocusedQuoteId(null);
        setFocusedIndex(-1);
      }
    }
  }, [quotes.length, focusedQuoteId]); // 只依赖quotes.length - 但这里仍需要整个quotes来查找

  return {
    focusedQuoteId,
    focusedIndex,
    handleKeyDown,
    setFocusedQuoteId,
    announcementText,
  };
}