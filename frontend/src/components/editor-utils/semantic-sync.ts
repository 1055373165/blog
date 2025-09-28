/**
 * Semantic Block Synchronization System for ByteMD Editor
 * Solves the core sync problem by using content-based anchors instead of pixel scrolling
 */

export interface MarkdownBlock {
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'table' | 'hr' | 'image'
  level?: number // For headings (1-6)
  content: string
  startLine: number
  endLine: number
  id: string // Unique identifier for this block
  hash: string // Content hash for quick comparison
}

export interface SyncPosition {
  blockId: string
  offset: number // Character offset within the block
  percentage: number // 0-1, position within the block
}

export interface ScrollSync {
  mode: 'semantic' | 'line-based' | 'hybrid'
  accuracy: 'fast' | 'balanced' | 'precise'
}

/**
 * Parses markdown content into semantic blocks
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.split('\n')
  const blocks: MarkdownBlock[] = []
  let currentBlock: Partial<MarkdownBlock> | null = null
  let blockCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNumber = i + 1

    // Handle empty lines - close current block if exists
    if (!line) {
      if (currentBlock && currentBlock.content) {
        finishBlock(currentBlock, i - 1, blocks, blockCounter++)
        currentBlock = null
      }
      continue
    }

    // Detect block type
    const blockType = detectBlockType(line, lines, i)

    // If this is a new block type, finish the previous block
    if (currentBlock &&
        (blockType.type !== currentBlock.type ||
         (blockType.type === 'heading' && blockType.level !== currentBlock.level))) {
      finishBlock(currentBlock, i - 1, blocks, blockCounter++)
      currentBlock = null
    }

    // Start new block or continue current block
    if (!currentBlock) {
      currentBlock = {
        type: blockType.type,
        level: blockType.level,
        content: line,
        startLine: lineNumber
      }
    } else {
      currentBlock.content += '\n' + line
    }
  }

  // Finish the last block
  if (currentBlock && currentBlock.content) {
    finishBlock(currentBlock, lines.length, blocks, blockCounter)
  }

  return blocks
}

function detectBlockType(line: string, lines: string[], index: number): { type: MarkdownBlock['type'], level?: number } {
  // Heading detection
  const headingMatch = line.match(/^(#{1,6})\s+/)
  if (headingMatch) {
    return { type: 'heading', level: headingMatch[1].length }
  }

  // Code block detection
  if (line.startsWith('```') || line.startsWith('~~~')) {
    return { type: 'code' }
  }

  // List detection
  if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(line)) {
    return { type: 'list' }
  }

  // Blockquote detection
  if (line.startsWith('>')) {
    return { type: 'blockquote' }
  }

  // Table detection (look for pipe characters)
  if (line.includes('|') && (index === 0 || lines[index + 1]?.includes('|'))) {
    return { type: 'table' }
  }

  // Horizontal rule
  if (/^(\*{3,}|-{3,}|_{3,})$/.test(line)) {
    return { type: 'hr' }
  }

  // Image detection
  if (/^!\[.*\]\(.*\)/.test(line)) {
    return { type: 'image' }
  }

  // Default to paragraph
  return { type: 'paragraph' }
}

function finishBlock(block: Partial<MarkdownBlock>, endLine: number, blocks: MarkdownBlock[], counter: number) {
  if (!block.content || !block.type) return

  const fullBlock: MarkdownBlock = {
    type: block.type,
    level: block.level,
    content: block.content,
    startLine: block.startLine || 1,
    endLine: endLine,
    id: `block-${counter}-${block.type}${block.level || ''}`,
    hash: generateHash(block.content)
  }

  blocks.push(fullBlock)
}

function generateHash(content: string): string {
  // Simple hash function for content comparison
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Finds the current semantic position based on cursor position
 */
export function findSemanticPosition(blocks: MarkdownBlock[], line: number, column: number): SyncPosition | null {
  const targetLine = line + 1 // Convert to 1-based line numbers

  for (const block of blocks) {
    if (targetLine >= block.startLine && targetLine <= block.endLine) {
      const blockContent = block.content
      const blockLines = blockContent.split('\n')
      const lineInBlock = targetLine - block.startLine

      if (lineInBlock < blockLines.length) {
        const charactersBeforeLine = blockLines.slice(0, lineInBlock).join('\n').length
        const offset = charactersBeforeLine + (lineInBlock > 0 ? 1 : 0) + column // +1 for newline
        const percentage = Math.min(1, offset / blockContent.length)

        return {
          blockId: block.id,
          offset: offset,
          percentage: percentage
        }
      }
    }
  }

  return null
}

/**
 * Maps semantic position to preview DOM element
 */
export function findPreviewElement(blocks: MarkdownBlock[], position: SyncPosition, previewContainer: HTMLElement): Element | null {
  const block = blocks.find(b => b.id === position.blockId)
  if (!block) return null

  // Create a selector based on block type and content
  const selector = createBlockSelector(block)
  const elements = previewContainer.querySelectorAll(selector)

  // Find the matching element by content similarity
  for (const element of Array.from(elements)) {
    if (isMatchingElement(element, block)) {
      return element
    }
  }

  // Fallback: find by heading level or similar content
  return findElementByFallback(previewContainer, block)
}

function createBlockSelector(block: MarkdownBlock): string {
  switch (block.type) {
    case 'heading':
      return `h${block.level || 1}`
    case 'paragraph':
      return 'p'
    case 'code':
      return 'pre, .code-block'
    case 'list':
      return 'ul, ol'
    case 'blockquote':
      return 'blockquote'
    case 'table':
      return 'table'
    case 'hr':
      return 'hr'
    case 'image':
      return 'img'
    default:
      return 'p'
  }
}

function isMatchingElement(element: Element, block: MarkdownBlock): boolean {
  const elementText = element.textContent?.trim() || ''
  const blockText = block.content.replace(/^#{1,6}\s+/, '').trim() // Remove heading markers

  // Check if the content matches (allowing for some variation)
  if (elementText.includes(blockText.substring(0, 50))) {
    return true
  }

  // For code blocks, check if the content is similar
  if (block.type === 'code' && element.tagName === 'PRE') {
    const codeContent = block.content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    return elementText.includes(codeContent.substring(0, 50))
  }

  return false
}

function findElementByFallback(container: HTMLElement, block: MarkdownBlock): Element | null {
  const selector = createBlockSelector(block)
  const elements = container.querySelectorAll(selector)

  if (elements.length > 0) {
    // Return the first matching element as fallback
    return elements[0]
  }

  return null
}

/**
 * Smooth scroll to element with offset calculation
 */
export function scrollToElement(element: Element, position: SyncPosition, container: HTMLElement, options: { smooth?: boolean, offset?: number } = {}) {
  const { smooth = true, offset = 0 } = options

  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  // Calculate scroll position
  const elementTop = elementRect.top - containerRect.top + container.scrollTop
  const targetPosition = elementTop - offset

  // Add offset based on position percentage within the block
  const additionalOffset = elementRect.height * position.percentage
  const finalPosition = targetPosition + additionalOffset

  container.scrollTo({
    top: Math.max(0, finalPosition),
    behavior: smooth ? 'smooth' : 'instant'
  })
}

/**
 * Semantic synchronization manager
 */
export class SemanticSyncManager {
  private blocks: MarkdownBlock[] = []
  private lastContent = ''
  private syncMode: ScrollSync['mode'] = 'semantic'
  private isUpdating = false

  private editorContainer: HTMLElement
  private previewContainer: HTMLElement
  private options: ScrollSync

  constructor(
    editorContainer: HTMLElement,
    previewContainer: HTMLElement,
    options: ScrollSync = { mode: 'semantic', accuracy: 'balanced' }
  ) {
    this.editorContainer = editorContainer
    this.previewContainer = previewContainer
    this.options = options
    this.syncMode = options.mode
  }

  updateContent(content: string) {
    if (content === this.lastContent) return

    this.lastContent = content
    this.blocks = parseMarkdownBlocks(content)
  }

  syncEditorToPreview(line: number, column: number) {
    if (this.isUpdating || this.syncMode === 'line-based') return

    this.isUpdating = true

    try {
      const position = findSemanticPosition(this.blocks, line, column)
      if (position) {
        const previewElement = findPreviewElement(this.blocks, position, this.previewContainer)
        if (previewElement) {
          scrollToElement(previewElement, position, this.previewContainer, {
            smooth: true,
            offset: 50 // Account for toolbar/header
          })
        }
      }
    } finally {
      // Allow next sync after a short delay
      setTimeout(() => {
        this.isUpdating = false
      }, 100)
    }
  }

  syncPreviewToEditor(scrollTop: number) {
    if (this.isUpdating || this.syncMode === 'line-based') return

    // Find which preview element is currently visible
    const visibleElement = this.findVisibleElement(scrollTop)
    if (!visibleElement) return

    // Find corresponding block
    const block = this.findBlockForElement(visibleElement)
    if (!block) return

    // Scroll editor to corresponding line
    this.scrollEditorToLine(block.startLine)
  }

  private findVisibleElement(scrollTop: number): Element | null {
    const containerHeight = this.previewContainer.clientHeight
    const centerY = scrollTop + containerHeight / 2

    const elements = this.previewContainer.querySelectorAll('h1,h2,h3,h4,h5,h6,p,pre,ul,ol,blockquote,table,hr,img')

    for (const element of Array.from(elements)) {
      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + scrollTop - this.previewContainer.getBoundingClientRect().top
      const elementBottom = elementTop + rect.height

      if (elementTop <= centerY && elementBottom >= centerY) {
        return element
      }
    }

    return null
  }

  private findBlockForElement(element: Element): MarkdownBlock | null {
    for (const block of this.blocks) {
      if (isMatchingElement(element, block)) {
        return block
      }
    }
    return null
  }

  private scrollEditorToLine(line: number) {
    // This would need to be implemented with CodeMirror API
    // For now, this is a placeholder
    console.log('Scroll editor to line:', line)
  }

  setSyncMode(mode: ScrollSync['mode']) {
    this.syncMode = mode
  }

  getBlocks(): MarkdownBlock[] {
    return this.blocks
  }
}