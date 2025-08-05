import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'edit' | 'live' | 'preview';
  hideToolbar?: boolean;
  className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始编写你的文章...',
  height = 400,
  preview = 'live',
  hideToolbar = false,
  className = '',
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'live' | 'preview'>(preview);

  // Handle value changes
  const handleChange = (val?: string) => {
    onChange(val || '');
  };

  // Custom toolbar commands
  const customCommands = [
    // Custom image upload button
    {
      name: 'image',
      keyCommand: 'image',
      buttonProps: { 'aria-label': 'Insert image' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 20 20">
          <path
            fill="currentColor"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          />
        </svg>
      ),
      execute: (_state: any, api: any) => {
        const imageUrl = prompt('请输入图片URL:');
        if (imageUrl) {
          const imageText = `![图片描述](${imageUrl})`;
          api.replaceSelection(imageText);
        }
      },
    },
    // Custom table insert
    {
      name: 'table',
      keyCommand: 'table',
      buttonProps: { 'aria-label': 'Insert table' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 20 20">
          <path
            fill="currentColor"
            d="M3 3h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm1 2v2h4V5H4zm6 0v2h4V5h-4zm4 4h-4v2h4V9zM4 9v2h4V9H4zm0 4v2h4v-2H4zm6 2h4v-2h-4v2z"
          />
        </svg>
      ),
      execute: (_state: any, api: any) => {
        const tableText = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据 | 数据 | 数据 |
| 数据 | 数据 | 数据 |
`;
        api.replaceSelection(tableText);
      },
    },
    // Custom code block
    {
      name: 'code-block',
      keyCommand: 'code-block',
      buttonProps: { 'aria-label': 'Insert code block' },
      icon: (
        <svg width="12" height="12" viewBox="0 0 20 20">
          <path
            fill="currentColor"
            d="M13.962 8.795l1.591-1.591L14.139 5.79 11.38 8.549l2.759 2.759 1.414-1.414-1.591-1.59zM6.38 8.549L3.62 5.79L2.207 7.204l1.59 1.59-1.59 1.592L3.62 11.8 6.38 9.04l-.001-.491zM8.5 16h3v-2h-3v2zm0-4h3v-2h-3v2zm0-4h3V6h-3v2z"
          />
        </svg>
      ),
      execute: (_state: any, api: any) => {
        const language = prompt('请输入代码语言 (如: javascript, python, go):') || '';
        const codeText = `\`\`\`${language}\n// 在这里编写代码\nconsole.log('Hello World');\n\`\`\``;
        api.replaceSelection(codeText);
      },
    },
  ];

  return (
    <div className={`markdown-editor ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">编辑模式:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-l-md transition-colors ${
                mode === 'edit'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`px-3 py-1 text-xs font-medium border-t border-b border-gray-300 dark:border-gray-600 transition-colors ${
                mode === 'live'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              实时预览
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-r-md transition-colors ${
                mode === 'preview'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              预览
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>字数: {value.length}</span>
          <span>•</span>
          <span>行数: {value.split('\n').length}</span>
        </div>
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <MDEditor
          value={value}
          onChange={handleChange}
          preview={mode}
          hideToolbar={hideToolbar}
          height={height}
          data-color-mode={undefined}
          previewOptions={{
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
              rehypeHighlight,
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: 'wrap' }]
            ],
          }}
          textareaProps={{
            placeholder,
            style: {
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: '"Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
            },
          }}
          extraCommands={customCommands}
        />
      </div>

      {/* Markdown 语法提示 */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Markdown 语法提示</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded"># 标题</span> - 一级标题
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">**粗体**</span> - 粗体文本
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">*斜体*</span> - 斜体文本
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">`代码`</span> - 行内代码
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">[链接](url)</span> - 超链接
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">![图片](url)</span> - 图片
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">- 列表</span> - 无序列表
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">1. 列表</span> - 有序列表
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">&gt; 引用</span> - 引用块
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}