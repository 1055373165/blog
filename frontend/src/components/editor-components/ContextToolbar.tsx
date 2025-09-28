import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  CodeBracketIcon,
  LinkIcon,
  PhotoIcon,
  ListBulletIcon,
  HashtagIcon,
  ChatBubbleLeftRightIcon as QuoteLeftIcon,
  TableCellsIcon,
  EyeIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { MarkdownBlock } from '../editor-utils/semantic-sync'

interface ToolbarAction {
  id: string
  icon: React.ComponentType<any>
  label: string
  shortcut: string
  action: () => void
  isActive?: boolean
  context?: 'always' | 'selection' | 'heading' | 'list' | 'table' | 'code'
}

interface ContextToolbarProps {
  onAction: (actionId: string, data?: any) => void
  currentBlock?: MarkdownBlock
  hasSelection?: boolean
  isSticky?: boolean
  position?: 'top' | 'bottom'
  className?: string
  compact?: boolean
}

export default function ContextToolbar({
  onAction,
  currentBlock,
  hasSelection = false,
  isSticky = true,
  position = 'top',
  className = '',
  compact = false
}: ContextToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set())
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Define toolbar actions with context awareness
  const allActions: ToolbarAction[] = useMemo(() => [
    {
      id: 'bold',
      icon: BoldIcon,
      label: '粗体',
      shortcut: 'Ctrl+B',
      action: () => onAction('bold'),
      context: 'always'
    },
    {
      id: 'italic',
      icon: ItalicIcon,
      label: '斜体',
      shortcut: 'Ctrl+I',
      action: () => onAction('italic'),
      context: 'always'
    },
    {
      id: 'code',
      icon: CodeBracketIcon,
      label: '代码',
      shortcut: 'Ctrl+`',
      action: () => onAction('code'),
      context: 'always'
    },
    {
      id: 'link',
      icon: LinkIcon,
      label: '链接',
      shortcut: 'Ctrl+K',
      action: () => onAction('link'),
      context: 'selection'
    },
    {
      id: 'image',
      icon: PhotoIcon,
      label: '图片',
      shortcut: 'Ctrl+Shift+I',
      action: () => onAction('image'),
      context: 'always'
    },
    {
      id: 'heading',
      icon: HashtagIcon,
      label: '标题',
      shortcut: 'Ctrl+1-6',
      action: () => onAction('heading'),
      context: 'always'
    },
    {
      id: 'quote',
      icon: QuoteLeftIcon,
      label: '引用',
      shortcut: 'Ctrl+Shift+>',
      action: () => onAction('quote'),
      context: 'always'
    },
    {
      id: 'list',
      icon: ListBulletIcon,
      label: '列表',
      shortcut: 'Ctrl+Shift+L',
      action: () => onAction('list'),
      context: 'always'
    },
    {
      id: 'table',
      icon: TableCellsIcon,
      label: '表格',
      shortcut: 'Ctrl+Shift+T',
      action: () => onAction('table'),
      context: 'always'
    },
    {
      id: 'preview',
      icon: EyeIcon,
      label: '预览',
      shortcut: 'Ctrl+Shift+P',
      action: () => onAction('preview'),
      context: 'always'
    },
    {
      id: 'toc',
      icon: DocumentTextIcon,
      label: '目录',
      shortcut: 'Ctrl+Shift+O',
      action: () => onAction('toc'),
      context: 'always'
    }
  ], [onAction])

  // Filter actions based on current context
  const contextualActions = useMemo(() => {
    return allActions.filter(action => {
      switch (action.context) {
        case 'always':
          return true
        case 'selection':
          return hasSelection
        case 'heading':
          return currentBlock?.type === 'heading'
        case 'list':
          return currentBlock?.type === 'list'
        case 'table':
          return currentBlock?.type === 'table'
        case 'code':
          return currentBlock?.type === 'code'
        default:
          return true
      }
    })
  }, [allActions, hasSelection, currentBlock])

  // Get context-specific suggestions
  const contextualSuggestions = useMemo(() => {
    if (!currentBlock) return []

    const suggestions: string[] = []

    switch (currentBlock.type) {
      case 'heading':
        suggestions.push('添加粗体强调', '插入链接', '添加代码示例')
        break
      case 'paragraph':
        suggestions.push('转换为标题', '添加列表', '插入引用')
        break
      case 'list':
        suggestions.push('添加子列表', '转换为表格', '添加链接')
        break
      case 'code':
        suggestions.push('添加说明文字', '设置语言高亮')
        break
      case 'table':
        suggestions.push('添加行', '添加列', '设置表头')
        break
      default:
        suggestions.push('添加标题', '插入列表', '添加引用')
    }

    return suggestions
  }, [currentBlock])

  const handleActionClick = useCallback((action: ToolbarAction) => {
    action.action()

    // Visual feedback
    setActiveActions(prev => {
      const newSet = new Set(prev)
      newSet.add(action.id)
      return newSet
    })

    // Remove active state after animation
    setTimeout(() => {
      setActiveActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(action.id)
        return newSet
      })
    }, 200)
  }, [])

  const renderAction = useCallback((action: ToolbarAction) => {
    const isActive = activeActions.has(action.id)
    const Icon = action.icon

    return (
      <button
        key={action.id}
        onClick={() => handleActionClick(action)}
        className={`
          group relative flex items-center justify-center p-2 rounded-md
          transition-all duration-150 ease-in-out
          ${isActive
            ? 'bg-blue-500 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
          }
          ${compact ? 'p-1.5' : 'p-2'}
        `}
        title={`${action.label} (${action.shortcut})`}
      >
        <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />

        {/* Tooltip */}
        <div className="
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0
          group-hover:opacity-100 transition-opacity duration-200 pointer-events-none
          whitespace-nowrap z-10
        ">
          {action.label}
          <div className="text-xs text-gray-300">{action.shortcut}</div>
        </div>
      </button>
    )
  }, [activeActions, handleActionClick, compact])

  return (
    <div
      ref={toolbarRef}
      className={`
        ${isSticky ? 'sticky' : 'relative'}
        ${position === 'top' ? 'top-0' : 'bottom-0'}
        z-40 bg-white border-b border-gray-200 shadow-sm
        transition-all duration-300 ease-in-out
        ${className}
      `}
    >
      <div className="flex items-center justify-between px-4 py-2">
        {/* Main toolbar actions */}
        <div className="flex items-center space-x-1">
          {contextualActions.map(renderAction)}
        </div>

        {/* Context info and collapse button */}
        <div className="flex items-center space-x-3">
          {/* Current context indicator */}
          {currentBlock && !compact && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="capitalize">{currentBlock.type}</span>
              {currentBlock.level && (
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  H{currentBlock.level}
                </span>
              )}
            </div>
          )}

          {/* Collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            {isCollapsed ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Contextual suggestions */}
      {!isCollapsed && !compact && contextualSuggestions.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span className="font-medium">建议:</span>
            {contextualSuggestions.slice(0, 3).map((suggestion, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => onAction('suggestion', { suggestion })}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing toolbar state and actions
export function useContextToolbar() {
  const [currentBlock, setCurrentBlock] = useState<MarkdownBlock | undefined>()
  const [hasSelection, setHasSelection] = useState(false)

  const handleAction = useCallback((actionId: string, data?: any) => {
    switch (actionId) {
      case 'bold':
        document.execCommand('bold')
        break
      case 'italic':
        document.execCommand('italic')
        break
      case 'code':
        // Insert inline code
        insertText('`', '`')
        break
      case 'link':
        insertLink()
        break
      case 'image':
        insertImage()
        break
      case 'heading':
        insertHeading()
        break
      case 'quote':
        insertQuote()
        break
      case 'list':
        insertList()
        break
      case 'table':
        insertTable()
        break
      case 'preview':
        togglePreview()
        break
      case 'toc':
        toggleTOC()
        break
      case 'suggestion':
        handleSuggestion(data?.suggestion)
        break
      default:
        console.log('Unknown action:', actionId, data)
    }
  }, [])

  const insertText = (before: string, after = '') => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      const newText = before + selectedText + after
      range.deleteContents()
      range.insertNode(document.createTextNode(newText))
    }
  }

  const insertLink = () => {
    const url = prompt('请输入链接地址:')
    if (url) {
      const text = window.getSelection()?.toString() || '链接文本'
      insertText(`[${text}](${url})`)
    }
  }

  const insertImage = () => {
    const url = prompt('请输入图片地址:')
    if (url) {
      const alt = prompt('请输入图片描述:') || '图片'
      insertText(`![${alt}](${url})`)
    }
  }

  const insertHeading = () => {
    const level = prompt('请输入标题级别 (1-6):')
    if (level && /^[1-6]$/.test(level)) {
      const hashes = '#'.repeat(parseInt(level))
      insertText(`${hashes} `)
    }
  }

  const insertQuote = () => {
    insertText('> ')
  }

  const insertList = () => {
    insertText('- ')
  }

  const insertTable = () => {
    const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
`
    insertText(table.trim())
  }

  const togglePreview = () => {
    // This would be handled by the parent component
    console.log('Toggle preview')
  }

  const toggleTOC = () => {
    // This would be handled by the parent component
    console.log('Toggle TOC')
  }

  const handleSuggestion = (suggestion: string) => {
    console.log('Handle suggestion:', suggestion)
    // Implement context-specific suggestions
  }

  return {
    currentBlock,
    setCurrentBlock,
    hasSelection,
    setHasSelection,
    handleAction
  }
}