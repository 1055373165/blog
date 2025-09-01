import React from 'react'
import { Editor } from '@bytemd/react'
import gfm from '@bytemd/plugin-gfm'
import highlight from '@bytemd/plugin-highlight'
import frontmatter from '@bytemd/plugin-frontmatter'

import 'bytemd/dist/index.css'
import 'highlight.js/styles/vs.css'

interface ByteMDEditorProps {
  value: string
  onChange: (value: string) => void
  height?: number
  placeholder?: string
}

const plugins = [
  gfm(),
  highlight(),
  frontmatter(),
]

export default function ByteMDEditor({ 
  value, 
  onChange, 
  height = 500, 
  placeholder = "开始编写你的文章..." 
}: ByteMDEditorProps) {
  return (
    <div 
      className="bytemd-editor-wrapper"
      style={{
        '--editor-height': `${height}px`,
        height: `${height}px`
      } as React.CSSProperties & Record<string, string>}
    >
      <Editor
        value={value}
        plugins={plugins}
        onChange={onChange}
        placeholder={placeholder}
        mode="split"
        previewDebounce={500}
        uploadImages={async (files) => {
          // TODO: Implement image upload functionality
          console.log('Image upload not implemented yet:', files)
          return []
        }}
        sanitize={(html) => html}
      />
    </div>
  )
}