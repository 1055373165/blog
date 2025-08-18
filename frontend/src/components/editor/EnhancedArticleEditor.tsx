import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { MediaUploader } from './MediaUploader';
import MarkdownRenderer from '../MarkdownRenderer';

interface EnhancedArticleEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
  onAutoSave?: (content: string) => Promise<void>;
  autoSaveInterval?: number; // in milliseconds
  className?: string;
}

export default function EnhancedArticleEditor({
  value,
  onChange,
  placeholder = '开始编写你的文章...',
  height = 500,
  onAutoSave,
  autoSaveInterval = 10000, // 10 seconds default
  className = '',
}: EnhancedArticleEditorProps) {
  const [mode, setMode] = useState<'rich' | 'markdown' | 'preview'>('rich');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(value);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'hljs',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 dark:text-primary-400 hover:underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-gray-200 dark:border-gray-700',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-800 font-semibold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-gray-600 px-4 py-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      Typography,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onChange(content);
      
      // Auto-save logic
      if (onAutoSave && content !== lastContentRef.current) {
        lastContentRef.current = content;
        
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout
        autoSaveTimeoutRef.current = setTimeout(() => {
          handleAutoSave(content);
        }, autoSaveInterval);
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none focus:outline-none p-4`,
        style: `min-height: ${height - 100}px;`,
      },
    },
  });

  // Auto-save handler
  const handleAutoSave = useCallback(async (content: string) => {
    if (!onAutoSave) return;
    
    try {
      setIsAutoSaving(true);
      await onAutoSave(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [onAutoSave]);

  // Convert HTML to Markdown (simplified)
  const convertHtmlToMarkdown = useCallback((html: string): string => {
    // This is a basic conversion - you might want to use a proper library like turndown
    let markdown = html
      .replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (_, level, text) => `${'#'.repeat(parseInt(level))} ${text}\n\n`)
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```')
      .replace(/<blockquote>(.*?)<\/blockquote>/gs, '> $1')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Clean up extra newlines
      .trim();
    
    return markdown;
  }, []);

  // Convert Markdown to HTML (basic)
  const convertMarkdownToHtml = useCallback((markdown: string): string => {
    // Basic markdown to HTML conversion
    let html = markdown
      .replace(/^(#{1,6})\s+(.*$)/gm, (_, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^>\s+(.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
    return html;
  }, []);

  // Mode switching
  const handleModeChange = useCallback((newMode: 'rich' | 'markdown' | 'preview') => {
    if (newMode === mode) return;

    if (mode === 'rich' && (newMode === 'markdown' || newMode === 'preview')) {
      const html = editor?.getHTML() || '';
      const markdown = convertHtmlToMarkdown(html);
      setMarkdownContent(markdown);
    } else if (mode === 'markdown' && newMode === 'rich') {
      const html = convertMarkdownToHtml(markdownContent);
      editor?.commands.setContent(html);
    }

    setMode(newMode);
  }, [mode, editor, convertHtmlToMarkdown, convertMarkdownToHtml, markdownContent]);

  // Handle markdown content change
  const handleMarkdownChange = useCallback((markdown: string) => {
    setMarkdownContent(markdown);
    const html = convertMarkdownToHtml(markdown);
    onChange(html);
  }, [convertMarkdownToHtml, onChange]);

  // Handle media upload
  const handleMediaUpload = useCallback((url: string, alt?: string) => {
    if (mode === 'rich' && editor) {
      editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
    } else if (mode === 'markdown') {
      const imageMarkdown = `![${alt || ''}](${url})`;
      setMarkdownContent(prev => prev + '\n\n' + imageMarkdown);
    }
    setShowMediaUploader(false);
  }, [mode, editor]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Statistics
  const wordCount = editor?.storage.characterCount.words() || 0;
  const charCount = editor?.storage.characterCount.characters() || 0;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className={`enhanced-article-editor ${className}`}>
      {/* Editor Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Mode Selector */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'rich', label: '富文本', icon: '🎨' },
              { key: 'markdown', label: 'Markdown', icon: '#' },
              { key: 'preview', label: '预览', icon: '👁' },
            ].map((modeOption) => (
              <button
                key={modeOption.key}
                onClick={() => handleModeChange(modeOption.key as any)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                  mode === modeOption.key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>{modeOption.icon}</span>
                <span>{modeOption.label}</span>
              </button>
            ))}
          </div>

          {/* Statistics */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <span>📊</span>
              <span>{wordCount.toLocaleString()} 词</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>📝</span>
              <span>{charCount.toLocaleString()} 字符</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>⏱</span>
              <span>{readingTime} 分钟阅读</span>
            </div>
            {isAutoSaving && (
              <div className="flex items-center space-x-1 text-blue-500">
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>自动保存中...</span>
              </div>
            )}
            {lastSaved && !isAutoSaving && (
              <div className="flex items-center space-x-1 text-green-500">
                <span>✓</span>
                <span>已保存 {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        {mode === 'rich' && editor && (
          <EditorToolbar 
            editor={editor} 
            onMediaUpload={() => setShowMediaUploader(true)}
          />
        )}
      </div>

      {/* Editor Content */}
      <div className="relative bg-white dark:bg-gray-800" style={{ minHeight: height }}>
        {mode === 'rich' && (
          <EditorContent 
            editor={editor} 
            className="prose-editor"
          />
        )}

        {mode === 'markdown' && (
          <textarea
            value={markdownContent}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full p-4 resize-none border-none focus:outline-none bg-transparent text-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            style={{ minHeight: height - 100 }}
          />
        )}

        {mode === 'preview' && (
          <div className="p-4 overflow-auto" style={{ minHeight: height - 100 }}>
            <MarkdownRenderer content={markdownContent || convertHtmlToMarkdown(value)} />
          </div>
        )}
      </div>

      {/* Media Uploader Modal */}
      {showMediaUploader && (
        <MediaUploader
          onUpload={handleMediaUpload}
          onClose={() => setShowMediaUploader(false)}
        />
      )}

      {/* Editor Styles */}
      <style>{`
        .prose-editor .ProseMirror {
          outline: none;
        }
        
        .prose-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .prose-editor .ProseMirror table {
          border-collapse: collapse;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        
        .prose-editor .ProseMirror table td,
        .prose-editor .ProseMirror table th {
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          min-width: 1em;
          padding: 6px 8px;
          position: relative;
          vertical-align: top;
        }
        
        .prose-editor .ProseMirror table th {
          background-color: #f9fafb;
          font-weight: bold;
          text-align: left;
        }
        
        .prose-editor .ProseMirror table .selectedCell:after {
          background: rgba(200, 200, 255, 0.4);
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        
        .prose-editor .ProseMirror table .column-resize-handle {
          background-color: #adf;
          bottom: -2px;
          position: absolute;
          right: -2px;
          pointer-events: none;
          top: 0;
          width: 4px;
        }
        
        .prose-editor .ProseMirror table p {
          margin: 0;
        }
        
        .prose-editor .ProseMirror .tableWrapper {
          padding: 1rem 0;
          overflow-x: auto;
        }
        
        .prose-editor .ProseMirror .resize-cursor {
          cursor: ew-resize;
          cursor: col-resize;
        }
      `}</style>
    </div>
  );
}