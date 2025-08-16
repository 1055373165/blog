import { FontFamily, FontWeight, LineHeight, FontSettings } from '../contexts/ThemeContext';

// 字体映射到实际的CSS font-family
export const fontFamilyMap: Record<FontFamily, string> = {
  // 系统字体
  'system': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // 西文字体
  'inter': '"Inter", system-ui, sans-serif',
  'roboto': '"Roboto", system-ui, sans-serif',
  'open-sans': '"Open Sans", system-ui, sans-serif',
  'lato': '"Lato", system-ui, sans-serif',
  'source-sans-pro': '"Source Sans Pro", system-ui, sans-serif',
  'poppins': '"Poppins", system-ui, sans-serif',
  'nunito': '"Nunito", system-ui, sans-serif',
  'work-sans': '"Work Sans", system-ui, sans-serif',
  
  // 中文字体
  'noto-sans-sc': '"Noto Sans SC", "Noto Sans CJK SC", system-ui, sans-serif',
  'source-han-sans': '"Source Han Sans SC", "Source Han Sans CN", system-ui, sans-serif',
  'pingfang-sc': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
  'microsoft-yahei': '"Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
  'hiragino-sans-gb': '"Hiragino Sans GB", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  'dengxian': '"DengXian", "Microsoft YaHei", system-ui, sans-serif',
  'simhei': '"SimHei", "Microsoft YaHei", system-ui, sans-serif',
  'simsun': '"SimSun", "Microsoft YaHei", system-ui, serif',
  
  // 等宽字体
  'jetbrains-mono': '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", "Consolas", monospace',
  'fira-code': '"Fira Code", "JetBrains Mono", "SF Mono", "Cascadia Code", "Consolas", monospace',
  'source-code-pro': '"Source Code Pro", "SF Mono", "Cascadia Code", "Consolas", monospace',
  'cascadia-code': '"Cascadia Code", "Fira Code", "SF Mono", "Consolas", monospace',
  'sf-mono': '"SF Mono", "Cascadia Code", "Consolas", "Menlo", monospace',
  'consolas': '"Consolas", "SF Mono", "Cascadia Code", "Courier New", monospace',
  'menlo': '"Menlo", "SF Mono", "Consolas", "Monaco", monospace',
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

// 预加载Google Fonts
export function preloadGoogleFonts(fontFamilies: FontFamily[]): void {
  const googleFonts = fontFamilies.filter(font => 
    ['inter', 'roboto', 'open-sans', 'lato', 'source-sans-pro', 'poppins', 'nunito', 'work-sans', 'noto-sans-sc', 'source-han-sans'].includes(font)
  );

  if (googleFonts.length === 0) return;

  const googleFontUrls: Record<string, string> = {
    'inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
    'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
    'lato': 'https://fonts.googleapis.com/css2?family=Lato:wght@400;500;600;700&display=swap',
    'source-sans-pro': 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;500;600;700&display=swap',
    'poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    'nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
    'work-sans': 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap',
    'noto-sans-sc': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
    'source-han-sans': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap', // 使用Noto作为替代
  };

  // 创建预加载链接
  googleFonts.forEach(font => {
    const url = googleFontUrls[font];
    if (url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      link.onload = () => {
        // 字体预加载完成后，创建实际的样式链接
        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = url;
        document.head.appendChild(styleLink);
      };
      document.head.appendChild(link);
    }
  });
}

// 获取字体建议（基于语言和用途）
export function getFontRecommendations(purpose: 'body' | 'heading' | 'code', language: 'zh' | 'en' | 'mixed' = 'mixed'): FontFamily[] {
  const recommendations: Record<string, Record<string, FontFamily[]>> = {
    body: {
      zh: ['noto-sans-sc', 'source-han-sans', 'pingfang-sc', 'microsoft-yahei'],
      en: ['inter', 'roboto', 'open-sans', 'lato'],
      mixed: ['inter', 'noto-sans-sc', 'source-han-sans', 'roboto'],
    },
    heading: {
      zh: ['pingfang-sc', 'noto-sans-sc', 'source-han-sans', 'hiragino-sans-gb'],
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