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

export default function ByteMDEditor({
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
  }, [value.length, performanceMode])
  
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
  
  // 样式优化
  const wrapperStyle = useMemo(() => ({
    '--editor-height': `${height}px`,
    height: `${height}px`,
    minHeight: `${height}px`
  } as React.CSSProperties & Record<string, string>), [height])
  
  // 性能模式指示器（开发环境）
  const showPerformanceInfo = process.env.NODE_ENV === 'development'
  
  return (
    <div className="bytemd-editor-wrapper" style={wrapperStyle}>
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
      
      <Editor
        value={value}
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