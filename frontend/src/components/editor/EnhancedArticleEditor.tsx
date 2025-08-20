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
  
  // Upload image to server (real implementation)
  const uploadImageToServer = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'article-image');

      // 调用后端图片上传API
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        headers: {
          // 添加认证头
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 检查后端返回的格式
      if (result.success && result.data && result.data.url) {
        return result.data.url;
      } else {
        throw new Error(result.message || 'Upload response missing URL');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      
      // 检查是否是认证错误
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('请先登录后再上传图片');
      }
      
      // 如果上传失败，生成一个本地可访问的临时方案
      // 在生产环境中，这应该显示错误并要求用户重试
      const tempUrl = URL.createObjectURL(file);
      
      // 存储到 localStorage 作为临时方案（仅用于演示）
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const base64 = e.target?.result as string;
        localStorage.setItem(`image_${tempUrl}`, base64);
      };
      fileReader.readAsDataURL(file);
      
      return tempUrl;
    }
  }, []);
  const [mode, setMode] = useState<'rich' | 'markdown' | 'preview'>('rich');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
      
      // Update markdown content for preview mode
      setMarkdownContent(convertHtmlToMarkdown(content));
      
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

  // Convert HTML to Markdown (improved)
  const convertHtmlToMarkdown = useCallback((html: string): string => {
    // This is a more comprehensive conversion
    let markdown = html
      // Headers
      .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/g, (_, level, text) => {
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        return `${'#'.repeat(parseInt(level))} ${cleanText}\n\n`;
      })
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```')
      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (_, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return `> ${cleanContent}\n\n`;
      })
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      // Images - improved regex to handle all variations
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/g, '![$2]($1)')
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/g, '![$1]($2)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/g, '![]($1)')
      // Lists
      .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (_, content) => {
        const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        return items.map(item => {
          const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1').replace(/<[^>]*>/g, '').trim();
          return `- ${text}`;
        }).join('\n') + '\n\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (_, content) => {
        const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        return items.map((item, index) => {
          const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1').replace(/<[^>]*>/g, '').trim();
          return `${index + 1}. ${text}`;
        }).join('\n') + '\n\n';
      })
      // Tables
      .replace(/<table[^>]*>(.*?)<\/table>/gs, (_, content) => {
        const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gs) || [];
        let tableMarkdown = '';
        rows.forEach((row, rowIndex) => {
          const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs) || [];
          const cellTexts = cells.map(cell => 
            cell.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/s, '$1').replace(/<[^>]*>/g, '').trim()
          );
          tableMarkdown += '| ' + cellTexts.join(' | ') + ' |\n';
          if (rowIndex === 0) {
            tableMarkdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
          }
        });
        return tableMarkdown + '\n';
      })
      // Line breaks
      .replace(/<br\s*\/?>/g, '\n')
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gs, (_, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return cleanContent ? `${cleanContent}\n\n` : '';
      })
      // Clean up remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Clean up extra whitespace and newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
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

  // Store cursor position for markdown textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

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

  // Handle clipboard paste
  const handleClipboardPaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if item is an image
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        try {
          // Show immediate feedback with temporary URL
          const tempUrl = URL.createObjectURL(file);
          const altText = `粘贴的图片 - ${new Date().toLocaleString()}`;
          
          // Insert the image into the editor immediately
          if (mode === 'rich' && editor) {
            editor.chain().focus().setImage({ 
              src: tempUrl, 
              alt: altText
            }).run();
          } else if (mode === 'markdown') {
            const imageMarkdown = `![${altText}](${tempUrl})`;
            setMarkdownContent(prev => prev + '\n\n' + imageMarkdown);
          }

          // Upload to server in background and replace URL
          uploadImageToServer(file).then((serverUrl) => {
            if (mode === 'rich' && editor) {
              // Find and replace the temporary URL in rich text editor
              const html = editor.getHTML();
              const updatedHtml = html.replace(tempUrl, serverUrl);
              editor.commands.setContent(updatedHtml);
            } else if (mode === 'markdown') {
              // Replace temporary URL in markdown
              setMarkdownContent(prev => prev.replace(tempUrl, serverUrl));
            }
            
            // Clean up temporary URL
            URL.revokeObjectURL(tempUrl);
          }).catch((error) => {
            console.error('Failed to upload image:', error);
            // Could show error message to user here
          });

          console.log('Image pasted:', file.name, file.size, file.type);
          
        } catch (error) {
          console.error('Error handling pasted image:', error);
        }
        
        break; // Only handle the first image
      }
    }
  }, [mode, editor]);

  // Handle file drop
  const handleFileDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check if it's an image
    if (file.type.startsWith('image/')) {
      try {
        const imageUrl = URL.createObjectURL(file);
        
        if (mode === 'rich' && editor) {
          editor.chain().focus().setImage({ 
            src: imageUrl, 
            alt: file.name || `拖拽的图片 - ${new Date().toLocaleString()}` 
          }).run();
        } else if (mode === 'markdown') {
          const imageMarkdown = `![${file.name || `拖拽的图片 - ${new Date().toLocaleString()}`}](${imageUrl})`;
          setMarkdownContent(prev => prev + '\n\n' + imageMarkdown);
        }

        console.log('Image dropped:', file.name, file.size, file.type);
      } catch (error) {
        console.error('Error handling dropped image:', error);
      }
    }
  }, [mode, editor]);

  // Handle drag enter
  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    const items = event.dataTransfer?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          setIsDragging(true);
          break;
        }
      }
    }
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    // Only hide if leaving the editor container
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  // Handle drag over to prevent default behavior
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
  }, []);

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
      // Update markdown content when value changes
      setMarkdownContent(convertHtmlToMarkdown(value));
    }
  }, [value, editor, convertHtmlToMarkdown]);

  // Initialize markdown content on first load
  useEffect(() => {
    if (value && !markdownContent) {
      setMarkdownContent(convertHtmlToMarkdown(value));
    }
  }, [value, markdownContent, convertHtmlToMarkdown]);

  // Restore cursor position after markdown content updates
  useEffect(() => {
    if (mode === 'markdown' && textareaRef.current && cursorPositionRef.current > 0) {
      const textarea = textareaRef.current;
      const position = Math.min(cursorPositionRef.current, textarea.value.length);
      
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        if (textarea === document.activeElement) {
          textarea.setSelectionRange(position, position);
        }
      });
    }
  }, [markdownContent, mode]);

  // Add event listeners for clipboard paste and drag & drop
  useEffect(() => {
    const editorElement = document.querySelector('.enhanced-article-editor');
    if (!editorElement) return;

    // Add clipboard paste listener
    editorElement.addEventListener('paste', handleClipboardPaste as EventListener);
    
    // Add drag and drop listeners
    editorElement.addEventListener('drop', handleFileDrop as EventListener);
    editorElement.addEventListener('dragover', handleDragOver as EventListener);
    editorElement.addEventListener('dragenter', handleDragEnter as EventListener);
    editorElement.addEventListener('dragleave', handleDragLeave as EventListener);

    return () => {
      editorElement.removeEventListener('paste', handleClipboardPaste as EventListener);
      editorElement.removeEventListener('drop', handleFileDrop as EventListener);
      editorElement.removeEventListener('dragover', handleDragOver as EventListener);
      editorElement.removeEventListener('dragenter', handleDragEnter as EventListener);
      editorElement.removeEventListener('dragleave', handleDragLeave as EventListener);
    };
  }, [handleClipboardPaste, handleFileDrop, handleDragOver, handleDragEnter, handleDragLeave]);

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
            <div className="flex items-center space-x-1 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-md">
              <span>📎</span>
              <span>支持 Ctrl+V 粘贴 / 拖拽图片</span>
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
      <div className={`relative bg-white dark:bg-gray-800 ${isDragging ? 'ring-2 ring-primary-500 ring-opacity-50 bg-primary-50 dark:bg-primary-900/20' : ''}`} style={{ minHeight: height }}>
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 border-2 border-dashed border-primary-500 z-10">
            <div className="text-center">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-lg font-medium text-primary-700 dark:text-primary-300">
                拖拽图片到这里
              </p>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                支持 JPG、PNG、GIF、WebP 格式
              </p>
            </div>
          </div>
        )}

        {mode === 'rich' && (
          <EditorContent 
            editor={editor} 
            className="prose-editor"
          />
        )}

        {mode === 'markdown' && (
          <textarea
            ref={textareaRef}
            value={markdownContent}
            onChange={(e) => {
              // Store cursor position before update
              cursorPositionRef.current = e.target.selectionStart;
              handleMarkdownChange(e.target.value);
            }}
            onKeyUp={(e) => {
              // Update cursor position on key events
              cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
            }}
            onMouseUp={(e) => {
              // Update cursor position on mouse events
              cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
            }}
            placeholder={placeholder}
            className="w-full h-full p-4 resize-none border-none focus:outline-none bg-transparent text-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            style={{ minHeight: height - 100 }}
            onPaste={(e) => {
              // Handle paste in markdown mode
              const clipboardData = e.clipboardData;
              if (!clipboardData) return;

              const items = clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                  e.preventDefault();
                  const file = item.getAsFile();
                  if (file) {
                    const imageUrl = URL.createObjectURL(file);
                    const imageMarkdown = `![粘贴的图片 - ${new Date().toLocaleString()}](${imageUrl})`;
                    const textarea = e.target as HTMLTextAreaElement;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = markdownContent;
                    const newValue = currentValue.substring(0, start) + '\n\n' + imageMarkdown + '\n\n' + currentValue.substring(end);
                    handleMarkdownChange(newValue);
                    
                    // Set cursor position after the inserted image
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + imageMarkdown.length + 4;
                        cursorPositionRef.current = start + imageMarkdown.length + 4;
                      }
                    }, 0);
                  }
                  break;
                }
              }
            }}
          />
        )}

        {mode === 'preview' && (
          <div className="p-4 overflow-auto" style={{ minHeight: height - 100 }}>
            <MarkdownRenderer content={
              markdownContent || convertHtmlToMarkdown(editor?.getHTML() || value)
            } />
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