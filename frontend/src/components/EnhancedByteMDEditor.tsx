import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { Editor } from '@bytemd/react'
import type { BytemdPlugin, BytemdLocale } from 'bytemd'
import type { Editor as CodeMirrorEditor, EditorConfiguration } from 'codemirror'
import gfm from '@bytemd/plugin-gfm'
import highlight from '@bytemd/plugin-highlight'
import frontmatter from '@bytemd/plugin-frontmatter'
import { uploadApi } from '../api'
import { foldablePlugin } from './editor-plugins/foldable-plugin'

// Import new UX components
import FloatingTOC, { useTOC } from './editor-components/FloatingTOC'
import ContextToolbar, { useContextToolbar } from './editor-components/ContextToolbar'
import ResponsiveLayout, { useResponsiveLayout, type LayoutMode } from './editor-components/ResponsiveLayout'
import { SemanticSyncManager, parseMarkdownBlocks, type MarkdownBlock } from './editor-utils/semantic-sync'

import 'bytemd/dist/index.css'
import 'highlight.js/styles/vs.css'
import './editor-plugins/foldable-styles.css'

interface EnhancedByteMDEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
  realTimeRendering?: boolean
  maxLength?: number
  performanceMode?: 'auto' | 'high' | 'standard'

  // New UX features
  enableSemanticSync?: boolean
  enableTOC?: boolean
  enableContextToolbar?: boolean
  enableResponsiveLayout?: boolean
  enableGestures?: boolean
  autoLayout?: boolean
  initialLayoutMode?: LayoutMode
}

// Performance optimization configuration (keeping existing optimizations)
const PERFORMANCE_CONFIG = {
  LARGE_DOCUMENT_THRESHOLD: 50000,
  HUGE_DOCUMENT_THRESHOLD: 90000,
  DEBOUNCE_TIMES: {
    standard: 300,
    large: 800,
    huge: 1500
  },
  BATCH_SIZE: 1000,
  UPDATE_INTERVAL: 16
} as const

// Plugin cache
const pluginCache = new Map<string, BytemdPlugin[]>()

function getPlugins(): BytemdPlugin[] {
  const cacheKey = 'default'
  if (!pluginCache.has(cacheKey)) {
    pluginCache.set(cacheKey, [
      gfm(),
      highlight(),
      frontmatter(),
      foldablePlugin()
    ])
  }
  return pluginCache.get(cacheKey) || []
}

// Chinese localization
const zhCNLocale: Partial<BytemdLocale> = {
  write: '编写',
  preview: '预览',
  writeOnly: '纯编辑',
  exitWriteOnly: '退出纯编辑',
  previewOnly: '纯预览',
  exitPreviewOnly: '退出纯预览',
  help: '帮助',
  closeHelp: '关闭帮助',
  toc: '目录',
  closeToc: '关闭目录',
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
  source: '源码',
  cheatsheet: '快捷键',
  shortcuts: '快捷键',
  words: '字数',
  lines: '行数',
  sync: '同步滚动',
  top: '回到顶部',
  limited: '字数限制',
  h1: '标题1',
  h2: '标题2',
  h3: '标题3',
  h4: '标题4',
  h5: '标题5',
  h6: '标题6',
  headingText: '标题文本',
  bold: '粗体',
  boldText: '粗体文本',
  italic: '斜体',
  italicText: '斜体文本',
  quote: '引用',
  quotedText: '引用文本',
  link: '链接',
  linkText: '链接文本',
  image: '图片',
  imageAlt: '图片描述',
  imageTitle: '图片标题',
  code: '代码',
  codeText: '代码文本',
  codeBlock: '代码块',
  codeLang: '代码语言',
  ul: '无序列表',
  ulItem: '列表项',
  ol: '有序列表',
  olItem: '列表项',
  hr: '分割线'
}

function EnhancedByteMDEditor({
  value,
  onChange,
  height = 1400,
  placeholder = "开始编写你的文章...",
  realTimeRendering = true,
  maxLength,
  performanceMode = 'auto',

  // New UX features
  enableSemanticSync = true,
  enableTOC = true,
  enableContextToolbar = true,
  enableResponsiveLayout = true,
  enableGestures = true,
  autoLayout = true,
  initialLayoutMode = 'split'
}: EnhancedByteMDEditorProps) {
  // Existing performance states
  const [isLargeDocument, setIsLargeDocument] = useState(false)
  const [isHugeDocument, setIsHugeDocument] = useState(false)
  const [actualPerformanceMode, setActualPerformanceMode] = useState<'standard' | 'high'>('standard')

  // New UX states
  const [blocks, setBlocks] = useState<MarkdownBlock[]>([])
  const [currentLine, setCurrentLine] = useState(0)
  const [currentColumn, setCurrentColumn] = useState(0)
  const [selectedText, setSelectedText] = useState('')

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingValueRef = useRef<string>(value)
  const lastUpdateTimeRef = useRef(Date.now())
  const editorRef = useRef<CodeMirrorEditor | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const syncManagerRef = useRef<SemanticSyncManager | null>(null)

  // Hooks for new features
  const { mode, setMode, viewport } = useResponsiveLayout()
  const { isVisible: tocVisible, setIsVisible: setTocVisible, toggleVisibility: toggleTOC, hasHeadings } = useTOC(blocks)
  const { currentBlock, setCurrentBlock, hasSelection, setHasSelection, handleAction } = useContextToolbar()

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  // Initialize with layout mode
  useEffect(() => {
    if (initialLayoutMode) {
      setMode(initialLayoutMode)
    }
  }, [initialLayoutMode, setMode])

  // Performance detection (existing logic)
  useEffect(() => {
    const documentSize = value.length
    const newIsLargeDocument = documentSize > PERFORMANCE_CONFIG.LARGE_DOCUMENT_THRESHOLD
    const newIsHugeDocument = documentSize > PERFORMANCE_CONFIG.HUGE_DOCUMENT_THRESHOLD

    setIsLargeDocument(newIsLargeDocument)
    setIsHugeDocument(newIsHugeDocument)

    if (performanceMode === 'auto') {
      setActualPerformanceMode(newIsHugeDocument ? 'high' : 'standard')
    } else {
      setActualPerformanceMode(performanceMode === 'high' ? 'high' : 'standard')
    }
  }, [value, performanceMode])

  // Parse markdown blocks for semantic features
  useEffect(() => {
    if (enableSemanticSync || enableTOC) {
      const parsedBlocks = parseMarkdownBlocks(value)
      setBlocks(parsedBlocks)
    }
  }, [value, enableSemanticSync, enableTOC])

  // Initialize semantic sync manager
  useEffect(() => {
    if (enableSemanticSync && editorRef.current && previewRef.current) {
      syncManagerRef.current = new SemanticSyncManager(
        editorRef.current.getWrapperElement(),
        previewRef.current,
        { mode: 'semantic', accuracy: 'balanced' }
      )
    }

    return () => {
      syncManagerRef.current = null
    }
  }, [enableSemanticSync])

  // Update sync manager content
  useEffect(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.updateContent(value)
    }
  }, [value])

  // Handle cursor position changes
  const handleCursorActivity = useCallback((editor: CodeMirrorEditor) => {
    const cursor = editor.getCursor()
    setCurrentLine(cursor.line)
    setCurrentColumn(cursor.ch)

    // Find current block
    if (blocks.length > 0) {
      const lineNumber = cursor.line + 1 // Convert to 1-based
      const block = blocks.find(b => lineNumber >= b.startLine && lineNumber <= b.endLine)
      setCurrentBlock(block)
    }

    // Handle semantic sync
    if (enableSemanticSync && syncManagerRef.current) {
      syncManagerRef.current.syncEditorToPreview(cursor.line, cursor.ch)
    }
  }, [blocks, enableSemanticSync, setCurrentBlock])

  // Handle text selection
  const handleSelectionChange = useCallback((editor: CodeMirrorEditor) => {
    const selection = editor.getSelection()
    setSelectedText(selection)
    setHasSelection(selection.length > 0)
  }, [setHasSelection])

  // Smart debounced onChange (existing logic)
  const debouncedOnChange = useCallback((newValue: string) => {
    pendingValueRef.current = newValue

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const debounceTime = isHugeDocument
      ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.huge
      : isLargeDocument
        ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.large
        : PERFORMANCE_CONFIG.DEBOUNCE_TIMES.standard

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current

      if (timeSinceLastUpdate >= PERFORMANCE_CONFIG.UPDATE_INTERVAL) {
        onChange(pendingValueRef.current)
        lastUpdateTimeRef.current = now
      } else {
        setTimeout(() => {
          onChange(pendingValueRef.current)
          lastUpdateTimeRef.current = Date.now()
        }, PERFORMANCE_CONFIG.UPDATE_INTERVAL - timeSinceLastUpdate)
      }
    }, debounceTime)
  }, [onChange, isLargeDocument, isHugeDocument])

  // Enhanced editor configuration
  const editorConfig = useMemo(() => {
    const baseConfig = {
      mode: 'gfm' as const,
      lineNumbers: false,
      smartIndent: false,
      electricChars: false,
      indentWithTabs: false,
      indentUnit: 2,
      tabSize: 2,

      viewportMargin: actualPerformanceMode === 'high' ? 10 : Infinity,
      lineWrapping: true,

      ...(isHugeDocument && {
        cursorBlinkRate: 0
      }),

      extraKeys: {
        'Tab': function (cm: CodeMirrorEditor) {
          cm.execCommand('indentMore')
        },
        'Shift-Tab': function (cm: CodeMirrorEditor) {
          cm.execCommand('indentLess')
        },
        'Enter': function(cm: CodeMirrorEditor) {
          editorRef.current = cm

          const cursor = cm.getCursor()
          let isInDetails = false
          for (let i = cursor.line; i >= 0; i--) {
            const currentLine = cm.getLine(i)
            if (currentLine && currentLine.includes('<details>')) {
              isInDetails = true
              break
            }
            if (currentLine && currentLine.includes('</details>')) {
              break
            }
          }

          if (isInDetails) {
            cm.replaceSelection('\n', 'end')
          } else {
            cm.execCommand('newlineAndIndent')
          }
        }
      }
    }

    return baseConfig as Omit<EditorConfiguration, 'value' | 'placeholder'>
  }, [actualPerformanceMode, isHugeDocument])

  // Handle TOC navigation
  const handleTOCNavigate = useCallback((line: number, blockId: string) => {
    if (editorRef.current) {
      editorRef.current.setCursor(line, 0)
      editorRef.current.focus()

      // Scroll to line
      const lineInfo = editorRef.current.lineInfo(line)
      if (lineInfo) {
        editorRef.current.scrollIntoView({ line, ch: 0 }, 100)
      }
    }
  }, [])

  // Handle toolbar actions
  const handleToolbarAction = useCallback((actionId: string, data?: any) => {
    switch (actionId) {
      case 'toc':
        toggleTOC()
        break
      case 'preview':
        setMode(mode === 'preview-only' ? 'split' : 'preview-only')
        break
      default:
        handleAction(actionId, data)
    }
  }, [toggleTOC, mode, setMode, handleAction])

  // File upload handling (existing logic with optimizations)
  const uploadImages = useCallback(async (files: File[]) => {
    try {
      const batchSize = Math.min(files.length, 5)
      const batches = []

      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize))
      }

      const allResults = []

      for (const batch of batches) {
        const uploadPromises = batch.map(async (file) => {
          try {
            const response = await uploadApi.uploadImage(file)
            if (response.success && response.data) {
              return {
                url: response.data.url,
                alt: file.name,
                title: file.name
              }
            } else {
              console.error('Image upload failed:', response.error)
              return null
            }
          } catch (error) {
            console.error('Error uploading image:', file.name, error)
            return null
          }
        })

        const batchResults = await Promise.all(uploadPromises)
        allResults.push(...batchResults)
      }

      return allResults.filter(Boolean) as Array<{ url: string; alt?: string; title?: string }>
    } catch (error) {
      console.error('Batch image upload error:', error)
      return []
    }
  }, [])

  // Drag and drop handlers (existing logic)
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadImages(files).then(results => {
        const markdownImages = results.map(result =>
          `![${result.alt || ''}](${result.url}${result.title ? ` "${result.title}"` : ''})`
        ).join('\n\n')

        if (markdownImages) {
          const currentValue = value || ''
          const newContent = currentValue + (currentValue.endsWith('\n') ? '' : '\n\n') + markdownImages + '\n\n'
          onChange(newContent)
        }
      })
    }
  }, [uploadImages, value, onChange])

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Render editor component
  const renderEditor = () => (
    <div className="h-full relative">
      <Editor
        value={value || ''}
        plugins={useMemo(() => getPlugins(), [])}
        onChange={debouncedOnChange}
        placeholder={placeholder}
        mode="split"
        previewDebounce={useMemo(() => {
          if (!realTimeRendering) return 0
          return isHugeDocument
            ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.huge
            : isLargeDocument
              ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.large
              : PERFORMANCE_CONFIG.DEBOUNCE_TIMES.standard
        }, [realTimeRendering, isLargeDocument, isHugeDocument])}
        locale={zhCNLocale}
        editorConfig={editorConfig}
        uploadImages={uploadImages}
        sanitize={(html) => html}
        maxLength={maxLength}
        {...(actualPerformanceMode === 'high' && {
          overridePreview: !realTimeRendering ? (() => {}) : undefined
        })}
      />
    </div>
  )

  // Render preview component
  const renderPreview = () => (
    <div ref={previewRef} className="h-full overflow-auto p-4 prose prose-sm max-w-none">
      {/* Preview content would be handled by ByteMD internally */}
    </div>
  )

  // Main component structure
  const editorContent = (
    <div
      className="relative h-full"
      style={{ '--editor-height': `${height}px`, height: `${height}px`, minHeight: `${height}px` } as React.CSSProperties & Record<string, string>}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (isLargeDocument || isHugeDocument) && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-50">
          {isHugeDocument ? '巨大文档模式' : '大文档模式'}
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-blue-600 text-lg font-medium">拖放文件到这里上传</div>
            <div className="text-blue-500 text-sm">支持图片、PDF、文档等格式</div>
          </div>
        </div>
      )}

      {/* Main editor/layout */}
      {enableResponsiveLayout ? (
        <ResponsiveLayout
          mode={mode}
          onModeChange={setMode}
          enableGestures={enableGestures}
          autoLayout={autoLayout}
        >
          {{
            editor: renderEditor(),
            preview: renderPreview(),
            toolbar: enableContextToolbar && (
              <ContextToolbar
                onAction={handleToolbarAction}
                currentBlock={currentBlock}
                hasSelection={hasSelection}
                compact={viewport.isMobile}
              />
            ),
            toc: enableTOC && hasHeadings && tocVisible && (
              <FloatingTOC
                blocks={blocks}
                currentLine={currentLine}
                onNavigate={handleTOCNavigate}
                onClose={() => setTocVisible(false)}
                position={viewport.isMobile ? 'left' : 'right'}
                isVisible={tocVisible}
              />
            )
          }}
        </ResponsiveLayout>
      ) : (
        <div className="h-full flex flex-col">
          {enableContextToolbar && (
            <ContextToolbar
              onAction={handleToolbarAction}
              currentBlock={currentBlock}
              hasSelection={hasSelection}
              compact={viewport.isMobile}
            />
          )}
          <div className="flex-1">
            {renderEditor()}
          </div>
        </div>
      )}

      {/* Floating TOC for non-responsive mode */}
      {!enableResponsiveLayout && enableTOC && hasHeadings && tocVisible && (
        <FloatingTOC
          blocks={blocks}
          currentLine={currentLine}
          onNavigate={handleTOCNavigate}
          onClose={() => setTocVisible(false)}
          position="right"
          isVisible={tocVisible}
        />
      )}
    </div>
  )

  return editorContent
}

// Props comparison for React.memo optimization
const propsAreEqual = (prev: EnhancedByteMDEditorProps, next: EnhancedByteMDEditorProps) => {
  return (
    prev.value === next.value &&
    prev.height === next.height &&
    prev.placeholder === next.placeholder &&
    prev.realTimeRendering === next.realTimeRendering &&
    prev.maxLength === next.maxLength &&
    prev.performanceMode === next.performanceMode &&
    prev.enableSemanticSync === next.enableSemanticSync &&
    prev.enableTOC === next.enableTOC &&
    prev.enableContextToolbar === next.enableContextToolbar &&
    prev.enableResponsiveLayout === next.enableResponsiveLayout &&
    prev.enableGestures === next.enableGestures &&
    prev.autoLayout === next.autoLayout &&
    prev.initialLayoutMode === next.initialLayoutMode
  )
}

export default React.memo(EnhancedByteMDEditor, propsAreEqual)