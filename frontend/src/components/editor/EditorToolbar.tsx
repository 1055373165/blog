import React, { useState } from 'react';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
  editor: Editor;
  onMediaUpload: () => void;
}

export function EditorToolbar({ editor, onMediaUpload }: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  interface ToolbarButton {
    icon: string;
    title: string;
    isActive: boolean;
    onClick: () => void | boolean;
    className?: string;
    disabled?: boolean;
  }

  interface ToolbarGroup {
    group: string;
    buttons: ToolbarButton[];
  }

  const toolbarButtons: ToolbarGroup[] = [
    // Text formatting
    {
      group: 'format',
      buttons: [
        {
          icon: 'B',
          title: '粗体',
          isActive: editor.isActive('bold'),
          onClick: () => editor.chain().focus().toggleBold().run(),
          className: 'font-bold',
        },
        {
          icon: 'I',
          title: '斜体',
          isActive: editor.isActive('italic'),
          onClick: () => editor.chain().focus().toggleItalic().run(),
          className: 'italic',
        },
        {
          icon: 'U',
          title: '下划线',
          isActive: editor.isActive('underline'),
          onClick: () => editor.chain().focus().toggleUnderline().run(),
          className: 'underline',
        },
        {
          icon: 'S',
          title: '删除线',
          isActive: editor.isActive('strike'),
          onClick: () => editor.chain().focus().toggleStrike().run(),
          className: 'line-through',
        },
        {
          icon: '</>', 
          title: '行内代码',
          isActive: editor.isActive('code'),
          onClick: () => editor.chain().focus().toggleCode().run(),
          className: 'font-mono text-xs',
        },
      ],
    },
    // Headings
    {
      group: 'headings',
      buttons: [
        {
          icon: 'H1',
          title: '一级标题',
          isActive: editor.isActive('heading', { level: 1 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          icon: 'H2',
          title: '二级标题', 
          isActive: editor.isActive('heading', { level: 2 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          icon: 'H3',
          title: '三级标题',
          isActive: editor.isActive('heading', { level: 3 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
      ],
    },
    // Lists
    {
      group: 'lists',
      buttons: [
        {
          icon: '•',
          title: '无序列表',
          isActive: editor.isActive('bulletList'),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          icon: '1.',
          title: '有序列表',
          isActive: editor.isActive('orderedList'),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          icon: '❝',
          title: '引用',
          isActive: editor.isActive('blockquote'),
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
      ],
    },
    // Blocks
    {
      group: 'blocks',
      buttons: [
        {
          icon: '{}',
          title: '代码块',
          isActive: editor.isActive('codeBlock'),
          onClick: () => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
          icon: '—',
          title: '分割线',
          isActive: false,
          onClick: () => editor.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
    // Insert
    {
      group: 'insert',
      buttons: [
        {
          icon: '🔗',
          title: '链接',
          isActive: editor.isActive('link'),
          onClick: () => setShowLinkDialog(true),
        },
        {
          icon: '📷',
          title: '图片',
          isActive: false,
          onClick: onMediaUpload,
        },
        {
          icon: '⊞',
          title: '表格',
          isActive: editor.isActive('table'),
          onClick: addTable,
        },
      ],
    },
    // Actions
    {
      group: 'actions',
      buttons: [
        {
          icon: '↶',
          title: '撤销',
          isActive: false,
          onClick: () => editor.chain().focus().undo().run(),
          disabled: !editor.can().undo(),
        },
        {
          icon: '↷',
          title: '重做',
          isActive: false,
          onClick: () => editor.chain().focus().redo().run(),
          disabled: !editor.can().redo(),
        },
      ],
    },
  ];

  return (
    <div className="editor-toolbar">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
        {toolbarButtons.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            {groupIndex > 0 && (
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            )}
            <div className="flex items-center gap-1">
              {group.buttons.map((button, buttonIndex) => (
                <button
                  key={buttonIndex}
                  onClick={button.onClick}
                  disabled={button.disabled}
                  title={button.title}
                  className={`
                    relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${button.isActive 
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }
                    ${button.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer'
                    }
                    ${button.className || ''}
                  `}
                >
                  {button.icon}
                </button>
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              添加链接
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  链接地址
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addLink();
                    } else if (e.key === 'Escape') {
                      setShowLinkDialog(false);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={addLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}