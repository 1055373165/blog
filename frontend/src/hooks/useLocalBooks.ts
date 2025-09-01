import { useState, useEffect, useCallback } from 'react';
import { Book } from '../api/books';

/**
 * 本地书籍数据生成函数
 * 根据文件名生成书籍信息，避免API依赖
 */
const generateLocalBookInfo = (filename: string): Omit<Book, 'created_at'> & { created_at: string } => {
  const name = filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  
  // 生成唯一ID
  const id = name.length >= 8 ? name.slice(0, 8) : name;
  
  // 根据文件名生成标题和描述
  let title = name.replace(/[_-]/g, ' ');
  let description = 'Go语言技术读物，助力编程技能提升';
  let detailed_description = '这是一本精心挑选的Go语言技术读物，内容丰富实用，能够帮助开发者提升编程技能。';
  let category = '技术读物';
  let difficulty = 'intermediate';
  let author = '技术专家';
  let tags = ['Go语言', '技术学习', '编程'];
  
  // 特殊书籍的定制信息
  if (name.includes('100') && name.includes('错误')) {
    title = '100 个 Go 语言典型错误';
    description = 'Go语言开发中常见错误与最佳实践指南';
    detailed_description = '这是一本专门针对Go语言开发中常见错误的实战指南。通过总结100个典型错误，帮助开发者避免常见的坑，提升代码质量。';
    category = '最佳实践';
    tags = ['错误处理', '最佳实践', '调试'];
  } else if (name.includes('Web') && name.includes('编程')) {
    title = 'Go Web 编程';
    description = '使用Go语言构建现代Web应用的完整指南';
    detailed_description = '全面介绍如何使用Go语言开发Web应用程序的权威指南。从HTTP基础到高级Web框架，涵盖了Web开发的各个方面。';
    category = 'Web开发';
    tags = ['Web开发', 'HTTP', 'API'];
  } else if (name.includes('并发')) {
    title = '深入理解 Go 并发编程';
    description = 'Go语言并发编程的深度解析';
    detailed_description = '深入浅出地讲解Go语言的并发编程模型，包括goroutine、channel等核心概念的实战应用。';
    category = '并发编程';
    difficulty = 'advanced';
    tags = ['并发', 'goroutine', 'channel'];
  } else if (name.includes('高性能') || name.includes('性能')) {
    title = name.includes('高性能') ? '使用 Go 实践高性能' : '高性能 Go 编程';
    description = 'Go语言高性能编程技巧与实践';
    detailed_description = '深入探讨Go语言的性能优化技巧，包括内存管理、并发优化、性能分析等方面的最佳实践。';
    category = '性能优化';
    difficulty = 'advanced';
    tags = ['性能优化', '内存管理', '性能分析'];
  } else if (name.includes('测试')) {
    title = '使用测试学习 Go';
    description = '通过测试驱动的方式学习Go语言';
    detailed_description = '采用测试驱动开发的方式学习Go语言，让你在编写测试的过程中掌握语言特性。';
    category = '测试';
    tags = ['测试', 'TDD', '单元测试'];
  }
  
  return {
    id,
    filename,
    title,
    description,
    detailed_description,
    category,
    difficulty,
    tags,
    author,
    url: `/books/${filename}`, // 直接使用本地路径
    created_at: new Date().toISOString(),
  };
};

/**
 * 预定义的书籍文件名列表（可以通过扫描目录或配置文件获取）
 */
const BOOK_FILENAMES = [
  '超越高效 Go 的第 1 部分：实现高性能代码.png',
  '在 Go 中应用 TDD.jpg',
  '使用 Go 实践高性能.jpg',
  '使用 Go 构建调度器.jpg',
  '深入理解 Go 并发编程（鸟窝老师）.jpg',
  '更高效的 Go .png',
  '使用测试学习 Go.jpg',
  '使用 Golang 实践软件工程.jpg',
  '高级 Golang 编程方式.jpg',
];

export interface UseLocalBooksReturn {
  books: Book[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  hasBooks: boolean;
  totalBooks: number;
}

/**
 * 本地书籍数据管理Hook
 * 直接生成书籍数据而无需API调用，优化性能
 */
export const useLocalBooks = (): UseLocalBooksReturn => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateBooks = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('生成本地书籍数据...');
      
      const localBooks = BOOK_FILENAMES.map(filename => ({
        ...generateLocalBookInfo(filename),
        created_at: new Date().toISOString(),
      }));
      
      // 按文件名排序以保持一致性
      localBooks.sort((a, b) => a.filename.localeCompare(b.filename));
      
      setBooks(localBooks);
      console.log(`本地生成 ${localBooks.length} 本书籍`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成本地书籍数据失败';
      console.error('生成本地书籍数据失败:', err);
      setError(errorMessage);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    generateBooks();
  }, [generateBooks]);

  useEffect(() => {
    generateBooks();
  }, [generateBooks]);

  return {
    books,
    loading,
    error,
    refresh,
    hasBooks: books.length > 0,
    totalBooks: books.length,
  };
};

/**
 * 轮播组件专用的本地书籍Hook
 */
export const useLocalBooksForCarousel = (): UseLocalBooksReturn => {
  return useLocalBooks();
};