import type { BytemdPlugin } from 'bytemd'

// 折叠块插件 - 支持 HTML details/summary 标签
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
            // 折叠块模板
            const foldableTemplate = `<details>
<summary>点击展开/折叠</summary>

在这里输入折叠的内容...

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
            // 默认展开的折叠块模板
            const openFoldableTemplate = `<details open>
<summary>默认展开 - 点击折叠</summary>

在这里输入默认展开的内容...

</details>`
            
            try {
              if (ctx.appendBlock) {
                ctx.appendBlock(openFoldableTemplate)
              } else if (ctx.editor && typeof ctx.editor.setValue === 'function') {
                const currentValue = ctx.editor.getValue() || ''
                const newValue = currentValue + (currentValue ? '\n\n' : '') + openFoldableTemplate
                ctx.editor.setValue(newValue)
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
