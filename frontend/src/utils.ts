import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 类名合并工具
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化日期
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '未知日期';
  }
  
  // 处理Go的零值时间
  if (dateString === '0001-01-01T00:00:00Z' || dateString === '1970-01-01T00:00:00Z') {
    return '未知日期';
  }
  
  // 处理可能的时间字符串格式
  let dateToFormat = dateString;
  
  // 如果是数字格式（时间戳），转换为标准格式
  if (/^\d+$/.test(dateString)) {
    dateToFormat = new Date(parseInt(dateString)).toISOString();
  }
  
  const date = new Date(dateToFormat);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return '无效日期';
  }
  
  // 检查是否是合理的日期（不早于2000年）
  if (date.getFullYear() < 2000) {
    return '未知日期';
  }
  
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// 格式化简单日期
export function formatSimpleDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '未知日期';
  }
  
  // 处理Go的零值时间
  if (dateString === '0001-01-01T00:00:00Z' || dateString === '1970-01-01T00:00:00Z') {
    return '未知日期';
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return '无效日期';
  }
  
  // 检查是否是合理的日期（不早于2000年）
  if (date.getFullYear() < 2000) {
    return '未知日期';
  }
  
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// 格式化阅读时间
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return '< 1 分钟';
  }
  return `${Math.round(minutes)} 分钟`;
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(null, args);
    }, wait);
  }) as T;
}

// 构建查询字符串
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
}

// 截取文本
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

// 生成slug
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化数字
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 生成随机字符串
export function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

// 检查是否是有效的邮箱
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 检查是否是有效的URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      copy[key as keyof T] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  
  return obj;
}