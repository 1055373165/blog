import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ColorTheme = 'light' | 'dark' | 'system';

export type CodeTheme = 
  | 'vs'
  | 'vscDarkPlus'  
  | 'github'
  | 'tomorrow'
  | 'twilight'
  | 'monokai'
  | 'dracula'
  | 'nord'
  | 'oneLight'
  | 'oneDark';

interface ThemeSettings {
  colorTheme: ColorTheme;
  codeTheme: CodeTheme;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  lineNumbers: boolean;
  wordWrap: boolean;
}

interface ThemeContextType {
  settings: ThemeSettings;
  isDark: boolean;
  updateColorTheme: (theme: ColorTheme) => void;
  updateCodeTheme: (theme: CodeTheme) => void;
  updateFontSize: (size: ThemeSettings['fontSize']) => void;
  updateLineNumbers: (enabled: boolean) => void;
  updateWordWrap: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const defaultSettings: ThemeSettings = {
  colorTheme: 'system',
  codeTheme: 'vscDarkPlus',
  fontSize: 'base',
  lineNumbers: true,
  wordWrap: true,
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

  // 检测系统主题
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
      
      setIsDark(shouldBeDark);
      
      // 更新DOM
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();
    
    // 监听系统主题变化
    mediaQuery.addEventListener('change', updateTheme);
    
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

  const updateColorTheme = (theme: ColorTheme) => {
    setSettings(prev => ({ ...prev, colorTheme: theme }));
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