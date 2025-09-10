import type { BytemdPlugin } from 'bytemd'

// 简化的折叠块插件 - 只提供工具栏功能，让 ReactMarkdown 自然处理内容

// 折叠块插件 - 支持 HTML details/summary 标签，内容支持 Markdown 渲染
export function foldablePlugin(): BytemdPlugin {
  return {
    // 工具栏配置
    actions: [
      {
        title: '插入折叠块',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>`,
        handler: {
          type: 'action',
          click: (ctx: any) => {
            // 折叠块模板 - 改进版，减少自动缩进问题
            const foldableTemplate = `<details>
<summary>点击展开/折叠</summary>

在这里输入折叠的内容...

可以使用markdown语法:
1. 有序列表项1
2. 有序列表项2
3. 有序列表项3

- 无序列表项
- 另一个列表项

**粗体文本** 和 *斜体文本*

\`代码示例\`

</details>`
            
            try {
              // 尝试使用 ByteMD 的内置方法插入内容
              if (ctx.appendBlock) {
                ctx.appendBlock(foldableTemplate)
              } else if (ctx.editor && typeof ctx.editor.setValue === 'function') {
                // 备用方案：直接在编辑器末尾添加
                const currentValue = ctx.editor.getValue() || ''
                const newValue = currentValue + (currentValue ? '\n\n' : '') + foldableTemplate
                ctx.editor.setValue(newValue)
              } else if (ctx.codemirror) {
                // 尝试使用 CodeMirror API 插入
                const doc = ctx.codemirror.getDoc()
                doc.replaceSelection(foldableTemplate)
              } else {
                // 最后的备用方案：使用 replaceSelection 或类似方法
                console.log('ByteMD context:', ctx)
                // 可以在这里添加更多的插入逻辑
              }
            } catch (error) {
              console.error('插入折叠块时出错:', error)
            }
          }
        }
      },
      {
        title: '插入默认展开的折叠块',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18,15 12,9 6,15"></polyline>
        </svg>`,
        handler: {
          type: 'action',
          click: (ctx: any) => {
            // 默认展开的折叠块模板 - 改进版
            const openFoldableTemplate = `<details open>
<summary>默认展开 - 点击折叠</summary>

在这里输入默认展开的内容...

可以使用markdown语法:
1. 第一项
2. 第二项
3. 第三项

- 列表项A
- 列表项B

**重要内容** 和 *强调内容*

\`代码示例\`

\`\`\`javascript
function example() {
  console.log('Hello World');
}
\`\`\`

</details>`
            
            try {
              if (ctx.appendBlock) {
                ctx.appendBlock(openFoldableTemplate)
              } else if (ctx.editor && typeof ctx.editor.setValue === 'function') {
                const currentValue = ctx.editor.getValue() || ''
                const newValue = currentValue + (currentValue ? '\n\n' : '') + openFoldableTemplate
                ctx.editor.setValue(newValue)
              } else if (ctx.codemirror) {
                // 尝试使用 CodeMirror API 插入
                const doc = ctx.codemirror.getDoc()
                doc.replaceSelection(openFoldableTemplate)
              }
            } catch (error) {
              console.error('插入展开折叠块时出错:', error)
            }
          }
        }
      }
    ]
  }
}

// 导出默认插件实例
export default foldablePlugin
