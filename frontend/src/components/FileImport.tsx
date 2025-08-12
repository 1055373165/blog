import { useState, useCallback } from 'react';

interface FileImportProps {
  onFileImport: (content: string, metadata?: any) => void;
  onError?: (error: string) => void;
  accept?: string;
  className?: string;
}

interface ImportedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  metadata?: any;
}

export default function FileImport({
  onFileImport,
  onError,
  accept = '.md,.txt,.json,.csv',
  className = '',
}: FileImportProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const parseMarkdownFile = (content: string): { content: string; metadata?: any } => {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontMatterMatch) {
      try {
        const frontMatter = frontMatterMatch[1];
        const bodyContent = frontMatterMatch[2];
        
        const metadata: any = {};
        frontMatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
            metadata[key.trim()] = value;
          }
        });
        
        return { content: bodyContent.trim(), metadata };
      } catch (error) {
        return { content };
      }
    }
    
    return { content };
  };

  const parseJsonFile = (content: string): { content: string; metadata?: any } => {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return {
          content: data.map(item => 
            typeof item === 'string' ? item : JSON.stringify(item, null, 2)
          ).join('\n\n'),
          metadata: { importType: 'json', itemCount: data.length }
        };
      }
      
      if (data.content || data.body || data.text) {
        return {
          content: data.content || data.body || data.text,
          metadata: {
            ...data,
            content: undefined,
            body: undefined,
            text: undefined,
            importType: 'json'
          }
        };
      }
      
      return {
        content: JSON.stringify(data, null, 2),
        metadata: { importType: 'json' }
      };
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const parseCsvFile = (content: string): { content: string; metadata?: any } => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^['"]|['"]$/g, ''));
    const rows = lines.slice(1);
    
    const articles = rows.map(row => {
      const values = row.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      const item: any = {};
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      return item;
    });
    
    let markdownContent = '';
    
    if (articles.length === 1 && articles[0].title && (articles[0].content || articles[0].body)) {
      const article = articles[0];
      markdownContent = `# ${article.title}\n\n${article.content || article.body}`;
      return {
        content: markdownContent,
        metadata: {
          ...article,
          title: undefined,
          content: undefined,
          body: undefined,
          importType: 'csv'
        }
      };
    }
    
    markdownContent = articles.map(item => {
      const title = item.title || item.name || 'Untitled';
      const body = item.content || item.body || item.description || 'No content';
      return `# ${title}\n\n${body}\n\n---\n`;
    }).join('\n');
    
    return {
      content: markdownContent,
      metadata: { importType: 'csv', itemCount: articles.length }
    };
  };

  const processFile = useCallback(async (file: File): Promise<ImportedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let processedData: { content: string; metadata?: any };
          
          if (file.name.endsWith('.md') || file.type === 'text/markdown') {
            processedData = parseMarkdownFile(content);
          } else if (file.name.endsWith('.json') || file.type === 'application/json') {
            processedData = parseJsonFile(content);
          } else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
            processedData = parseCsvFile(content);
          } else {
            processedData = { content };
          }
          
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            content: processedData.content,
            metadata: processedData.metadata,
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Unknown error processing file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const file = files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      
      const allowedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.some(type => 
        type === fileExtension || 
        type === file.type ||
        (type === '.txt' && file.type === 'text/plain') ||
        (type === '.md' && (file.type === 'text/markdown' || file.type === 'text/plain'))
      )) {
        throw new Error(`File type not supported. Allowed types: ${accept}`);
      }
      
      setUploadProgress(30);
      
      const importedFile = await processFile(file);
      setUploadProgress(80);
      
      onFileImport(importedFile.content, {
        fileName: importedFile.name,
        fileSize: importedFile.size,
        fileType: importedFile.type,
        ...importedFile.metadata,
      });
      
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMessage);
    }
  }, [accept, onFileImport, onError, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  return (
    <div className={`file-import ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                正在处理文件...
              </p>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {uploadProgress}%
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                />
              </svg>
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                拖拽文件到此处导入
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                或点击选择文件
              </p>
            </div>
            
            <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
              <p>支持的文件格式：</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                  .md
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                  .txt
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                  .json
                </span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                  .csv
                </span>
              </div>
              <p className="mt-2">最大文件大小：5MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}