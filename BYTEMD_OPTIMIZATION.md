# ByteMD Editor Performance Optimization

This document details the comprehensive performance optimizations implemented for the ByteMDEditor component to handle large documents (90KB+) efficiently.

## Overview

The optimized ByteMDEditor component provides enhanced performance for large documents while maintaining all existing functionality including the foldable plugin, image upload, and Chinese localization.

## Key Features

### 1. **Automatic Performance Detection**
```typescript
// Dynamic performance mode switching
const PERFORMANCE_CONFIG = {
  LARGE_DOCUMENT_THRESHOLD: 50000, // 50KB
  HUGE_DOCUMENT_THRESHOLD: 90000,  // 90KB
}
```

### 2. **Intelligent Debouncing**
- **Standard documents**: 300ms debounce
- **Large documents (>50KB)**: 800ms debounce  
- **Huge documents (>90KB)**: 1500ms debounce

### 3. **60fps Throttling**
Ensures updates don't exceed 60fps (16ms intervals) for smooth editing experience.

### 4. **Real-Time Rendering Control**
```typescript
interface ByteMDEditorProps {
  realTimeRendering?: boolean; // Toggle preview updates
  performanceMode?: 'auto' | 'high' | 'standard';
}
```

## Performance Optimizations

### 1. **Plugin Caching**
```typescript
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
```

### 2. **Smart Debouncing with Batching**
```typescript
const debouncedOnChange = useCallback((newValue: string) => {
  pendingValueRef.current = newValue
  
  const debounceTime = isHugeDocument 
    ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.huge
    : isLargeDocument 
      ? PERFORMANCE_CONFIG.DEBOUNCE_TIMES.large
      : PERFORMANCE_CONFIG.DEBOUNCE_TIMES.standard
  
  // 60fps throttling logic
  debounceTimerRef.current = setTimeout(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current
    
    if (timeSinceLastUpdate >= PERFORMANCE_CONFIG.UPDATE_INTERVAL) {
      onChange(pendingValueRef.current)
      lastUpdateTimeRef.current = now
    }
  }, debounceTime)
}, [onChange, isLargeDocument, isHugeDocument])
```

### 3. **Optimized Editor Configuration**
```typescript
const editorConfig = useMemo(() => {
  const baseConfig = {
    mode: 'gfm' as const,
    lineNumbers: false,
    smartIndent: false,
    electricChars: false,
    indentWithTabs: false,
    indentUnit: 0,
    tabSize: 2,
    
    // Performance optimizations
    viewportMargin: actualPerformanceMode === 'high' ? 10 : Infinity,
    lineWrapping: true,
    
    // Large document optimizations
    ...(isHugeDocument && {
      cursorBlinkRate: 0 // Disable cursor blinking for performance
    }),
  }
  
  return baseConfig as Omit<EditorConfiguration, 'value' | 'placeholder'>
}, [actualPerformanceMode, isHugeDocument])
```

### 4. **Batch Image Upload**
```typescript
const uploadImages = useCallback(async (files: File[]) => {
  const batchSize = Math.min(files.length, 5) // Max 5 concurrent uploads
  const batches = []
  
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize))
  }
  
  // Process batches sequentially
  for (const batch of batches) {
    const batchResults = await Promise.all(uploadPromises)
    allResults.push(...batchResults)
  }
}, [])
```

### 5. **Memory-Efficient Styling**
```typescript
const wrapperStyle = useMemo(() => ({
  '--editor-height': `${height}px`,
  height: `${height}px`,
  minHeight: `${height}px`
} as React.CSSProperties & Record<string, string>), [height])
```

## TypeScript Fixes

### 1. **Fixed Locale Type Error**
```typescript
// Before: locale="zh-CN" - Type error
// After: Proper BytemdLocale interface
const zhCNLocale: Partial<BytemdLocale> = {
  write: '编写',
  preview: '预览',
  // ... complete Chinese localization
}
```

### 2. **Fixed Editor Configuration Type**
```typescript
// Before: foldGutter doesn't exist in EditorConfiguration
// After: Proper type casting and valid properties only
return baseConfig as Omit<EditorConfiguration, 'value' | 'placeholder'>
```

### 3. **Fixed Ref Initialization**
```typescript
// Before: useRef<NodeJS.Timeout>() - Expected 1 argument
// After: useRef<NodeJS.Timeout | null>(null)
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
```

### 4. **Removed Unused Variables**
```typescript
// Removed unused 'line' variable in Enter key handler
// Fixed 'any' type usage with proper CodeMirrorEditor type
```

## Usage Examples

### Basic Usage
```typescript
import ByteMDEditor from './components/ByteMDEditor'

function MyEditor() {
  const [content, setContent] = useState('')
  
  return (
    <ByteMDEditor
      value={content}
      onChange={setContent}
      height={800}
    />
  )
}
```

### Performance-Optimized Usage
```typescript
<ByteMDEditor
  value={largeContent}
  onChange={setLargeContent}
  height={1000}
  realTimeRendering={false} // Disable for huge documents
  performanceMode="high"    // Force high-performance mode
  maxLength={200000}        // Set reasonable limit
/>
```

### Auto-Performance Mode
```typescript
<ByteMDEditor
  value={content}
  onChange={setContent}
  performanceMode="auto" // Automatically switch based on content size
  realTimeRendering={true} // Will be disabled automatically for huge docs
/>
```

## Performance Benchmarks

| Document Size | Mode | Debounce | Viewport Margin | Real-time Rendering |
|--------------|------|----------|-----------------|-------------------|
| < 50KB | Standard | 300ms | Infinity | Enabled |
| 50KB - 90KB | Standard/Auto | 800ms | Infinity | Enabled |
| > 90KB | High/Auto | 1500ms | 10 | Optional |

## Development Features

### Performance Indicator (Development Mode)
In development mode, a performance indicator shows when large document optimizations are active:

- **Yellow Badge**: Large document mode (50KB-90KB)
- **Red Badge**: Huge document mode (>90KB)

### Debug Information
```typescript
const showPerformanceInfo = process.env.NODE_ENV === 'development'
```

## Migration Guide

### From Old ByteMDEditor
```typescript
// Old usage (still works)
<ByteMDEditor value={content} onChange={setContent} />

// New optimized usage
<ByteMDEditor
  value={content}
  onChange={setContent}
  realTimeRendering={true}     // New prop
  performanceMode="auto"       // New prop
  maxLength={150000}          // New prop
/>
```

### Props Changes
- ✅ All existing props remain unchanged
- ➕ `realTimeRendering?: boolean` - Control preview updates
- ➕ `performanceMode?: 'auto' | 'high' | 'standard'` - Performance mode
- ➕ `maxLength?: number` - Character limit

## Technical Implementation

### State Management
```typescript
// Performance monitoring
const [isLargeDocument, setIsLargeDocument] = useState(false)
const [isHugeDocument, setIsHugeDocument] = useState(false) 
const [actualPerformanceMode, setActualPerformanceMode] = useState<'standard' | 'high'>('standard')

// Debouncing and batching
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
const pendingValueRef = useRef<string>(value)
const lastUpdateTimeRef = useRef(Date.now())
```

### Effect Hooks
```typescript
// Dynamic performance detection
useEffect(() => {
  const documentSize = value.length
  const newIsLargeDocument = documentSize > PERFORMANCE_CONFIG.LARGE_DOCUMENT_THRESHOLD
  const newIsHugeDocument = documentSize > PERFORMANCE_CONFIG.HUGE_DOCUMENT_THRESHOLD
  
  setIsLargeDocument(newIsLargeDocument)
  setIsHugeDocument(newIsHugeDocument)
  
  if (performanceMode === 'auto') {
    setActualPerformanceMode(newIsHugeDocument ? 'high' : 'standard')
  }
}, [value.length, performanceMode])
```

## Conclusion

The optimized ByteMDEditor provides:

- ✅ **90KB+ document support** with smooth editing
- ✅ **Intelligent performance scaling** based on content size  
- ✅ **Zero breaking changes** - full backward compatibility
- ✅ **Complete TypeScript support** - all errors resolved
- ✅ **Modern React patterns** - hooks, memoization, proper cleanup
- ✅ **Configurable performance modes** - auto, high, standard
- ✅ **Real-time rendering control** - optional preview updates
- ✅ **Enhanced image upload** - batch processing optimization

The component automatically optimizes performance based on document size while maintaining all existing functionality including the foldable plugin, image uploads, and Chinese localization.