import { useMemo } from 'react';

interface ReadingTimeOptions {
  wordsPerMinute?: number; // 每分钟阅读字数，默认中文200字，英文250词
  includeImages?: boolean; // 是否计算图片浏览时间
  includeTables?: boolean; // 是否计算表格阅读时间
  imageTime?: number; // 每张图片的浏览时间（秒）
  tableTime?: number; // 每个表格的阅读时间（秒）
  language?: 'zh' | 'en' | 'auto'; // 语言类型，影响WPM计算
}

interface ReadingTimeResult {
  minutes: number; // 阅读时间（分钟）
  seconds: number; // 阅读时间（秒）
  words: number; // 总字数/词数
  text: string; // 格式化的阅读时间文本
  estimatedTime: string; // 估算时间描述
}

// 默认配置
const DEFAULT_OPTIONS: Required<ReadingTimeOptions> = {
  wordsPerMinute: 200, // 中文默认200字/分钟
  includeImages: true,
  includeTables: true,
  imageTime: 12, // 每张图片12秒
  tableTime: 20, // 每个表格20秒
  language: 'auto'
};

/**
 * 计算文本阅读时间
 */
export function useReadingTime(
  content: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return useMemo(() => {
    if (!content) {
      return {
        minutes: 0,
        seconds: 0,
        words: 0,
        text: '0 分钟',
        estimatedTime: '不到 1 分钟'
      };
    }

    // 检测语言类型
    const detectLanguage = (text: string): 'zh' | 'en' => {
      const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
      const englishWords = text.match(/[a-zA-Z]+/g) || [];
      
      // 如果中文字符数量大于英文单词数量，认为是中文
      return chineseChars.length > englishWords.length ? 'zh' : 'en';
    };

    const language = config.language === 'auto' ? detectLanguage(content) : config.language;
    
    // 根据语言调整WPM
    const wpm = language === 'zh' ? 
      (options.wordsPerMinute || 200) : // 中文默认200字/分钟
      (options.wordsPerMinute || 250);  // 英文默认250词/分钟

    // 计算文字数量
    let wordCount = 0;
    
    if (language === 'zh') {
      // 中文：计算字符数（排除空格、标点等）
      const chineseChars = content.match(/[\u4e00-\u9fff]/g) || [];
      const englishWords = content.match(/[a-zA-Z]+/g) || [];
      wordCount = chineseChars.length + (englishWords.length * 1.5); // 英文单词按1.5个中文字符计算
    } else {
      // 英文：计算单词数
      wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // 计算基础阅读时间（分钟）
    let readingTimeMinutes = wordCount / wpm;

    // 计算图片时间
    if (config.includeImages) {
      const imageMatches = content.match(/!\[.*?\]\(.*?\)|<img[^>]*>/g) || [];
      const imageTime = (imageMatches.length * config.imageTime) / 60; // 转换为分钟
      readingTimeMinutes += imageTime;
    }

    // 计算表格时间
    if (config.includeTables) {
      const tableMatches = content.match(/\|.*\|/g) || [];
      const tableCount = Math.ceil(tableMatches.length / 3); // 估算表格数量
      const tableTime = (tableCount * config.tableTime) / 60; // 转换为分钟
      readingTimeMinutes += tableTime;
    }

    // 计算代码块阅读时间（代码通常阅读更慢）
    const codeMatches = content.match(/```[\s\S]*?```|`[^`]+`/g) || [];
    if (codeMatches.length > 0) {
      const codeContent = codeMatches.join(' ');
      const codeWordCount = language === 'zh' ? 
        (codeContent.match(/[\u4e00-\u9fff]/g) || []).length :
        codeContent.trim().split(/\s+/).length;
      
      // 代码阅读速度是普通文本的60%
      const codeTime = (codeWordCount / wpm) * 0.6;
      readingTimeMinutes += codeTime;
    }

    // 最少1分钟
    readingTimeMinutes = Math.max(readingTimeMinutes, 1);
    
    const totalMinutes = Math.ceil(readingTimeMinutes);
    const totalSeconds = Math.ceil(readingTimeMinutes * 60);

    // 生成友好的时间描述
    const generateTimeText = (minutes: number): string => {
      if (minutes === 1) {
        return '1 分钟';
      } else if (minutes < 60) {
        return `${minutes} 分钟`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
          return `${hours} 小时`;
        } else {
          return `${hours} 小时 ${remainingMinutes} 分钟`;
        }
      }
    };

    // 生成估算时间描述
    const generateEstimatedTime = (minutes: number): string => {
      if (minutes <= 1) {
        return '不到 1 分钟';
      } else if (minutes <= 3) {
        return '约 2-3 分钟';
      } else if (minutes <= 5) {
        return '约 5 分钟';
      } else if (minutes <= 10) {
        return '约 5-10 分钟';
      } else if (minutes <= 15) {
        return '约 10-15 分钟';
      } else if (minutes <= 30) {
        return '约 15-30 分钟';
      } else {
        return '约 30 分钟以上';
      }
    };

    return {
      minutes: totalMinutes,
      seconds: totalSeconds,
      words: Math.round(wordCount),
      text: generateTimeText(totalMinutes),
      estimatedTime: generateEstimatedTime(totalMinutes)
    };
  }, [content, config]);
}

/**
 * 从 HTML 或 Markdown 内容计算阅读时间
 */
export function useReadingTimeFromHtml(
  htmlContent: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const textContent = useMemo(() => {
    if (!htmlContent) return '';
    
    // 移除 HTML 标签，但保留文本内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // 移除 script 和 style 标签
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    return tempDiv.textContent || tempDiv.innerText || '';
  }, [htmlContent]);

  return useReadingTime(textContent, options);
}

/**
 * 实时计算元素的阅读时间
 */
export function useElementReadingTime(
  elementRef: React.RefObject<HTMLElement>,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const content = useMemo(() => {
    if (!elementRef.current) return '';
    return elementRef.current.textContent || '';
  }, [elementRef]);

  return useReadingTime(content, options);
}

/**
 * 批量计算多个内容的阅读时间
 */
export function useBatchReadingTime(
  contents: string[],
  options: ReadingTimeOptions = {}
): ReadingTimeResult[] {
  return useMemo(() => {
    return contents.map(content => {
      // 这里不使用 useReadingTime Hook，直接使用计算逻辑
      const config = { ...DEFAULT_OPTIONS, ...options };
      
      if (!content) {
        return {
          minutes: 0,
          seconds: 0,
          words: 0,
          text: '0 分钟',
          estimatedTime: '不到 1 分钟'
        };
      }

      // 简化版计算（复用上面的逻辑）
      const language = config.language === 'auto' ? 
        ((content.match(/[\u4e00-\u9fff]/g) || []).length > 
         (content.match(/[a-zA-Z]+/g) || []).length ? 'zh' : 'en') : 
        config.language;
      
      const wpm = language === 'zh' ? 200 : 250;
      
      let wordCount = 0;
      if (language === 'zh') {
        const chineseChars = content.match(/[\u4e00-\u9fff]/g) || [];
        const englishWords = content.match(/[a-zA-Z]+/g) || [];
        wordCount = chineseChars.length + (englishWords.length * 1.5);
      } else {
        wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      }

      const readingTimeMinutes = Math.max(wordCount / wpm, 1);
      const totalMinutes = Math.ceil(readingTimeMinutes);
      const totalSeconds = Math.ceil(readingTimeMinutes * 60);

      const generateTimeText = (minutes: number): string => {
        if (minutes === 1) return '1 分钟';
        if (minutes < 60) return `${minutes} 分钟`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes === 0 ? `${hours} 小时` : `${hours} 小时 ${remainingMinutes} 分钟`;
      };

      const generateEstimatedTime = (minutes: number): string => {
        if (minutes <= 1) return '不到 1 分钟';
        if (minutes <= 3) return '约 2-3 分钟';
        if (minutes <= 5) return '约 5 分钟';
        if (minutes <= 10) return '约 5-10 分钟';
        if (minutes <= 15) return '约 10-15 分钟';
        if (minutes <= 30) return '约 15-30 分钟';
        return '约 30 分钟以上';
      };

      return {
        minutes: totalMinutes,
        seconds: totalSeconds,
        words: Math.round(wordCount),
        text: generateTimeText(totalMinutes),
        estimatedTime: generateEstimatedTime(totalMinutes)
      };
    });
  }, [contents, options]);
}

// 导出类型
export type { ReadingTimeOptions, ReadingTimeResult };