import React, { useState } from 'react';
import { useTheme, ColorTheme, CodeTheme } from '../contexts/ThemeContext';

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorThemeOptions: Array<{ value: ColorTheme; label: string; icon: string }> = [
  { value: 'light', label: '浅色主题', icon: '☀️' },
  { value: 'dark', label: '深色主题', icon: '🌙' },
  { value: 'system', label: '跟随系统', icon: '💻' },
];

const codeThemeOptions: Array<{ value: CodeTheme; label: string; preview: string }> = [
  { value: 'vs', label: 'VS Light', preview: '#FFFFFF' },
  { value: 'vscDarkPlus', label: 'VS Dark+', preview: '#1E1E1E' },
  { value: 'github', label: 'GitHub Light', preview: '#F6F8FA' },
  { value: 'tomorrow', label: 'Tomorrow', preview: '#FFFFFF' },
  { value: 'twilight', label: 'Twilight', preview: '#141414' },
  { value: 'monokai', label: 'Monokai', preview: '#272822' },
  { value: 'dracula', label: 'Dracula', preview: '#282A36' },
  { value: 'nord', label: 'Nord', preview: '#2E3440' },
  { value: 'oneLight', label: 'One Light', preview: '#FAFAFA' },
  { value: 'oneDark', label: 'One Dark', preview: '#282C34' },
];

const fontSizeOptions = [
  { value: 'sm' as const, label: '小号', example: 'text-sm' },
  { value: 'base' as const, label: '标准', example: 'text-base' },
  { value: 'lg' as const, label: '大号', example: 'text-lg' },
  { value: 'xl' as const, label: '特大', example: 'text-xl' },
];

export default function ThemeSettings({ isOpen, onClose }: ThemeSettingsProps) {
  const {
    settings,
    updateColorTheme,
    updateCodeTheme,
    updateFontSize,
    updateLineNumbers,
    updateWordWrap,
    resetToDefaults,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'appearance' | 'code' | 'typography'>('appearance');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* 设置面板 */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              主题设置
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 标签页 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'appearance' as const, label: '外观', icon: '🎨' },
              { id: 'code' as const, label: '代码', icon: '💻' },
              { id: 'typography' as const, label: '排版', icon: '📝' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    颜色主题
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {colorThemeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateColorTheme(option.value)}
                        className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                          settings.colorTheme === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl mr-3">{option.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        {settings.colorTheme === option.value && (
                          <svg className="w-4 h-4 ml-auto text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    代码高亮主题
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {codeThemeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateCodeTheme(option.value)}
                        className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                          settings.codeTheme === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div 
                          className="w-6 h-6 rounded border mr-3"
                          style={{ backgroundColor: option.preview }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        {settings.codeTheme === option.value && (
                          <svg className="w-4 h-4 ml-auto text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      显示行号
                    </label>
                    <button
                      onClick={() => updateLineNumbers(!settings.lineNumbers)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                        settings.lineNumbers ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                          settings.lineNumbers ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      自动换行
                    </label>
                    <button
                      onClick={() => updateWordWrap(!settings.wordWrap)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                        settings.wordWrap ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                          settings.wordWrap ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    字体大小
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {fontSizeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateFontSize(option.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.fontSize === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`${option.example} font-medium text-gray-900 dark:text-white`}>
                          Aa
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={resetToDefaults}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              恢复默认设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}