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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">编辑模式:</span>
          <div className="flex rounded-lg shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`px-4 py-2 text-sm font-medium border transition-all duration-200 ${
                mode === 'edit'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
            <button
              type="button"
              onClick={() => setMode('live')}
              className={`px-4 py-2 text-sm font-medium border-t border-b transition-all duration-200 ${
                mode === 'live'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              实时预览
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`px-4 py-2 text-sm font-medium border rounded-r-lg transition-all duration-200 ${
                mode === 'preview'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              预览
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              {value.length.toLocaleString()} 字
            </div>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              {value.split('\n').length} 行
            </div>
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
              </svg>
              预计 {Math.ceil(value.length / 200)} 分钟阅读
            </div>
          </div>
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