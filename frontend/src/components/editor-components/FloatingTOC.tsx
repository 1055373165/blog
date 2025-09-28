import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronDownIcon, ChevronRightIcon, BookOpenIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { MarkdownBlock } from '../editor-utils/semantic-sync'

interface TOCItem {
  id: string
  title: string
  level: number
  line: number
  children: TOCItem[]
  block: MarkdownBlock
}

interface FloatingTOCProps {
  blocks: MarkdownBlock[]
  currentLine?: number
  onNavigate: (line: number, blockId: string) => void
  onClose?: () => void
  className?: string
  position?: 'left' | 'right'
  isVisible?: boolean
  showProgress?: boolean
}

export default function FloatingTOC({
  blocks,
  currentLine = 0,
  onNavigate,
  onClose,
  className = '',
  position = 'right',
  isVisible = true,
  showProgress = true
}: FloatingTOCProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const tocRef = useRef<HTMLDivElement>(null)

  // Build hierarchical TOC structure from heading blocks
  const tocItems = useMemo(() => {
    const headingBlocks = blocks.filter(block => block.type === 'heading')
    const items: TOCItem[] = []
    const stack: TOCItem[] = []

    for (const block of headingBlocks) {
      const level = block.level || 1
      const title = block.content.replace(/^#{1,6}\s+/, '').trim() || 'Untitled'

      const tocItem: TOCItem = {
        id: block.id,
        title: title,
        level: level,
        line: block.startLine,
        children: [],
        block: block
      }

      // Find the correct parent based on heading hierarchy
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      if (stack.length === 0) {
        items.push(tocItem)
      } else {
        stack[stack.length - 1].children.push(tocItem)
      }

      stack.push(tocItem)
    }

    return items
  }, [blocks])

  // Find current active item based on current line
  const activeItemId = useMemo(() => {
    if (!currentLine) return null

    const headingBlocks = blocks.filter(block => block.type === 'heading')

    // Find the closest heading before or at the current line
    let closestBlock: MarkdownBlock | null = null
    for (const block of headingBlocks) {
      if (block.startLine <= currentLine) {
        if (!closestBlock || block.startLine > closestBlock.startLine) {
          closestBlock = block
        }
      }
    }

    return closestBlock?.id || null
  }, [blocks, currentLine])

  // Auto-expand parents of active item
  useEffect(() => {
    if (activeItemId) {
      const expandParents = (items: TOCItem[], targetId: string, parents: string[] = []): boolean => {
        for (const item of items) {
          const currentPath = [...parents, item.id]

          if (item.id === targetId) {
            setExpandedItems(prev => new Set([...prev, ...parents]))
            return true
          }

          if (expandParents(item.children, targetId, currentPath)) {
            return true
          }
        }
        return false
      }

      expandParents(tocItems, activeItemId)
    }
  }, [activeItemId, tocItems])

  // Calculate reading progress
  const readingProgress = useMemo(() => {
    if (!showProgress || !currentLine || blocks.length === 0) return 0

    const totalLines = Math.max(...blocks.map(block => block.endLine))
    return Math.min(100, Math.max(0, (currentLine / totalLines) * 100))
  }, [currentLine, blocks, showProgress])

  const handleItemClick = useCallback((item: TOCItem) => {
    onNavigate(item.line - 1, item.id) // Convert to 0-based line number
  }, [onNavigate])

  const toggleExpanded = useCallback((itemId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const renderTOCItem = useCallback((item: TOCItem, depth = 0) => {
    const isActive = item.id === activeItemId
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children.length > 0
    const isHovered = hoveredItem === item.id

    return (
      <div key={item.id} className="toc-item">
        <div
          className={`
            flex items-center px-2 py-1 text-sm cursor-pointer rounded-md
            transition-colors duration-150 ease-in-out
            ${isActive
              ? 'bg-blue-100 text-blue-800 font-medium border-l-2 border-blue-500'
              : isHovered
                ? 'bg-gray-100 text-gray-700'
                : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {hasChildren && (
            <button
              className="flex-shrink-0 p-0.5 mr-1 hover:bg-gray-200 rounded transition-colors"
              onClick={(e) => toggleExpanded(item.id, e)}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          )}

          {!hasChildren && (
            <div className="w-4 mr-1" /> // Spacer for alignment
          )}

          <span
            className={`
              flex-1 truncate text-xs
              ${item.level === 1 ? 'font-semibold' : ''}
              ${item.level === 2 ? 'font-medium' : ''}
              ${item.level >= 3 ? 'font-normal' : ''}
            `}
            title={item.title}
          >
            {item.title}
          </span>

          {isActive && (
            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="toc-children">
            {item.children.map(child => renderTOCItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }, [activeItemId, expandedItems, hoveredItem, handleItemClick, toggleExpanded])

  if (!isVisible) return null

  return (
    <div
      ref={tocRef}
      className={`
        fixed top-20 ${position === 'right' ? 'right-4' : 'left-4'}
        w-72 max-h-96 bg-white rounded-lg shadow-lg border border-gray-200
        transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'h-12' : 'h-auto'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <BookOpenIcon className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">目录</span>
          {tocItems.length > 0 && (
            <span className="text-xs text-gray-500">({tocItems.length})</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isCollapsed ? '展开目录' : '折叠目录'}
          >
            <ChevronDownIcon
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="关闭目录"
            >
              <XMarkIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Progress bar */}
          {showProgress && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>阅读进度</span>
                <span>{Math.round(readingProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* TOC Content */}
          <div className="p-2 max-h-80 overflow-y-auto custom-scrollbar">
            {tocItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">暂无标题</p>
                <p className="text-xs text-gray-400 mt-1">添加标题来生成目录</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {tocItems.map(item => renderTOCItem(item))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  )
}

// Hook for managing TOC state
export function useTOC(blocks: MarkdownBlock[]) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<'left' | 'right'>('right')

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])

  const hasHeadings = useMemo(() => {
    return blocks.some(block => block.type === 'heading')
  }, [blocks])

  return {
    isVisible,
    setIsVisible,
    position,
    setPosition,
    toggleVisibility,
    hasHeadings
  }
}