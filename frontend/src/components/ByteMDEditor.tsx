import React from 'react'
import { Editor } from '@bytemd/react'
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
}

const plugins = [
  gfm(),
  highlight(),
  frontmatter(),
  foldablePlugin(),
]

export default function ByteMDEditor({ 
  value, 
  onChange, 
  height = 1400, 
  placeholder = "开始编写你的文章..." 
}: ByteMDEditorProps) {
  return (
    <div 
      className="bytemd-editor-wrapper"
      style={{
        '--editor-height': `${height}px`,
        height: `${height}px`,
        minHeight: `${height}px`
      } as React.CSSProperties & Record<string, string>}
    >
      <Editor
        value={value}
        plugins={plugins}
        onChange={onChange}
        placeholder={placeholder}
        mode="split"
        previewDebounce={500}
        locale="zh-CN"
        editorConfig={{
          mode: 'gfm'
        }}
        uploadImages={async (files) => {
          try {
            const uploadPromises = files.map(async (file) => {
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

            const results = await Promise.all(uploadPromises)
            return results.filter(Boolean) as Array<{ url: string; alt?: string; title?: string }>
          } catch (error) {
            console.error('Batch image upload error:', error)
            return []
          }
        }}
        sanitize={(html) => html}
      />
    </div>
  )
}