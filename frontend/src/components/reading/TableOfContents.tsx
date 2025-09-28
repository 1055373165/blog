import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';

interface TocItem {
  id: string;
  text: string;
  level: number; // 1-6 对应 h1-h6
  element: HTMLElement;
  children?: TocItem[];
}

interface TableOfContentsProps {
  contentSelector?: string; // 内容容器选择器，默认 'main' 或 '.content'
  headingSelector?: string; // 标题选择器，默认 'h1,h2,h3,h4,h5,h6'
  className?: string;
  maxLevel?: number; // 最大显示层级，默认 3
  isCollapsible?: boolean; // 是否可折叠
  showNumbers?: boolean; // 是否显示序号
  position?: 'fixed' | 'sticky' | 'static'; // 定位方式
  offsetTop?: number; // 距离顶部偏移量
  onActiveChange?: (activeId: string) => void; // 当前激活项变化回调
  autoCollapse?: boolean; // 是否自动折叠非激活分支
}

// 构建树形目录结构
function buildTocTree(items: Omit<TocItem, 'children'>[]): TocItem[] {
  const tree: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const item of items) {
    const newItem: TocItem = { ...item, children: [] };

    // 找到合适的父级
    while (stack.length > 0 && stack[stack.length - 1].level >= newItem.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      tree.push(newItem);
    } else {
      const parent = stack[stack.length - 1];
      if (!parent.children) parent.children = [];
      parent.children.push(newItem);
    }

    stack.push(newItem);
  }

  return tree;
}

// 扁平化树形结构
function flattenTocTree(tree: TocItem[]): TocItem[] {
  const result: TocItem[] = [];
  
  function traverse(items: TocItem[]) {
    for (const item of items) {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }
  
  traverse(tree);
  return result;
}

// 目录提取 Hook
function useTableOfContents(
  contentSelector = 'main, .content, article',
  headingSelector = 'h1, h2, h3, h4, h5, h6',
  maxLevel = 6
) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver>();

  // 提取目录
  const extractToc = useCallback(() => {
    const container = document.querySelector(contentSelector);
    if (!container) return [];

    const headings = container.querySelectorAll(headingSelector) as NodeListOf<HTMLHeadingElement>;
    const items: Omit<TocItem, 'children'>[] = [];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1]);
      if (level > maxLevel) return;

      // 确保每个标题都有 ID
      if (!heading.id) {
        heading.id = `heading-${index}`;
      }

      // 清理文本内容
      const text = heading.textContent?.trim() || '';
      if (!text) return;

      items.push({
        id: heading.id,
        text,
        level,
        element: heading
      });
    });

    return buildTocTree(items);
  }, [contentSelector, headingSelector, maxLevel]);

  // 监听滚动，高亮当前章节
  const setupIntersectionObserver = useCallback((items: TocItem[]) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const flatItems = flattenTocTree(items);
    if (flatItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 找到当前可见的标题
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // 选择最上方的可见标题
          const topEntry = visibleEntries.reduce((top, entry) => {
            return entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top;
          });
          
          const id = (topEntry.target as HTMLElement).id;
          setActiveId(id);
        } else {
          // 如果没有可见标题，找到最接近的上方标题
          const scrollTop = window.scrollY;
          let activeItem = flatItems[0];
          
          for (const item of flatItems) {
            const rect = item.element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            
            if (elementTop <= scrollTop + 100) { // 100px 偏移量
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

    flatItems.forEach(item => {
      observer.observe(item.element);
    });

    observerRef.current = observer;
  }, []);

  // 初始化和更新
  useEffect(() => {
    const items = extractToc();
    setTocItems(items);
    setupIntersectionObserver(items);

    // 监听内容变化
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const mutationObserver = new MutationObserver(() => {
      const newItems = extractToc();
      setTocItems(newItems);
      setupIntersectionObserver(newItems);
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true
    });

    return () => {
      observerRef.current?.disconnect();
      mutationObserver.disconnect();
    };
  }, [contentSelector, extractToc, setupIntersectionObserver]);

  return { tocItems, activeId, setActiveId };
}

// 目录项组件
function TocItemComponent({
  item,
  isActive,
  level,
  showNumbers = false,
  isCollapsed = false,
  onToggle,
  onClick,
  autoCollapse = false,
  activeId
}: {
  item: TocItem;
  isActive: boolean;
  level: number;
  showNumbers?: boolean;
  isCollapsed?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  autoCollapse?: boolean;
  activeId?: string;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const shouldShowChildren = hasChildren && (!autoCollapse || isActive || !isCollapsed);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(item.id);
    
    // 平滑滚动到目标
    const targetElement = document.getElementById(item.id);
    if (targetElement) {
      const offsetTop = targetElement.getBoundingClientRect().top + window.scrollY - 100; // 100px 偏移
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(item.id);
  };

  return (
    <li>
      <div 
        className={clsx(
          'flex items-center group transition-colors duration-200',
          // Progressive indentation: H1=0, H2=1rem, H3=2rem, H4=2.5rem, H5+=3rem
          level === 2 && 'ml-4',
          level === 3 && 'ml-8',
          level === 4 && 'ml-10',
          level >= 5 && 'ml-12'
        )}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 w-4 h-4 mr-1 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? '展开' : '折叠'}
          >
            <svg
              className={clsx(
                'w-3 h-3 transition-transform duration-200',
                isCollapsed ? 'rotate-0' : 'rotate-90'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* 目录项链接 */}
        <a
          href={`#${item.id}`}
          onClick={handleClick}
          className={clsx(
            'flex-1 py-1 px-2 rounded text-sm transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700',
            isActive
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
            level === 1 && 'font-medium',
            level === 4 && 'text-xs',
            level >= 5 && 'text-xs opacity-80'
          )}
          aria-current={isActive ? 'true' : undefined}
        >
          <span className="flex items-center">
            {showNumbers && (
              <span className="mr-2 text-xs opacity-60">
                {level}.
              </span>
            )}
            <span className="line-clamp-2">{item.text}</span>
          </span>
        </a>
      </div>

      {/* 子项 */}
      {shouldShowChildren && (
        <ul className="mt-1">
          {item.children!.map((child) => (
            <TocItemComponent
              key={child.id}
              item={child}
              isActive={child.id === activeId}
              level={level + 1}
              showNumbers={showNumbers}
              onToggle={onToggle}
              onClick={onClick}
              autoCollapse={autoCollapse}
              activeId={activeId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// 主组件
export default function TableOfContents({
  contentSelector,
  headingSelector,
  className,
  maxLevel = 5,
  isCollapsible = true,
  showNumbers = false,
  position = 'sticky',
  offsetTop = 100,
  onActiveChange,
  autoCollapse = false
}: TableOfContentsProps) {
  const { tocItems, activeId } = useTableOfContents(contentSelector, headingSelector, maxLevel);
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // 通知激活项变化
  useEffect(() => {
    if (activeId) {
      onActiveChange?.(activeId);
    }
  }, [activeId, onActiveChange]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleItemClick = useCallback((id: string) => {
    // 通知父组件项目被点击
    onActiveChange?.(id);
    
    // 点击时自动展开父级
    if (autoCollapse) {
      setCollapsedItems(prev => {
        const newSet = new Set(prev);
        
        // 找到该项的所有父级并展开
        const findAndExpandParents = (items: TocItem[], targetId: string, parents: string[] = []): boolean => {
          for (const item of items) {
            const currentParents = [...parents, item.id];
            
            if (item.id === targetId) {
              // 展开所有父级
              parents.forEach(parentId => newSet.delete(parentId));
              return true;
            }
            
            if (item.children && findAndExpandParents(item.children, targetId, currentParents)) {
              return true;
            }
          }
          return false;
        };
        
        findAndExpandParents(tocItems, id);
        return newSet;
      });
    }
  }, [autoCollapse, tocItems, onActiveChange]);

  // 如果没有目录项，不渲染
  if (tocItems.length === 0) {
    return null;
  }

  const positionClasses = {
    fixed: 'fixed top-24 right-4',
    sticky: `sticky top-${offsetTop}`,
    static: ''
  };

  return (
    <nav
      className={clsx(
        'toc-nav bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 max-w-xs',
        positionClasses[position],
        className
      )}
      aria-label="目录"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          目录
        </h3>
        {isCollapsible && (
          <button
            onClick={() => {
              // 全部展开/折叠
              const allIds = flattenTocTree(tocItems).map(item => item.id);
              setCollapsedItems(prev => 
                prev.size === 0 ? new Set(allIds) : new Set()
              );
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {collapsedItems.size === 0 ? '全部折叠' : '全部展开'}
          </button>
        )}
      </div>

      <ul className="space-y-1 max-h-96 overflow-y-auto">
        {tocItems.map((item) => (
          <TocItemComponent
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            level={1}
            showNumbers={showNumbers}
            isCollapsed={collapsedItems.has(item.id)}
            onToggle={isCollapsible ? toggleCollapse : undefined}
            onClick={handleItemClick}
            autoCollapse={autoCollapse}
            activeId={activeId}
          />
        ))}
      </ul>
    </nav>
  );
}

// 简化版目录，仅显示主要标题
export function SimpleToc({ contentSelector, maxLevel = 2 }: { 
  contentSelector?: string; 
  maxLevel?: number; 
}) {
  return (
    <TableOfContents
      contentSelector={contentSelector}
      maxLevel={maxLevel}
      isCollapsible={false}
      position="static"
      className="bg-gray-50 dark:bg-gray-800/50 border-l-4 border-primary-500"
    />
  );
}

// 导出类型
export type { TableOfContentsProps, TocItem };