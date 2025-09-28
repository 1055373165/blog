import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import TableOfContents, { TocItem } from './TableOfContents';

interface CollapsibleTOCProps {
  contentSelector?: string;
  headingSelector?: string;
  maxLevel?: number;
  showNumbers?: boolean;
  autoCollapse?: boolean;
  className?: string;
}

export default function CollapsibleTOC({
  contentSelector = 'main, .content, article',
  headingSelector = 'h1, h2, h3, h4, h5, h6',
  maxLevel = 5,
  showNumbers = false,
  autoCollapse = false,
  className
}: CollapsibleTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const tocRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Check if there's content to show TOC for
  useEffect(() => {
    const checkContent = () => {
      const container = document.querySelector(contentSelector);
      if (!container) {
        setHasContent(false);
        return;
      }

      const headings = container.querySelectorAll(headingSelector);
      const validHeadings = Array.from(headings).filter((heading) => {
        const level = parseInt(heading.tagName[1]);
        return level <= maxLevel && heading.textContent?.trim();
      });

      setHasContent(validHeadings.length > 0);
    };

    // Initial check
    checkContent();

    // Watch for content changes
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const observer = new MutationObserver(checkContent);
    observer.observe(container, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [contentSelector, headingSelector, maxLevel]);

  // Close TOC when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        tocRef.current &&
        toggleButtonRef.current &&
        !tocRef.current.contains(event.target as Node) &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close TOC on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        toggleButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen]);

  // Prevent body scroll when TOC is open on mobile only
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) { // Only on mobile
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleItemClick = useCallback(() => {
    // Close TOC when a heading is clicked
    setIsOpen(false);
  }, []);

  // Don't render if there's no content
  if (!hasContent) {
    return null;
  }

  return (
    <>
      {/* Toggle Button - Fixed position, Substack-style */}
      <button
        ref={toggleButtonRef}
        onClick={handleToggle}
        className={clsx(
          'fixed z-40 flex items-center justify-center',
          'w-14 h-14',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'rounded-full shadow-lg hover:shadow-xl',
          'transition-all duration-200 ease-in-out',
          'bottom-8 right-8',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          isOpen && 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
        )}
        aria-label={isOpen ? '关闭目录' : '打开目录'}
        aria-expanded={isOpen}
        aria-controls="toc-panel"
      >
        <svg
          className={clsx(
            'w-6 h-6 transition-colors duration-200',
            isOpen 
              ? 'text-primary-600 dark:text-primary-400' 
              : 'text-gray-600 dark:text-gray-400'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* TOC Panel - Substack-style slide-in */}
      <div
        ref={tocRef}
        id="toc-panel"
        className={clsx(
          'fixed z-40 transition-all duration-300 ease-in-out',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'shadow-2xl rounded-lg',
          // Mobile: slide up from bottom, full width with margins
          'bottom-0 left-4 right-4 max-h-[70vh]',
          // Desktop: positioned near toggle button, more compact
          'md:bottom-28 md:right-8 md:left-auto md:w-80 md:max-h-[500px]',
          'transform transition-transform duration-300 ease-in-out',
          isOpen
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-full md:translate-y-8 opacity-0 scale-95 pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="toc-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="toc-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            目录
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="关闭目录"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* TOC Content */}
        <div className="p-0 overflow-y-auto max-h-full">
          <TableOfContents
            contentSelector={contentSelector}
            headingSelector={headingSelector}
            maxLevel={maxLevel}
            showNumbers={showNumbers}
            autoCollapse={autoCollapse}
            position="static"
            isCollapsible={true}
            onActiveChange={handleItemClick}
            className={clsx(
              'border-0 shadow-none bg-transparent p-4 max-w-none',
              'max-h-none', // Remove height constraint from inner component
              className
            )}
          />
        </div>
      </div>
    </>
  );
}

// Export for backwards compatibility
export { CollapsibleTOC };