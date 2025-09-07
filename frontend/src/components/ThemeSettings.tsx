import React, { useState } from 'react';
import { useTheme, ColorTheme, CodeTheme, FontFamily, FontWeight, LineHeight } from '../contexts/ThemeContext';

interface ThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorThemeOptions: Array<{ value: ColorTheme; label: string; icon: string }> = [
  { value: 'light', label: '浅色主题', icon: '☀️' },
  { value: 'dark', label: '深色主题', icon: '🌙' },
  { value: 'system', label: '跟随系统', icon: '💻' },
];

const codeThemeOptions: Array<{ value: CodeTheme; label: string; preview: string; category: string }> = [
  // 经典主题
  { value: 'vs', label: 'VS Light', preview: '#FFFFFF', category: '经典' },
  { value: 'vscDarkPlus', label: 'VS Dark+', preview: '#1E1E1E', category: '经典' },
  { value: 'github', label: 'GitHub Light', preview: '#F6F8FA', category: '经典' },
  { value: 'tomorrow', label: 'Tomorrow', preview: '#FFFFFF', category: '经典' },
  { value: 'twilight', label: 'Twilight', preview: '#141414', category: '经典' },
  { value: 'monokai', label: 'Monokai', preview: '#272822', category: '经典' },
  { value: 'dracula', label: 'Dracula', preview: '#282A36', category: '经典' },
  { value: 'nord', label: 'Nord', preview: '#2E3440', category: '经典' },
  { value: 'oneLight', label: 'One Light', preview: '#FAFAFA', category: '经典' },
  { value: 'oneDark', label: 'One Dark', preview: '#282C34', category: '经典' },
  
  // 现代化主题
  { value: 'materialDark', label: 'Material Dark', preview: '#263238', category: '现代' },
  { value: 'materialLight', label: 'Material Light', preview: '#FAFAFA', category: '现代' },
  { value: 'atomDark', label: 'Atom Dark', preview: '#1D1F21', category: '现代' },
  { value: 'coldarkCold', label: 'Coldark Cold', preview: '#E3F6F5', category: '现代' },
  { value: 'coldarkDark', label: 'Coldark Dark', preview: '#111B27', category: '现代' },
  { value: 'nightOwl', label: 'Night Owl', preview: '#011627', category: '现代' },
  { value: 'synthwave84', label: 'Synthwave 84', preview: '#262335', category: '现代' },
  { value: 'shadesOfPurple', label: 'Shades of Purple', preview: '#2D2B55', category: '现代' },
  { value: 'lucario', label: 'Lucario', preview: '#2B3E50', category: '现代' },
  { value: 'okaidia', label: 'Okaidia', preview: '#272822', category: '现代' },
  { value: 'darcula', label: 'Darcula', preview: '#2B2B2B', category: '现代' },
  { value: 'solarizedlight', label: 'Solarized Light', preview: '#FDF6E3', category: '现代' },
  { value: 'prism', label: 'Prism', preview: '#FFFFFF', category: '现代' },
  { value: 'base16AteliersulphurpoolLight', label: 'Base16 Sulphurpool', preview: '#F5F7FF', category: '现代' },
  
  // HLJS主题系列
  { value: 'atelierCaveLight', label: 'Atelier Cave Light', preview: '#EFECF4', category: 'HLJS' },
  { value: 'atelierCaveDark', label: 'Atelier Cave Dark', preview: '#19171C', category: 'HLJS' },
  { value: 'atelierDuneLight', label: 'Atelier Dune Light', preview: '#FEF6E7', category: 'HLJS' },
  { value: 'atelierDuneDark', label: 'Atelier Dune Dark', preview: '#20201D', category: 'HLJS' },
  { value: 'atelierEstuaryLight', label: 'Atelier Estuary Light', preview: '#F4F3EC', category: 'HLJS' },
  { value: 'atelierEstuaryDark', label: 'Atelier Estuary Dark', preview: '#22221B', category: 'HLJS' },
  { value: 'atelierForestLight', label: 'Atelier Forest Light', preview: '#F1F3F4', category: 'HLJS' },
  { value: 'atelierForestDark', label: 'Atelier Forest Dark', preview: '#1B1918', category: 'HLJS' },
  { value: 'atelierHeathLight', label: 'Atelier Heath Light', preview: '#F7F3F7', category: 'HLJS' },
  { value: 'atelierHeathDark', label: 'Atelier Heath Dark', preview: '#1B181B', category: 'HLJS' },
  { value: 'atelierLakesideLight', label: 'Atelier Lakeside Light', preview: '#EBF8FF', category: 'HLJS' },
  { value: 'atelierLakesideDark', label: 'Atelier Lakeside Dark', preview: '#161B1D', category: 'HLJS' },
  { value: 'atelierPlateauLight', label: 'Atelier Plateau Light', preview: '#F4ECEC', category: 'HLJS' },
  { value: 'atelierPlateauDark', label: 'Atelier Plateau Dark', preview: '#1B1818', category: 'HLJS' },
  { value: 'atelierSavannaLight', label: 'Atelier Savanna Light', preview: '#ECF4EE', category: 'HLJS' },
  { value: 'atelierSavannaDark', label: 'Atelier Savanna Dark', preview: '#171C19', category: 'HLJS' },
  { value: 'atelierSeasideLight', label: 'Atelier Seaside Light', preview: '#F4FBFF', category: 'HLJS' },
  { value: 'atelierSeasideDark', label: 'Atelier Seaside Dark', preview: '#131513', category: 'HLJS' },
  { value: 'atelierSulphurpoolLight', label: 'Atelier Sulphurpool Light', preview: '#F5F7FF', category: 'HLJS' },
  { value: 'atelierSulphurpoolDark', label: 'Atelier Sulphurpool Dark', preview: '#202746', category: 'HLJS' },
  
  // 双色主题
  { value: 'duotoneDark', label: 'Duotone Dark', preview: '#2A2734', category: '双色' },
  { value: 'duotoneLight', label: 'Duotone Light', preview: '#FAF8F5', category: '双色' },
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
    updateFontSettings,
    resetToDefaults,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'appearance' | 'code' | 'typography' | 'fonts'>('appearance');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* 设置面板 */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl">
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
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {[
              { id: 'appearance' as const, label: '外观', icon: '🎨' },
              { id: 'code' as const, label: '代码', icon: '💻' },
              { id: 'typography' as const, label: '排版', icon: '📝' },
              { id: 'fonts' as const, label: '字体', icon: '🅰️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-0 ${
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
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
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
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    代码高亮主题
                  </h3>
                  
                  {/* 按分类显示主题 */}
                  {['极客', '热门', '现代', '经典', 'Atelier', '双色'].map((category) => {
                    const categoryThemes = codeThemeOptions.filter(option => option.category === category);
                    if (categoryThemes.length === 0) return null;
                    
                    return (
                      <div key={category} className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                          {category === '极客' && '🖥️ '}{category === '热门' && '🔥 '}{category === '现代' && '🎨 '}{category === '经典' && '📚 '}{category === '双色' && '🎭 '}{category === 'Atelier' && '🏛️ '}
                          {category === '极客' ? '极客主题' : category === '热门' ? '热门主题' : category === '现代' ? '现代主题' : category === '经典' ? '经典主题' : category === '双色' ? '双色主题' : 'Atelier 系列'}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {categoryThemes.map((option) => (
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
                    );
                  })}
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

            {activeTab === 'fonts' && (
              <div className="space-y-6">
                <FontFamilySelector />
                <FontWeightSelector />
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

// 字体系列选择器
function FontFamilySelector() {
  const { settings, updateFontSettings } = useTheme();

  const fontFamilyOptions: Array<{ 
    value: FontFamily; 
    label: string; 
    preview: string; 
    category: string; 
    description?: string; 
  }> = [
    // 系统字体
    { value: 'system', label: '系统默认', preview: 'System UI', category: '系统' },
    
    // 西文字体
    { value: 'inter', label: 'Inter', preview: 'Inter', category: '西文', description: '现代化无衬线字体' },
    { value: 'roboto', label: 'Roboto', preview: 'Roboto', category: '西文', description: 'Google 设计' },
    { value: 'open-sans', label: 'Open Sans', preview: 'Open Sans', category: '西文', description: '友好易读' },
    { value: 'lato', label: 'Lato', preview: 'Lato', category: '西文', description: '优雅简洁' },
    { value: 'source-sans-pro', label: 'Source Sans Pro', preview: 'Source Sans Pro', category: '西文', description: 'Adobe 出品' },
    { value: 'poppins', label: 'Poppins', preview: 'Poppins', category: '西文', description: '几何圆润' },
    { value: 'nunito', label: 'Nunito', preview: 'Nunito', category: '西文', description: '圆润友好' },
    { value: 'work-sans', label: 'Work Sans', preview: 'Work Sans', category: '西文', description: '工作专用' },
    
    // 中文字体
    { value: 'noto-sans-sc', label: 'Noto Sans SC', preview: '思源黑体', category: '中文', description: 'Google 中文字体' },
    { value: 'source-han-sans', label: 'Source Han Sans', preview: '思源黑体', category: '中文', description: 'Adobe 中文字体' },
    { value: 'pingfang-sc', label: 'PingFang SC', preview: '苹方', category: '中文', description: 'Apple 中文字体' },
    { value: 'microsoft-yahei', label: 'Microsoft YaHei', preview: '微软雅黑', category: '中文', description: 'Windows 系统字体' },
    { value: 'hiragino-sans-gb', label: 'Hiragino Sans GB', preview: '冬青黑体', category: '中文', description: 'macOS 中文字体' },
    { value: 'dengxian', label: 'DengXian', preview: '等线', category: '中文', description: 'Office 字体' },
    { value: 'simhei', label: 'SimHei', preview: '黑体', category: '中文', description: '经典黑体' },
    { value: 'simsun', label: 'SimSun', preview: '宋体', category: '中文', description: '经典宋体' },
    { value: 'kaiti', label: 'KaiTi', preview: '楷体', category: '中文', description: '经典楷书' },
    { value: 'fangsong', label: 'FangSong', preview: '仿宋', category: '中文', description: '传统仿宋体' },
    
    // 等宽字体
    { value: 'jetbrains-mono', label: 'JetBrains Mono', preview: 'JetBrains Mono', category: '等宽', description: '编程专用' },
    { value: 'fira-code', label: 'Fira Code', preview: 'Fira Code', category: '等宽', description: '连字支持' },
    { value: 'source-code-pro', label: 'Source Code Pro', preview: 'Source Code Pro', category: '等宽', description: 'Adobe 等宽' },
    { value: 'cascadia-code', label: 'Cascadia Code', preview: 'Cascadia Code', category: '等宽', description: 'VS Code 字体' },
    { value: 'sf-mono', label: 'SF Mono', preview: 'SF Mono', category: '等宽', description: 'Apple 等宽' },
    { value: 'consolas', label: 'Consolas', preview: 'Consolas', category: '等宽', description: 'Windows 等宽' },
    { value: 'menlo', label: 'Menlo', preview: 'Menlo', category: '等宽', description: 'macOS 等宽' },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
        字体系列
      </h3>
      
      {/* 正文字体 */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          📖 正文字体
        </h4>
        <FontCategoryGrid
          options={fontFamilyOptions}
          currentValue={settings.fonts.body}
          onSelect={(value) => updateFontSettings({ body: value })}
        />
      </div>

      {/* 标题字体 */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          📝 标题字体
        </h4>
        <FontCategoryGrid
          options={fontFamilyOptions}
          currentValue={settings.fonts.heading}
          onSelect={(value) => updateFontSettings({ heading: value })}
        />
      </div>

      {/* 代码字体 */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          💻 代码字体
        </h4>
        <FontCategoryGrid
          options={fontFamilyOptions.filter(opt => opt.category === '等宽')}
          currentValue={settings.fonts.code}
          onSelect={(value) => updateFontSettings({ code: value })}
        />
      </div>
    </div>
  );
}

// 字体粗细选择器
function FontWeightSelector() {
  const { settings, updateFontSettings } = useTheme();

  const fontWeightOptions: Array<{ value: FontWeight; label: string; example: string }> = [
    { value: 'thin', label: '极细', example: 'font-thin' },
    { value: 'light', label: '细体', example: 'font-light' },
    { value: 'normal', label: '正常', example: 'font-normal' },
    { value: 'medium', label: '中等', example: 'font-medium' },
    { value: 'semibold', label: '半粗', example: 'font-semibold' },
    { value: 'bold', label: '粗体', example: 'font-bold' },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        字体粗细
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {fontWeightOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => updateFontSettings({ weight: option.value })}
            className={`p-3 rounded-lg border-2 transition-all ${
              settings.fonts.weight === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className={`${option.example} text-gray-900 dark:text-white text-lg`}>
              Aa
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {option.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


// 字体分类网格组件
function FontCategoryGrid({ 
  options, 
  currentValue, 
  onSelect 
}: { 
  options: Array<{ value: FontFamily; label: string; preview: string; category: string; description?: string }>; 
  currentValue: FontFamily; 
  onSelect: (value: FontFamily) => void; 
}) {
  const categories = ['系统', '中文', '西文', '等宽'];
  
  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryOptions = options.filter(opt => opt.category === category);
        if (categoryOptions.length === 0) return null;
        
        return (
          <div key={category}>
            <div className="grid grid-cols-1 gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    currentValue === option.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {option.description}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                    {option.preview}
                  </div>
                  {currentValue === option.value && (
                    <svg className="w-4 h-4 text-primary-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}