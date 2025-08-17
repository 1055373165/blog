import React from 'react';
import { ViewMode, ViewModeConfig } from '../../types';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

const viewModeConfigs: ViewModeConfig[] = [
  {
    mode: 'grid',
    label: '网格视图',
    description: '卡片网格布局，展示箴言的核心内容',
    icon: '🔲'
  },
  {
    mode: 'list',
    label: '列表视图',
    description: '紧凑的列表形式，快速浏览箴言',
    icon: '📋'
  },
  {
    mode: 'detailed',
    label: '详细列表',
    description: '包含更多信息的详细列表展示',
    icon: '📄'
  },
  {
    mode: 'masonry',
    label: '瀑布流',
    description: '不规则高度的响应式瀑布流布局',
    icon: '🏗️'
  }
];

export default function ViewModeSelector({ currentMode, onModeChange, className = '' }: ViewModeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="tablist" aria-label="视图模式选择">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
        视图模式:
      </span>
      
      {viewModeConfigs.map((config) => (
        <button
          key={config.mode}
          onClick={() => onModeChange(config.mode)}
          className={`
            group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out
            hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            ${currentMode === config.mode
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
            }
          `}
          title={config.description}
          role="tab"
          aria-selected={currentMode === config.mode}
          aria-controls={`quotes-content-${config.mode}`}
        >
          <span className="text-lg" role="img" aria-hidden="true">
            {config.icon}
          </span>
          <span className="hidden sm:inline">{config.label}</span>
          
          {/* 工具提示 */}
          <div className="
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
            bg-gray-900 dark:bg-gray-700 text-white text-xs rounded py-2 px-3
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            pointer-events-none whitespace-nowrap z-50
          ">
            {config.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-700"></div>
          </div>
        </button>
      ))}
      
      {/* 视觉指示器 */}
      <div className="hidden lg:flex items-center ml-4 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        当前: {viewModeConfigs.find(c => c.mode === currentMode)?.label}
      </div>
    </div>
  );
}

// 导出视图模式配置供其他组件使用
export { viewModeConfigs };