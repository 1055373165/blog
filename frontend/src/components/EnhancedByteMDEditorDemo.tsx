import React, { useState } from 'react'
import EnhancedByteMDEditor from './EnhancedByteMDEditor'

const sampleMarkdown = `# ByteMD Editor UX 增强版演示

这是一个增强版的 ByteMD 编辑器，解决了原版编辑器的核心同步问题并添加了多项 UX 改进。

## 核心功能

### 1. 语义块同步系统 ✨
- **智能同步**: 基于内容语义而非像素位置进行同步
- **自适应匹配**: 自动处理不同高度的内容块
- **双向同步**: 编辑器和预览区域双向智能同步

### 2. 浮动目录 (TOC) 📚
- **实时生成**: 根据标题自动生成层次化目录
- **一键导航**: 点击目录项快速跳转到对应位置
- **进度显示**: 实时显示阅读进度
- **展开折叠**: 支持目录项的展开和折叠

#### 二级标题示例
这是一个二级标题的内容示例。

##### 三级标题示例
这是一个三级标题的内容示例。

### 3. 智能上下文工具栏 🛠️
- **上下文感知**: 根据当前编辑位置显示相关工具
- **快捷操作**: 常用格式化功能一键可达
- **响应式设计**: 移动端自动适配
- **智能建议**: 基于当前内容提供编写建议

### 4. 响应式布局系统 📱
- **多种模式**: 分屏、纯编辑、纯预览、标签页模式
- **设备自适应**: 自动根据设备类型选择最佳布局
- **手势支持**: 移动端支持滑动切换
- **布局记忆**: 记住用户的布局偏好

## 代码示例

\`\`\`typescript
// 使用增强版编辑器
import EnhancedByteMDEditor from './components/EnhancedByteMDEditor'

function MyEditor() {
  const [content, setContent] = useState('')

  return (
    <EnhancedByteMDEditor
      value={content}
      onChange={setContent}
      height={800}

      // 启用所有增强功能
      enableSemanticSync={true}
      enableTOC={true}
      enableContextToolbar={true}
      enableResponsiveLayout={true}
      enableGestures={true}
      autoLayout={true}

      // 性能优化
      performanceMode="auto"
      realTimeRendering={true}
    />
  )
}
\`\`\`

## 表格支持

| 功能 | 原版 | 增强版 | 改进说明 |
|------|------|--------|----------|
| 滚动同步 | ❌ | ✅ | 语义块智能同步 |
| 目录导航 | ❌ | ✅ | 浮动TOC组件 |
| 上下文工具栏 | ❌ | ✅ | 智能工具栏 |
| 移动端适配 | ⚠️ | ✅ | 完全响应式 |
| 手势操作 | ❌ | ✅ | 滑动切换 |

## 列表功能

### 有序列表
1. 第一项功能：语义块同步
2. 第二项功能：浮动目录
3. 第三项功能：上下文工具栏
4. 第四项功能：响应式布局

### 无序列表
- ✨ 解决了原版同步问题
- 📱 完美适配移动设备
- 🚀 提升编辑效率
- 🎯 提供精准导航
- 💡 智能功能建议

## 引用示例

> **重要提示**: 这个增强版编辑器完全向后兼容，可以直接替换原版 ByteMDEditor 组件而无需修改现有代码。
>
> 所有新功能都是可选的，可以通过 props 进行控制。

## 性能优化

增强版编辑器在保持所有新功能的同时，保留了原版的性能优化：

- **智能防抖**: 根据文档大小自动调整防抖时间
- **60fps 限流**: 确保流畅的编辑体验
- **插件缓存**: 避免重复创建插件实例
- **大文档优化**: 自动检测并优化大文档性能

## 图片和文件支持

![示例图片](https://via.placeholder.com/600x300/4F46E5/FFFFFF?text=Enhanced+ByteMD+Editor)

支持拖拽上传各种文件格式：
- 📷 图片文件 (JPG, PNG, GIF, WebP)
- 📄 PDF 文档
- 📝 文档文件 (DOC, DOCX)
- 📊 表格文件 (XLS, XLSX)

---

## 总结

这个增强版 ByteMD 编辑器通过以下几个核心改进，彻底解决了原版编辑器的同步问题并大幅提升了用户体验：

1. **语义同步**：解决了编辑器与预览区域无法对应的根本问题
2. **智能导航**：通过浮动TOC提供快速导航能力
3. **上下文工具栏**：提供智能的编辑辅助功能
4. **响应式布局**：完美适配各种设备和使用场景

### 快速开始

\`\`\`bash
# 安装依赖（已包含在项目中）
npm install @bytemd/react @bytemd/plugin-gfm @bytemd/plugin-highlight

# 导入并使用
import EnhancedByteMDEditor from './components/EnhancedByteMDEditor'
\`\`\`

立即体验这些强大的新功能吧！ 🎉`

export default function EnhancedByteMDEditorDemo() {
  const [content, setContent] = useState(sampleMarkdown)
  const [showFeatures, setShowFeatures] = useState({
    semanticSync: true,
    toc: true,
    contextToolbar: true,
    responsiveLayout: true,
    gestures: true,
    autoLayout: true
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced ByteMD Editor 演示
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            体验增强版 ByteMD 编辑器的所有新功能，解决原版同步问题并提供卓越的用户体验。
          </p>

          {/* Feature toggles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">功能配置</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.semanticSync}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, semanticSync: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">语义块同步</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.toc}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, toc: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">浮动目录</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.contextToolbar}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, contextToolbar: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">上下文工具栏</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.responsiveLayout}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, responsiveLayout: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">响应式布局</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.gestures}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, gestures: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">手势支持</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures.autoLayout}
                  onChange={(e) => setShowFeatures(prev => ({ ...prev, autoLayout: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">自动布局</span>
              </label>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <EnhancedByteMDEditor
            value={content}
            onChange={setContent}
            height={800}
            placeholder="开始体验增强版 ByteMD 编辑器..."

            // Feature flags
            enableSemanticSync={showFeatures.semanticSync}
            enableTOC={showFeatures.toc}
            enableContextToolbar={showFeatures.contextToolbar}
            enableResponsiveLayout={showFeatures.responsiveLayout}
            enableGestures={showFeatures.gestures}
            autoLayout={showFeatures.autoLayout}

            // Performance settings
            performanceMode="auto"
            realTimeRendering={true}
            maxLength={200000}
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>语义同步</strong>: 在左侧编辑器中移动光标，注意右侧预览区域会智能同步到对应位置</li>
            <li>• <strong>浮动目录</strong>: 点击右上角的目录按钮，或者在工具栏中切换TOC显示</li>
            <li>• <strong>上下文工具栏</strong>: 观察工具栏如何根据当前编辑位置提供相关功能</li>
            <li>• <strong>响应式布局</strong>: 缩放浏览器窗口或在移动设备上查看自适应效果</li>
            <li>• <strong>手势操作</strong>: 在移动设备上左右滑动以切换编辑/预览模式</li>
            <li>• <strong>拖拽上传</strong>: 直接拖拽图片或文件到编辑器中进行上传</li>
          </ul>
        </div>
      </div>
    </div>
  )
}