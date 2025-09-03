import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

interface TocItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface StripTOCProps {
  contentSelector?: string;
  headingSelector?: string;
  maxLevel?: number;
  className?: string;
  onActiveChange?: (activeId: string) => void;
}

// Hook for extracting TOC items and handling active state
function useStripTOC(
  contentSelector = 'main, .content, article',
  headingSelector = 'h1, h2, h3, h4, h5, h6',
  maxLevel = 3
) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from content
  const extractTOC = useCallback(() => {
    const container = document.querySelector(contentSelector);
    if (!container) return [];

    const headings = container.querySelectorAll(headingSelector) as NodeListOf<HTMLHeadingElement>;
    const items: TocItem[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1]);
      if (level > maxLevel) return;

      // Ensure heading has an ID
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      const text = heading.textContent?.trim() || '';
      if (!text) return;

      items.push({
        id: heading.id,
        text,
        level,
        element: heading
      });
    });

    return items;
  }, [contentSelector, headingSelector, maxLevel]);

  // Setup intersection observer for active heading detection
  useEffect(() => {
    const items = extractTOC();
    setTocItems(items);

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Select the topmost visible heading
          const topEntry = visibleEntries.reduce((top, entry) => {
            return entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top;
          });
          
          const id = (topEntry.target as HTMLElement).id;
          setActiveId(id);
        } else {
          // Find closest heading above viewport
          const scrollTop = window.scrollY;
          let activeItem = items[0];
          
          for (const item of items) {
            const rect = item.element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            
            if (elementTop <= scrollTop + 100) {
              activeItem = item;
            } else {
              break;
            }
          }
          
          setActiveId(activeItem.id);
        }
      },
      {
        rootMargin: '-100px 0px -66%',
        threshold: 0
      }
    );

    items.forEach(item => observer.observe(item.element));

    // Watch for content changes
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const mutationObserver = new MutationObserver(() => {
      const newItems = extractTOC();
      setTocItems(newItems);
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [contentSelector, extractTOC]);

  return { tocItems, activeId };
}

// Strip TOC Item Component
function StripTOCItem({
  item,
  isActive,
  onClick
}: {
  item: TocItem;
  isActive: boolean;
  onClick: (id: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(item.id);
    
    // Smooth scroll to target
    const targetElement = document.getElementById(item.id);
    if (targetElement) {
      const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  // Get hierarchical green styling based on heading level
  const getBorderStyle = () => {
    const styles = {
      1: { 
        color: 'border-green-600 dark:border-green-500', 
        width: 'border-l-4',
        height: 'h-10'
      },
      2: { 
        color: 'border-green-500 dark:border-green-400', 
        width: 'border-l-3',
        height: 'h-8'
      },
      3: { 
        color: 'border-green-400 dark:border-green-300', 
        width: 'border-l-2',
        height: 'h-6'
      }
    };
    return styles[item.level as keyof typeof styles] || styles[3];
  };

  // Get text color hierarchy for expanded items
  const getTextColor = () => {
    if (isActive) {
      return item.level === 1 
        ? 'text-gray-900 dark:text-gray-100'
        : item.level === 2
        ? 'text-gray-800 dark:text-gray-200' 
        : 'text-gray-700 dark:text-gray-300';
    }
    return item.level === 1
      ? 'text-gray-700 dark:text-gray-300'
      : item.level === 2
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-gray-500 dark:text-gray-500';
  };

  const borderStyle = getBorderStyle();

  return (
    <div 
      className={clsx(
        'relative group',
        // Hierarchical green left border
        'transition-all duration-200',
        borderStyle.width,
        isActive 
          ? borderStyle.color
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      <a
        href={`#${item.id}`}
        onClick={handleClick}
        className={clsx(
          'block py-3 px-4 text-sm transition-all duration-200',
          'hover:bg-gray-50/50 dark:hover:bg-gray-800/30',
          // Indentation based on heading level
          item.level === 2 && 'pl-6',
          item.level === 3 && 'pl-8',
          item.level >= 4 && 'pl-10',
          // Hierarchical text colors
          getTextColor(),
          // Background for active state
          isActive && 'bg-green-50/50 dark:bg-green-900/10',
          // Font size and weight based on level
          item.level === 1 && 'text-base font-semibold',
          item.level === 2 && 'font-medium',
          item.level >= 4 && 'text-xs'
        )}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="line-clamp-2 leading-relaxed">
          {item.text}
        </span>
      </a>

      {/* Hierarchical green indicator bar */}
      <div 
        className={clsx(
          'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r transition-opacity duration-200',
          borderStyle.color.replace('border-', 'bg-'),
          borderStyle.height,
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        )}
      />
    </div>
  );
}

// Main Strip TOC Component
export default function StripTOC({
  contentSelector,
  headingSelector,
  maxLevel = 3,
  className,
  onActiveChange
}: StripTOCProps) {
  const { tocItems, activeId } = useStripTOC(contentSelector, headingSelector, maxLevel);
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent of active changes
  useEffect(() => {
    if (activeId) {
      onActiveChange?.(activeId);
    }
  }, [activeId, onActiveChange]);

  const handleItemClick = useCallback((id: string) => {
    onActiveChange?.(id);
  }, [onActiveChange]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Don't render if no items
  if (tocItems.length === 0) {
    return null;
  }

  return (
    <nav 
      className={clsx(
        'strip-toc sticky top-8',
        className
      )}
      aria-label="文章目录"
    >
      {/* Header - Substack style with toggle */}
      <div className="mb-6 px-4">
        <button
          onClick={toggleExpanded}
          className="flex items-center justify-between w-full group"
          aria-expanded={isExpanded}
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            目录
          </h3>
          <svg 
            className={clsx(
              'w-4 h-4 text-gray-500 transition-transform duration-200',
              isExpanded ? 'rotate-90' : 'rotate-0'
            )}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-2 h-px bg-gradient-to-r from-green-200 via-gray-200 to-transparent dark:from-green-800 dark:via-gray-700"></div>
      </div>

      {/* TOC Items - Clean strip layout with collapse animation */}
      <div 
        className={clsx(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-0">
          {tocItems.map((item) => (
            <StripTOCItem
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onClick={handleItemClick}
            />
          ))}
        </div>

        {/* Bottom fade for visual polish */}
        <div className="mt-8 px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700"></div>
        </div>
      </div>
    </nav>
  );
}

// Export for use in other components
export { StripTOC };