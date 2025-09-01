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
    title = title; // 保持原有标题
    description = 'Go语言并发编程的深度解析';
    detailed_description = '深入浅出地讲解Go语言的并发编程模型，包括goroutine、channel等核心概念的实战应用。';
    category = '并发编程';
    difficulty = 'advanced';
    tags = ['并发', 'goroutine', 'channel'];
  } else if (name.includes('高性能') || name.includes('性能')) {
    title = title; // 保持原有标题
    description = 'Go语言高性能编程技巧与实践';
    detailed_description = '深入探讨Go语言的性能优化技巧，包括内存管理、并发优化、性能分析等方面的最佳实践。';
    category = '性能优化';
    difficulty = 'advanced';
    tags = ['性能优化', '内存管理', '性能分析'];
  } else if (name.includes('测试') || name.includes('TDD')) {
    title = title; // 保持原有标题
    description = '通过测试驱动的方式学习Go语言';
    detailed_description = '采用测试驱动开发的方式学习Go语言，让你在编写测试的过程中掌握语言特性。';
    category = '测试';
    tags = ['测试', 'TDD', '单元测试'];
  } else if (name.includes('重构')) {
    title = '重构（改善既有代码的设计）';
    description = '代码重构的经典指南';
    detailed_description = '一本关于如何改善既有代码设计的经典著作，提供了系统化的重构方法和技巧。';
    category = '软件工程';
    tags = ['重构', '代码质量', '软件工程'];
  } else if (name.includes('设计模式')) {
    title = 'Head First 设计模式（第二版）';
    description = '深入浅出设计模式';
    detailed_description = '以生动有趣的方式讲解软件设计模式，帮助开发者掌握面向对象设计的精髓。';
    category = '设计模式';
    tags = ['设计模式', '面向对象', 'OOP'];
  } else if (name.includes('计算机系统') || name.includes('神书')) {
    title = '深入理解计算机系统（神书）';
    description = '计算机系统的权威指南';
    detailed_description = '被誉为计算机科学经典教材，深入浅出地介绍了计算机系统的各个层面，是程序员必读的经典。';
    category = '计算机基础';
    difficulty = 'advanced';
    tags = ['计算机系统', '底层原理', '经典教材'];
  } else if (name.includes('操作系统')) {
    title = '操作系统导论';
    description = '操作系统原理与实践';
    detailed_description = '系统性地介绍操作系统的基本原理和实现技术，是学习操作系统的优秀教材。';
    category = '操作系统';
    tags = ['操作系统', '系统编程', '底层开发'];
  } else if (name.includes('网络编程') || name.includes('网络')) {
    title = title; // 保持原有标题
    description = '网络编程技术与实践';
    detailed_description = '深入讲解网络编程的核心概念和实践技巧，是网络开发的权威指南。';
    category = '网络编程';
    difficulty = 'advanced';
    tags = ['网络编程', '套接字', 'TCP/IP'];
  } else if (name.includes('Linux') || name.includes('Unix') || name.includes('UNIX')) {
    title = title; // 保持原有标题
    description = 'Linux/Unix系统编程指南';
    detailed_description = '全面介绍Linux/Unix系统编程的核心技术和最佳实践。';
    category = '系统编程';
    tags = ['Linux', 'Unix', '系统编程'];
  } else if (name.includes('代码整洁')) {
    title = '代码整洁之道';
    description = '编写优雅代码的艺术';
    detailed_description = '教授如何编写干净、可读、可维护的代码的经典著作，是每个程序员都应该阅读的书籍。';
    category = '代码质量';
    tags = ['代码质量', '最佳实践', '软件工程'];
  } else if (name.includes('函数式')) {
    title = 'Go 中的函数式编程';
    description = 'Go语言函数式编程技巧';
    detailed_description = '探索在Go语言中应用函数式编程范式的方法和技巧。';
    category = '编程范式';
    tags = ['函数式编程', '编程范式', 'Go进阶'];
  } else if (name.includes('领域模型') || name.includes('商业软件')) {
    title = 'Go 领域模型-使用Go构建现代商业软件';
    description = '领域驱动设计在Go中的实践';
    detailed_description = '介绍如何在Go语言中实现领域驱动设计，构建高质量的商业软件。';
    category = '软件架构';
    difficulty = 'advanced';
    tags = ['DDD', '领域模型', '软件架构'];
  } else if (name.includes('调度器')) {
    title = '使用 Go 构建调度器';
    description = 'Go语言调度器设计与实现';
    detailed_description = '深入探讨Go语言调度器的设计原理和实现细节。';
    category = '系统设计';
    difficulty = 'advanced';
    tags = ['调度器', '并发', '系统设计'];
  } else if (name.includes('软件工程')) {
    title = '使用 Golang 实践软件工程';
    description = 'Go语言软件工程最佳实践';
    detailed_description = '结合Go语言特性，介绍软件工程的最佳实践和方法论。';
    category = '软件工程';
    tags = ['软件工程', '最佳实践', 'Go实践'];
  } else if (name.includes('进程') && name.includes('内存')) {
    title = '深入理解 Linux 进程与内存';
    description = 'Linux系统进程与内存管理';
    detailed_description = '深入剖析Linux系统中进程管理和内存管理的核心机制。';
    category = 'Linux系统';
    difficulty = 'advanced';
    tags = ['Linux', '进程管理', '内存管理'];
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
 * 完整的书籍文件名列表（包含所有books目录下的图片文件）
 */
const BOOK_FILENAMES = [
  '100 个 Go 语言典型错误.jpg',
  'Go Web 编程.jpg',
  'Go 中的函数式编程.jpg',
  'Go 并发-开发者的工具和技术.jpg',
  'Go 领域模型-使用Go构建现代商业软件.jpg',
  'Go 高效并发.jpg',
  'Head First 设计模式（第二版）.jpg',
  'Linux:Unix系统编程.jpg',
  'UNIX 编程艺术.jpg',
  'UNIX网络编程卷 1：套接字联网 API.jpg',
  '代码整洁之道.jpg',
  '使用 Go 实践高性能.jpg',
  '使用 Go 构建调度器.jpg',
  '使用 Golang 实践软件工程.jpg',
  '使用测试学习 Go.jpg',
  '在 Go 中应用 TDD.jpg',
  '更高效的 Go .png',
  '操作系统导论.jpg',
  '深入理解 Go 并发编程（鸟窝老师）.jpg',
  '深入理解 Linux 网络（彦飞老师）.jpg',
  '深入理解 Linux 进程与内存（彦飞老师）.jpg',
  '深入理解计算机系统（神书）.jpg',
  '超越高效 Go 的第 1 部分：实现高性能代码.png',
  '超越高效Go第2部分：追求高质量代码.jpg',
  '重构（改善既有代码的设计）.jpg',
  '高级 Golang 编程方式.jpg'
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