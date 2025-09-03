import { FontFamily, FontWeight, LineHeight, FontSettings } from '../contexts/ThemeContext';

// 字体映射到实际的CSS font-family - 使用系统本地字体
export const fontFamilyMap: Record<FontFamily, string> = {
  // 系统字体
  'system': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // 西文字体 - 使用系统字体作为首选
  'inter': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'roboto': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'open-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'lato': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'source-sans-pro': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'poppins': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'nunito': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  'work-sans': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  
  // 中文字体 - 使用系统本地字体
  'noto-sans-sc': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif',
  'source-han-sans': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", system-ui, sans-serif',
  'pingfang-sc': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
  'microsoft-yahei': '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Segoe UI", system-ui, sans-serif',
  'hiragino-sans-gb': '"Hiragino Sans GB", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  'dengxian': '"DengXian", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
  'simhei': '"SimHei", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
  'simsun': '"SimSun", "Microsoft YaHei", "Times New Roman", system-ui, serif',
  'kaiti': '"KaiTi", "STKaiti", "Microsoft YaHei", "PingFang SC", system-ui, serif',
  'fangsong': '"FangSong", "STFangsong", "Microsoft YaHei", "Times New Roman", system-ui, serif',
  
  // 等宽字体 - 使用系统本地字体
  'jetbrains-mono': '"SF Mono", "Monaco", "Cascadia Code", "Consolas", "Courier New", monospace',
  'fira-code': '"SF Mono", "Monaco", "Cascadia Code", "Consolas", "Courier New", monospace',
  'source-code-pro': '"SF Mono", "Monaco", "Cascadia Code", "Consolas", "Courier New", monospace',
  'cascadia-code': '"Cascadia Code", "SF Mono", "Monaco", "Consolas", "Courier New", monospace',
  'sf-mono': '"SF Mono", "Monaco", "Cascadia Code", "Consolas", "Menlo", monospace',
  'consolas': '"Consolas", "SF Mono", "Monaco", "Cascadia Code", "Courier New", monospace',
  'menlo': '"Menlo", "SF Mono", "Monaco", "Consolas", "Courier New", monospace',
};

// 字体粗细映射到CSS font-weight
export const fontWeightMap: Record<FontWeight, string> = {
  'thin': '100',
  'light': '300',
  'normal': '400',
  'medium': '500',
  'semibold': '600',
  'bold': '700',
};

// 行高映射到CSS line-height
export const lineHeightMap: Record<LineHeight, string> = {
  'tight': '1.25',
  'normal': '1.5',
  'relaxed': '1.625',
  'loose': '2',
};

// 生成CSS变量
export function generateFontCSS(fontSettings: FontSettings): Record<string, string> {
  return {
    '--font-body': fontFamilyMap[fontSettings.body],
    '--font-heading': fontFamilyMap[fontSettings.heading],
    '--font-code': fontFamilyMap[fontSettings.code],
    '--font-weight': fontWeightMap[fontSettings.weight],
    '--line-height': lineHeightMap[fontSettings.lineHeight],
  };
}

// 应用字体设置到DOM
export function applyFontSettings(fontSettings: FontSettings): void {
  const root = document.documentElement;
  const cssVars = generateFontCSS(fontSettings);
  
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

// 获取字体加载状态（用于网络字体）
export function getFontLoadingStatus(fontFamily: FontFamily): Promise<boolean> {
  return new Promise((resolve) => {
    // 对于系统字体，直接返回成功
    if (fontFamily === 'system') {
      resolve(true);
      return;
    }

    // 检查字体是否可用
    const testString = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789中文测试';
    const testSize = '12px';
    const fallbackFont = 'serif';
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      resolve(false);
      return;
    }

    // 测量fallback字体的宽度
    context.font = `${testSize} ${fallbackFont}`;
    const fallbackWidth = context.measureText(testString).width;
    
    // 测量目标字体的宽度
    const targetFont = fontFamilyMap[fontFamily].split(',')[0].replace(/"/g, '');
    context.font = `${testSize} ${targetFont}, ${fallbackFont}`;
    const targetWidth = context.measureText(testString).width;
    
    // 如果宽度不同，说明字体已加载
    resolve(targetWidth !== fallbackWidth);
  });
}

// 预加载字体 - 现在只处理系统字体
export function preloadGoogleFonts(fontFamilies: FontFamily[]): void {
  // Google Fonts 已移除，此函数现在仅用于兼容性
  // 系统字体无需预加载
  return;
}

// 获取字体建议（基于语言和用途）
export function getFontRecommendations(purpose: 'body' | 'heading' | 'code', language: 'zh' | 'en' | 'mixed' = 'mixed'): FontFamily[] {
  const recommendations: Record<string, Record<string, FontFamily[]>> = {
    body: {
      zh: ['noto-sans-sc', 'source-han-sans', 'pingfang-sc', 'microsoft-yahei', 'kaiti', 'fangsong'],
      en: ['inter', 'roboto', 'open-sans', 'lato'],
      mixed: ['inter', 'noto-sans-sc', 'source-han-sans', 'roboto'],
    },
    heading: {
      zh: ['pingfang-sc', 'noto-sans-sc', 'source-han-sans', 'hiragino-sans-gb', 'kaiti'],
      en: ['inter', 'poppins', 'work-sans', 'nunito'],
      mixed: ['inter', 'pingfang-sc', 'poppins', 'noto-sans-sc'],
    },
    code: {
      zh: ['jetbrains-mono', 'fira-code', 'source-code-pro'],
      en: ['jetbrains-mono', 'fira-code', 'cascadia-code'],
      mixed: ['jetbrains-mono', 'fira-code', 'source-code-pro'],
    },
  };

  return recommendations[purpose][language] || recommendations[purpose]['mixed'];
}