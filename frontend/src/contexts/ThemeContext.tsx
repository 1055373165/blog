import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { applyFontSettings } from '../utils/fontUtils';

export type ColorTheme = 'light' | 'dark' | 'system';

export type CodeTheme = 
  // 经典主题
  | 'vs'
  | 'vscDarkPlus'  
  | 'github'
  | 'tomorrow'
  | 'twilight'
  | 'monokai'
  | 'dracula'
  | 'nord'
  | 'oneLight'
  | 'oneDark'
  // 现代化主题
  | 'materialDark'
  | 'materialLight'
  | 'atomDark'
  | 'coldarkCold'
  | 'coldarkDark'
  | 'prism'
  | 'synthwave84'
  | 'nightOwl'
  | 'shadesOfPurple'
  | 'lucario'
  | 'duotoneDark'
  | 'duotoneLight'
  | 'okaidia'
  | 'solarizedlight'
  | 'darcula'
  | 'base16AteliersulphurpoolLight'
  // Atelier 系列
  | 'atelierCave'
  | 'atelierDune'
  | 'atelierEstuary'
  | 'atelierForest'
  | 'atelierHeath'
  | 'atelierLakeside'
  | 'atelierPlateau'
  | 'atelierSavanna'
  | 'atelierSeaside'
  | 'atelierSulphurpool'
  // 极客主题
  | 'geek'
  | 'matrix'
  | 'terminal';

export type FontFamily = 
  // 系统字体
  | 'system'
  // 西文字体
  | 'inter'
  | 'roboto'
  | 'open-sans'
  | 'lato'
  | 'source-sans-pro'
  | 'poppins'
  | 'nunito'
  | 'work-sans'
  // 中文字体
  | 'noto-sans-sc'
  | 'source-han-sans'
  | 'pingfang-sc'
  | 'microsoft-yahei'
  | 'hiragino-sans-gb'
  | 'dengxian'
  | 'simhei'
  | 'simsun'
  | 'kaiti'
  | 'fangsong'
  // 等宽字体
  | 'jetbrains-mono'
  | 'fira-code'
  | 'source-code-pro'
  | 'cascadia-code'
  | 'sf-mono'
  | 'consolas'
  | 'menlo';

export type FontWeight = 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';

export interface FontSettings {
  body: FontFamily;
  heading: FontFamily;
  code: FontFamily;
  weight: FontWeight;
  lineHeight: LineHeight;
}

interface ThemeSettings {
  colorTheme: ColorTheme;
  codeTheme: CodeTheme;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  lineNumbers: boolean;
  wordWrap: boolean;
  fonts: FontSettings;
}

interface ThemeContextType {
  settings: ThemeSettings;
  isDark: boolean;
  updateColorTheme: (theme: ColorTheme) => void;
  updateCodeTheme: (theme: CodeTheme) => void;
  updateFontSize: (size: ThemeSettings['fontSize']) => void;
  updateLineNumbers: (enabled: boolean) => void;
  updateWordWrap: (enabled: boolean) => void;
  updateFontSettings: (fonts: Partial<FontSettings>) => void;
  resetToDefaults: () => void;
}

const defaultSettings: ThemeSettings = {
  colorTheme: 'system',
  codeTheme: 'vscDarkPlus',
  fontSize: 'base',
  lineNumbers: false,
  wordWrap: true,
  fonts: {
    body: 'system',
    heading: 'system',
    code: 'jetbrains-mono',
    weight: 'normal',
    lineHeight: 'normal',
  },
};

const STORAGE_KEY = 'blog-theme-settings';

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          return { ...defaultSettings, ...parsedSettings };
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      }
    }
    return defaultSettings;
  });

  const [isDark, setIsDark] = useState(false);

  // 检测系统主题 - 优化为立即响应
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      let shouldBeDark = false;
      
      if (settings.colorTheme === 'dark') {
        shouldBeDark = true;
      } else if (settings.colorTheme === 'light') {
        shouldBeDark = false;
      } else { // system
        shouldBeDark = mediaQuery.matches;
      }
      
      // 使用 flushSync 确保立即更新状态和DOM
      setIsDark(shouldBeDark);
      
      // 立即更新DOM，确保没有延迟
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();
    
    // 监听系统主题变化（仅当 colorTheme 为 'system' 时）
    if (settings.colorTheme === 'system') {
      mediaQuery.addEventListener('change', updateTheme);
    }
    
    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [settings.colorTheme]);

  // 保存设置到localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }, [settings]);

  // 应用字体设置
  useEffect(() => {
    applyFontSettings(settings.fonts);
    
    // 字体设置已更新为使用系统字体，无需预加载外部字体
  }, [settings.fonts]);

  // 初始化时应用字体设置
  useEffect(() => {
    applyFontSettings(settings.fonts);
  }, []);

  const updateColorTheme = (theme: ColorTheme) => {
    // 立即更新状态，确保UI响应
    setSettings(prev => ({ ...prev, colorTheme: theme }));
    
    // 提供即时视觉反馈，不等待useEffect
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let shouldBeDark = false;
    
    if (theme === 'dark') {
      shouldBeDark = true;
    } else if (theme === 'light') {
      shouldBeDark = false;
    } else { // system
      shouldBeDark = mediaQuery.matches;
    }
    
    // 立即更新DOM和状态
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updateCodeTheme = (theme: CodeTheme) => {
    setSettings(prev => ({ ...prev, codeTheme: theme }));
  };

  const updateFontSize = (size: ThemeSettings['fontSize']) => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  const updateLineNumbers = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, lineNumbers: enabled }));
  };

  const updateWordWrap = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, wordWrap: enabled }));
  };

  const updateFontSettings = (fonts: Partial<FontSettings>) => {
    setSettings(prev => ({ ...prev, fonts: { ...prev.fonts, ...fonts } }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const value: ThemeContextType = {
    settings,
    isDark,
    updateColorTheme,
    updateCodeTheme,
    updateFontSize,
    updateLineNumbers,
    updateWordWrap,
    updateFontSettings,
    resetToDefaults,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}