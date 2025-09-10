import type { BytemdPlugin } from 'bytemd'
import type { Root, Element, Text } from 'hast'
import type { Node } from 'unist'
import { visit } from 'unist-util-visit'

// Helper function to check if a node is an Element
function isElement(node: Node): node is Element {
  return node.type === 'element'
}

// Helper function to check if a node is Text
function isText(node: Node): node is Text {
  return node.type === 'text'
}

// Remark plugin to handle details/summary markdown processing
function remarkFoldablePlugin() {
  return (tree: any) => {
    // This plugin doesn't need to modify the AST at the remark level
    // since we're handling HTML tags that remark already parses
    return tree
  }
}

// Rehype plugin to process content inside details elements
function rehypeFoldablePlugin() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'details') {
        // Find summary and content elements
        const summaryIndex = node.children.findIndex((child: any) => 
          isElement(child) && child.tagName === 'summary'
        )
        
        if (summaryIndex !== -1) {
          // Process all children after summary
          const contentChildren = node.children.slice(summaryIndex + 1)
          
          // Filter out empty text nodes and process markdown-like content
          const processedChildren = contentChildren
            .map((child: any) => {
              if (isText(child)) {
                const text = child.value.trim()
                if (text === '') return null
                
                // Process markdown-like patterns in text content
                return processMarkdownText(text)
              }
              return child
            })
            .filter(Boolean)
            .flat()
          
          // Replace children after summary with processed content
          node.children = [
            ...node.children.slice(0, summaryIndex + 1),
            ...processedChildren
          ]
        }
        
        // Add CSS classes for styling
        if (!node.properties) {
          node.properties = {}
        }
        node.properties.className = ['foldable-block']
      }
    })
  }
}

// Function to process markdown-like text content
function processMarkdownText(text: string): Element[] {
  const result: Element[] = []
  const lines = text.split('\n')
  let currentParagraph: Element | null = null
  let inList = false
  let currentList: Element | null = null
  let listType: 'ul' | 'ol' | null = null
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (trimmedLine === '') {
      // End current paragraph or list
      if (currentParagraph) {
        result.push(currentParagraph)
        currentParagraph = null
      }
      if (currentList && inList) {
        result.push(currentList)
        currentList = null
        inList = false
        listType = null
      }
      continue
    }
    
    // Check for ordered list
    const olMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (currentList && inList) {
          result.push(currentList)
        }
        currentList = {
          type: 'element',
          tagName: 'ol',
          properties: {},
          children: []
        }
        inList = true
        listType = 'ol'
      }
      
      const listItem: Element = {
        type: 'element',
        tagName: 'li',
        properties: {},
        children: processInlineMarkdown(olMatch[2])
      }
      currentList!.children.push(listItem)
      continue
    }
    
    // Check for unordered list
    const ulMatch = trimmedLine.match(/^[-*+]\s+(.*)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (currentList && inList) {
          result.push(currentList)
        }
        currentList = {
          type: 'element',
          tagName: 'ul',
          properties: {},
          children: []
        }
        inList = true
        listType = 'ul'
      }
      
      const listItem: Element = {
        type: 'element',
        tagName: 'li',
        properties: {},
        children: processInlineMarkdown(ulMatch[1])
      }
      currentList!.children.push(listItem)
      continue
    }
    
    // Check for headings
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      if (currentParagraph) {
        result.push(currentParagraph)
        currentParagraph = null
      }
      if (currentList && inList) {
        result.push(currentList)
        currentList = null
        inList = false
        listType = null
      }
      
      const level = headingMatch[1].length
      const heading: Element = {
        type: 'element',
        tagName: `h${level}`,
        properties: {},
        children: processInlineMarkdown(headingMatch[2])
      }
      result.push(heading)
      continue
    }
    
    // Check for code blocks
    if (trimmedLine.startsWith('```')) {
      if (currentParagraph) {
        result.push(currentParagraph)
        currentParagraph = null
      }
      if (currentList && inList) {
        result.push(currentList)
        currentList = null
        inList = false
        listType = null
      }
      
      // Find the end of code block
      const language = trimmedLine.slice(3)
      let codeContent = ''
      let i = lines.indexOf(line) + 1
      
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n'
        i++
      }
      
      const pre: Element = {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [{
          type: 'element',
          tagName: 'code',
          properties: language ? { className: [`language-${language}`] } : {},
          children: [{ type: 'text', value: codeContent.slice(0, -1) }]
        }]
      }
      result.push(pre)
      continue
    }
    
    // Check for blockquote
    if (trimmedLine.startsWith('> ')) {
      if (currentParagraph) {
        result.push(currentParagraph)
        currentParagraph = null
      }
      if (currentList && inList) {
        result.push(currentList)
        currentList = null
        inList = false
        listType = null
      }
      
      const blockquote: Element = {
        type: 'element',
        tagName: 'blockquote',
        properties: {},
        children: [{
          type: 'element',
          tagName: 'p',
          properties: {},
          children: processInlineMarkdown(trimmedLine.slice(2))
        }]
      }
      result.push(blockquote)
      continue
    }
    
    // Regular paragraph content
    if (currentList && inList) {
      result.push(currentList)
      currentList = null
      inList = false
      listType = null
    }
    
    if (!currentParagraph) {
      currentParagraph = {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: []
      }
    }
    
    if (currentParagraph.children.length > 0) {
      currentParagraph.children.push({ type: 'text', value: ' ' })
    }
    
    currentParagraph.children.push(...processInlineMarkdown(trimmedLine))
  }
  
  // Add remaining elements
  if (currentParagraph) {
    result.push(currentParagraph)
  }
  if (currentList && inList) {
    result.push(currentList)
  }
  
  return result
}

// Function to process inline markdown (bold, italic, code)
function processInlineMarkdown(text: string): (Element | Text)[] {
  const result: (Element | Text)[] = []
  let remaining = text
  
  while (remaining.length > 0) {
    // Bold pattern **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)$/)
    if (boldMatch && boldMatch[2]) {
      if (boldMatch[1]) {
        result.push({ type: 'text', value: boldMatch[1] })
      }
      result.push({
        type: 'element',
        tagName: 'strong',
        properties: {},
        children: [{ type: 'text', value: boldMatch[2] }]
      })
      remaining = boldMatch[3]
      continue
    }
    
    // Italic pattern *text*
    const italicMatch = remaining.match(/^(.*?)\*(.*?)\*(.*)$/)
    if (italicMatch && italicMatch[2] && !italicMatch[1].endsWith('*')) {
      if (italicMatch[1]) {
        result.push({ type: 'text', value: italicMatch[1] })
      }
      result.push({
        type: 'element',
        tagName: 'em',
        properties: {},
        children: [{ type: 'text', value: italicMatch[2] }]
      })
      remaining = italicMatch[3]
      continue
    }
    
    // Code pattern `text`
    const codeMatch = remaining.match(/^(.*?)`(.*?)`(.*)$/)
    if (codeMatch && codeMatch[2]) {
      if (codeMatch[1]) {
        result.push({ type: 'text', value: codeMatch[1] })
      }
      result.push({
        type: 'element',
        tagName: 'code',
        properties: {},
        children: [{ type: 'text', value: codeMatch[2] }]
      })
      remaining = codeMatch[3]
      continue
    }
    
    // No more patterns found, add remaining text
    result.push({ type: 'text', value: remaining })
    break
  }
  
  return result
}

// 折叠块插件 - 支持 HTML details/summary 标签，内容支持 Markdown 渲染
export function foldablePlugin(): BytemdPlugin {
  return {
    // Remark plugin for processing markdown
    remark: remarkFoldablePlugin,
    
    // Rehype plugin for processing HTML
    rehype: rehypeFoldablePlugin,
    
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
