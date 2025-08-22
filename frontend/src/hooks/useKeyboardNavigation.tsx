import { useEffect, useCallback, useRef, useState } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean; // Cmd on Mac, Win on Windows
  description: string;
  action: () => void;
  preventDefault?: boolean;
  disabled?: boolean;
}

interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean; // 启用方向键导航
  enableTabNavigation?: boolean; // 启用 Tab 键导航增强
  enableEscapeKey?: boolean; // 启用 Esc 键关闭功能
  focusTrapSelector?: string; // 焦点陷阱选择器
  skipLinkTarget?: string; // 跳过链接目标
  enableSkipLink?: boolean; // 是否创建跳过链接
  shortcuts?: KeyboardShortcut[]; // 自定义快捷键
}

// 全局快捷键配置
const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'k',
    ctrl: true,
    description: '打开搜索',
    action: () => {
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      } else {
        // 如果没有找到搜索框，触发搜索页面导航
        window.location.href = '/search';
      }
    }
  },
  {
    key: '/',
    ctrl: true,
    description: '显示快捷键帮助',
    action: () => {
      // 触发快捷键帮助显示
      window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
    }
  },
  {
    key: 'h',
    alt: true,
    description: '返回首页',
    action: () => {
      window.location.href = '/';
    }
  },
  {
    key: 'b',
    alt: true,
    description: '返回上一页',
    action: () => {
      window.history.back();
    }
  }
];

// 焦点管理工具
class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];
  private trapElement: HTMLElement | null = null;

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  // 保存当前焦点
  saveFocus() {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  // 恢复焦点
  restoreFocus() {
    const lastFocused = this.focusStack.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  // 设置焦点陷阱
  setFocusTrap(element: HTMLElement) {
    this.trapElement = element;
    this.addTrapListeners();
  }

  // 移除焦点陷阱
  removeFocusTrap() {
    this.trapElement = null;
    this.removeTrapListeners();
  }

  // 获取可聚焦元素
  getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector))
      .filter(el => {
        const element = el as HTMLElement;
        return element.offsetWidth > 0 && 
               element.offsetHeight > 0 && 
               !element.hasAttribute('hidden');
      }) as HTMLElement[];
  }

  private addTrapListeners() {
    document.addEventListener('keydown', this.handleTrapKeydown);
  }

  private removeTrapListeners() {
    document.removeEventListener('keydown', this.handleTrapKeydown);
  }

  private handleTrapKeydown = (e: KeyboardEvent) => {
    if (!this.trapElement || e.key !== 'Tab') return;

    const focusableElements = this.getFocusableElements(this.trapElement);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: 向前
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: 向后
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
}

// 键盘导航 Hook
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableEscapeKey = true,
    focusTrapSelector,
    skipLinkTarget = 'main',
    enableSkipLink = true,
    shortcuts = []
  } = options;

  const [isShortcutsHelpVisible, setIsShortcutsHelpVisible] = useState(false);
  const focusManager = useRef(FocusManager.getInstance());
  const allShortcuts = [...GLOBAL_SHORTCUTS, ...shortcuts];

  // 处理快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果当前焦点在输入框内，不处理大部分快捷键
    const activeElement = document.activeElement;
    const isInInput = activeElement?.tagName === 'INPUT' || 
                     activeElement?.tagName === 'TEXTAREA' || 
                     activeElement?.hasAttribute('contenteditable');

    for (const shortcut of allShortcuts) {
      if (shortcut.disabled) continue;

      // 检查按键匹配
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
      const altMatch = !!shortcut.alt === e.altKey;
      const shiftMatch = !!shortcut.shift === e.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        // 某些快捷键在输入框中也要生效（如 Ctrl+K）
        if (isInInput && !shortcut.ctrl && !shortcut.alt) {
          continue;
        }

        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        
        shortcut.action();
        return;
      }
    }

    // ESC 键处理
    if (enableEscapeKey && e.key === 'Escape') {
      // 关闭模态框、菜单等
      window.dispatchEvent(new CustomEvent('escape-pressed'));
      
      // 如果快捷键帮助可见，关闭它
      if (isShortcutsHelpVisible) {
        setIsShortcutsHelpVisible(false);
      }
    }

    // 方向键导航 (在非输入元素中)
    if (enableArrowKeys && !isInInput) {
      handleArrowKeyNavigation(e);
    }
  }, [allShortcuts, enableArrowKeys, enableEscapeKey, isShortcutsHelpVisible]);

  // 方向键导航处理
  const handleArrowKeyNavigation = useCallback((e: KeyboardEvent) => {
    const focusableElements = focusManager.current.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    focusableElements[nextIndex]?.focus();
  }, []);

  // 跳过链接功能
  const createSkipLink = useCallback(() => {
    if (!enableSkipLink) return;
    
    const existingSkipLink = document.querySelector('[data-skip-link]');
    if (existingSkipLink) return;

    const skipLink = document.createElement('a');
    skipLink.href = `#${skipLinkTarget}`;
    skipLink.textContent = '跳转到主要内容';
    skipLink.setAttribute('data-skip-link', 'true');
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded z-50';
    
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(skipLinkTarget) || document.querySelector('main');
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }, [skipLinkTarget, enableSkipLink]);

  // 显示快捷键帮助
  const showShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpVisible(true);
  }, []);

  // 设置焦点陷阱
  const setFocusTrap = useCallback((selector: string | HTMLElement) => {
    const element = typeof selector === 'string' 
      ? document.querySelector(selector) as HTMLElement
      : selector;
    
    if (element) {
      focusManager.current.saveFocus();
      focusManager.current.setFocusTrap(element);
    }
  }, []);

  // 移除焦点陷阱
  const removeFocusTrap = useCallback(() => {
    focusManager.current.removeFocusTrap();
    focusManager.current.restoreFocus();
  }, []);

  // 初始化
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    // 创建跳过链接
    createSkipLink();

    // 监听快捷键帮助显示事件
    const handleShowHelp = () => showShortcutsHelp();
    window.addEventListener('show-shortcuts-help', handleShowHelp);

    // 如果指定了焦点陷阱选择器，立即设置
    if (focusTrapSelector) {
      const trapElement = document.querySelector(focusTrapSelector) as HTMLElement;
      if (trapElement) {
        setFocusTrap(trapElement);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('show-shortcuts-help', handleShowHelp);
      focusManager.current.removeFocusTrap();
    };
  }, [handleKeyDown, createSkipLink, showShortcutsHelp, focusTrapSelector, setFocusTrap]);

  return {
    // 状态
    isShortcutsHelpVisible,
    setIsShortcutsHelpVisible,
    
    // 方法
    setFocusTrap,
    removeFocusTrap,
    showShortcutsHelp,
    
    // 数据
    shortcuts: allShortcuts,
    
    // 工具
    focusManager: focusManager.current
  };
}

// 快捷键帮助组件
export function ShortcutsHelp({ 
  isVisible, 
  onClose, 
  shortcuts 
}: { 
  isVisible: boolean; 
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}) {
  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.alt) keys.push('Alt');
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.meta) keys.push('Cmd');
    keys.push(shortcut.key.toUpperCase());
    return keys.join(' + ');
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            键盘快捷键
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.filter(s => !s.disabled).map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">
                {formatShortcut(shortcut)}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            按 <kbd className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Esc</kbd> 或点击外部区域关闭
          </p>
        </div>
      </div>
    </div>
  );
}

// 专用 Hook: 模态框键盘导航
export function useModalKeyboardNavigation(isOpen: boolean, onClose: () => void) {
  const { setFocusTrap, removeFocusTrap } = useKeyboardNavigation({
    enableEscapeKey: true
  });

  useEffect(() => {
    if (isOpen) {
      // 设置焦点陷阱到模态框
      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modal) {
        setFocusTrap(modal);
      }
    } else {
      removeFocusTrap();
    }

    // 监听 ESC 键关闭
    const handleEscape = () => {
      if (isOpen) {
        onClose();
      }
    };

    window.addEventListener('escape-pressed', handleEscape);
    
    return () => {
      window.removeEventListener('escape-pressed', handleEscape);
      if (isOpen) {
        removeFocusTrap();
      }
    };
  }, [isOpen, onClose, setFocusTrap, removeFocusTrap]);
}

// 导出类型
export type { KeyboardShortcut, KeyboardNavigationOptions };