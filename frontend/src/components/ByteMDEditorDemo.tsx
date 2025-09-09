import React, { useState } from 'react'
import ByteMDEditor from './ByteMDEditor'

// Demo component to test the optimized ByteMDEditor
export default function ByteMDEditorDemo() {
  const [content, setContent] = useState(`# 性能测试文档

这是一个用于测试 ByteMDEditor 性能优化的示例文档。

## 基本功能测试

### 文本编辑
这里可以编写普通的 Markdown 文本。

### 代码块
\`\`\`typescript
function optimizedEditor() {
  console.log('Performance optimized!');
}
\`\`\`

### 列表
- 项目 1
- 项目 2  
- 项目 3

### 链接和图片
[链接示例](https://example.com)

## 性能特性

### 大文档优化
- 自动检测文档大小
- 智能防抖处理
- 批量更新优化
- 实时渲染控制

### 折叠功能

<details>
<summary>点击展开详细信息</summary>

这里是折叠的内容，可以包含：

1. 有序列表项
2. 另一个列表项

**粗体文本** 和 *斜体文本*

\`代码示例\`

</details>

## 性能模式

编辑器支持多种性能模式：
- **auto**: 自动检测文档大小并切换性能模式
- **high**: 强制高性能模式，适合大文档
- **standard**: 标准模式，平衡功能和性能
`)

  const [realTimeRendering, setRealTimeRendering] = useState(true)
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'standard'>('auto')

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ByteMD 编辑器性能优化测试</h1>
      
      {/* 控制面板 */}
      <div className="mb-4 p-4 bg-gray-100 rounded-lg">
        <h2 className="font-semibold mb-2">编辑器设置</h2>
        
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={realTimeRendering}
              onChange={(e) => setRealTimeRendering(e.target.checked)}
              className="mr-2"
            />
            实时渲染
          </label>
          
          <label className="flex items-center">
            性能模式:
            <select
              value={performanceMode}
              onChange={(e) => setPerformanceMode(e.target.value as 'auto' | 'high' | 'standard')}
              className="ml-2 px-2 py-1 border rounded"
            >
              <option value="auto">自动</option>
              <option value="high">高性能</option>
              <option value="standard">标准</option>
            </select>
          </label>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          <p>文档长度: {content.length} 字符</p>
          <p>
            文档类型: {
              content.length > 90000 ? '巨大文档 (>90KB)' :
              content.length > 50000 ? '大文档 (>50KB)' :
              '普通文档'
            }
          </p>
        </div>
      </div>

      {/* 编辑器 */}
      <ByteMDEditor
        value={content}
        onChange={setContent}
        height={800}
        realTimeRendering={realTimeRendering}
        performanceMode={performanceMode}
        maxLength={200000}
      />
      
      {/* 性能信息 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">性能优化特性</h3>
        <ul className="text-sm space-y-1">
          <li>✅ 智能防抖 - 根据文档大小调整防抖时间</li>
          <li>✅ 批量更新 - 60fps 节流优化</li>
          <li>✅ 插件缓存 - 避免重复创建插件实例</li>
          <li>✅ 配置缓存 - useMemo 优化配置对象</li>
          <li>✅ 大文档检测 - 自动切换性能模式</li>
          <li>✅ 实时渲染控制 - 可选禁用预览更新</li>
          <li>✅ 图片批量上传 - 优化上传性能</li>
          <li>✅ TypeScript 完整支持 - 修复所有类型错误</li>
        </ul>
      </div>
    </div>
  )
}