import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { Editor } from '@bytemd/react'
import type { BytemdPlugin, BytemdLocale } from 'bytemd'
import type { Editor as CodeMirrorEditor, EditorConfiguration } from 'codemirror'
import gfm from '@bytemd/plugin-gfm'
import highlight from '@bytemd/plugin-highlight'
import frontmatter from '@bytemd/plugin-frontmatter'
import { uploadApi } from '../api'
import { foldablePlugin } from './editor-plugins/foldable-plugin'

import 'bytemd/dist/index.css'
import 'highlight.js/styles/vs.css'
import './editor-plugins/foldable-styles.css'

interface ByteMDEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
  realTimeRendering?: boolean
  maxLength?: number
  performanceMode?: 'auto' | 'high' | 'standard'
}

// 性能优化配置
const PERFORMANCE_CONFIG = {
  // 大文档阈值 (字符数)
  LARGE_DOCUMENT_THRESHOLD: 50000, // 50KB
  HUGE_DOCUMENT_THRESHOLD: 90000,  // 90KB
  
  // 防抖配置
  DEBOUNCE_TIMES: {
    standard: 300,
    large: 800,
    huge: 1500
  },
  
  // 批处理配置
  BATCH_SIZE: 1000,
  UPDATE_INTERVAL: 16 // 60fps
} as const

// 缓存插件实例以避免重复创建
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

// 中文本地化配置
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

function ByteMDEditor({
  value,
  onChange,
  height = 1400,
  placeholder = "开始编写你的文章...",
  realTimeRendering = true,
  maxLength,
  performanceMode = 'auto'
}: ByteMDEditorProps) {
  // 性能监控状态
  const [isLargeDocument, setIsLargeDocument] = useState(false)
  const [isHugeDocument, setIsHugeDocument] = useState(false)
  const [actualPerformanceMode, setActualPerformanceMode] = useState<'standard' | 'high'>('standard')
  
  // 防抖和批处理相关
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingValueRef = useRef<string>(value)
  const lastUpdateTimeRef = useRef(Date.now())
  const editorRef = useRef<CodeMirrorEditor | null>(null)
  
  // 动态性能检测
  useEffect(() => {
    const documentSize = value.length
    const newIsLargeDocument = documentSize > PERFORMANCE_CONFIG.LARGE_DOCUMENT_THRESHOLD
    const newIsHugeDocument = documentSize > PERFORMANCE_CONFIG.HUGE_DOCUMENT_THRESHOLD
    
    setIsLargeDocument(newIsLargeDocument)
    setIsHugeDocument(newIsHugeDocument)
    
    // 自动性能模式调整
    if (performanceMode === 'auto') {
      setActualPerformanceMode(newIsHugeDocument ? 'high' : 'standard')
    } else {
      setActualPerformanceMode(performanceMode === 'high' ? 'high' : 'standard')
    }
  }, [value, performanceMode])
  
  // 智能防抖处理
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
      
      // 节流：确保更新间隔不少于 UPDATE_INTERVAL
      if (timeSinceLastUpdate >= PERFORMANCE_CONFIG.UPDATE_INTERVAL) {
        onChange(pendingValueRef.current)
        lastUpdateTimeRef.current = now
      } else {
        // 延迟到合适的时间点
        setTimeout(() => {
          onChange(pendingValueRef.current)
          lastUpdateTimeRef.current = Date.now()
        }, PERFORMANCE_CONFIG.UPDATE_INTERVAL - timeSinceLastUpdate)
      }
    }, debounceTime)
  }, [onChange, isLargeDocument, isHugeDocument])
  
  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])
  
  // 缓存插件配置
  const plugins = useMemo(() => getPlugins(), [])
  
  // 动态预览防抖时间
  const previewDebounce = useMemo(() => {
    if (!realTimeRendering) return 0 // 禁用实时渲染
    
    return isHugeDocument 
      ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.huge
      : isLargeDocument 
        ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.large
        : PERFORMANCE_CONFIG.DEBOUNCE_TIMES.standard
  }, [realTimeRendering, isLargeDocument, isHugeDocument])
  
  // 优化的编辑器配置
  const editorConfig = useMemo(() => {
    const baseConfig = {
      mode: 'gfm' as const,
      lineNumbers: false,
      smartIndent: false,
      electricChars: false,
      indentWithTabs: false,
      indentUnit: 2, // use 2 spaces for each indent level
      tabSize: 2,
      
      // 性能优化配置
      viewportMargin: actualPerformanceMode === 'high' ? 10 : Infinity,
      lineWrapping: true,
      
      // 大文档优化
      ...(isHugeDocument && {
        cursorBlinkRate: 0 // 禁用光标闪烁以提高性能
      }),
      
      extraKeys: {
        // Indentation controls
        'Tab': function (cm: CodeMirrorEditor) {
          cm.execCommand('indentMore')
        },
        'Shift-Tab': function (cm: CodeMirrorEditor) {
          cm.execCommand('indentLess')
        },
        'Enter': function(cm: CodeMirrorEditor) {
          // 缓存编辑器引用以提高性能
          editorRef.current = cm
          
          // 检查光标是否在 <details> 标签内
          const cursor = cm.getCursor()
          
          // 检查是否在折叠块内部
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
            // 在折叠块内部，插入简单换行，不添加任何缩进
            cm.replaceSelection('\n', 'end')
          } else {
            // 正常换行处理
            cm.execCommand('newlineAndIndent')
          }
        }
      }
    }
    
    return baseConfig as Omit<EditorConfiguration, 'value' | 'placeholder'>
  }, [actualPerformanceMode, isHugeDocument])
  
  // 优化的图片上传处理
  const uploadImages = useCallback(async (files: File[]) => {
    try {
      // 批量上传优化
      const batchSize = Math.min(files.length, 5) // 最多同时上传5个文件
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

  // 文件类型检测
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/')
  }

  // 获取文件图标
  const getFileIcon = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf': return '📄'
      case 'doc':
      case 'docx': return '📝'
      case 'xls':
      case 'xlsx': return '📊'
      case 'ppt':
      case 'pptx': return '📊'
      case 'zip':
      case 'rar': return '🗂️'
      case 'txt': return '📄'
      case 'mp3':
      case 'wav': return '🎵'
      case 'mp4':
      case 'avi': return '🎬'
      default: return '📎'
    }
  }

  // 通用文件上传处理（包括图片和其他文件）
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files.length) return

    // 分离图片文件和其他文件
    const imageFiles = files.filter(isImageFile)
    const otherFiles = files.filter(file => !isImageFile(file))

    const markdownResults: string[] = []

    // 处理图片文件（使用现有的uploadImages逻辑）
    if (imageFiles.length > 0) {
      const imageResults = await uploadImages(imageFiles)
      const imageMarkdown = imageResults.map(result => 
        `![${result.alt || ''}](${result.url}${result.title ? ` "${result.title}"` : ''})`
      )
      markdownResults.push(...imageMarkdown)
    }

    // 处理其他文件
    if (otherFiles.length > 0) {
      try {
        const batchSize = Math.min(otherFiles.length, 5)
        const batches = []
        
        for (let i = 0; i < otherFiles.length; i += batchSize) {
          batches.push(otherFiles.slice(i, i + batchSize))
        }
        
        for (const batch of batches) {
          const uploadPromises = batch.map(async (file) => {
            try {
              const response = await uploadApi.uploadFile(file, undefined, 240000) // 240秒超时
              if (response.success && response.data) {
                const icon = getFileIcon(file.name)
                const fileSize = (file.size / 1024).toFixed(1) + 'KB'
                if (file.size > 1024 * 1024) {
                  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + 'MB'
                  return `[${icon} ${file.name} (${fileSizeMB})](${response.data.url})`
                }
                return `[${icon} ${file.name} (${fileSize})](${response.data.url})`
              } else {
                console.error('File upload failed:', response.error)
                return null
              }
            } catch (error) {
              console.error('Error uploading file:', file.name, error)
              return null
            }
          })
          
          const batchResults = await Promise.all(uploadPromises)
          const validResults = batchResults.filter(Boolean) as string[]
          markdownResults.push(...validResults)
        }
      } catch (error) {
        console.error('File upload error:', error)
      }
    }

    // 将结果插入到编辑器中
    if (markdownResults.length > 0) {
      const currentValue = value || ''
      const newContent = markdownResults.join('\n\n')
      const updatedValue = currentValue + (currentValue.endsWith('\n') ? '' : '\n\n') + newContent + '\n\n'
      onChange(updatedValue)
    }
  }, [uploadImages, value, onChange])
  
  // 拖拽状态
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  // 拖拽事件处理
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
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // 样式优化
  const wrapperStyle = useMemo(() => ({
    '--editor-height': `${height}px`,
    height: `${height}px`,
    minHeight: `${height}px`
  } as React.CSSProperties & Record<string, string>), [height])
  
  // 性能模式指示器（开发环境）
  const showPerformanceInfo = process.env.NODE_ENV === 'development'
  
  return (
    <div 
      className="bytemd-editor-wrapper" 
      style={wrapperStyle}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showPerformanceInfo && (isLargeDocument || isHugeDocument) && (
        <div className="performance-indicator" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: isHugeDocument ? '#ef4444' : '#f59e0b',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          {isHugeDocument ? '巨大文档模式' : '大文档模式'} - {actualPerformanceMode === 'high' ? '高性能' : '标准'}
        </div>
      )}

      {/* 拖拽悬停提示 */}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '2px dashed #3b82f6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'white',
            padding: '20px 30px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            textAlign: 'center',
            color: '#3b82f6',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            📎 拖放文件到这里上传
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
              支持图片、PDF、文档等格式
            </div>
          </div>
        </div>
      )}
      
      <Editor
        value={value || ''}
        plugins={plugins}
        onChange={debouncedOnChange}
        placeholder={placeholder}
        mode="split"
        previewDebounce={previewDebounce}
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
}

// Custom props comparison to prevent unnecessary re-renders
const propsAreEqual = (prev: ByteMDEditorProps, next: ByteMDEditorProps) => {
  return (
    prev.value === next.value &&
    prev.height === next.height &&
    prev.placeholder === next.placeholder &&
    prev.realTimeRendering === next.realTimeRendering &&
    prev.maxLength === next.maxLength &&
    prev.performanceMode === next.performanceMode
  );
};

export default React.memo(ByteMDEditor, propsAreEqual);