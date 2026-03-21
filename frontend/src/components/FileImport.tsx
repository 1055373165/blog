import { useState, useCallback } from 'react';
import { uploadApi } from '../api';

const MAX_TEXT_FILE_SIZE = 5 * 1024 * 1024;
const MASK_TOKEN_PREFIX = '__FILE_IMPORT_MASK__';

type DirectoryFile = File;

interface MarkdownMask {
  maskedContent: string;
  placeholders: Map<string, string>;
}

interface LocalImageReference {
  originalPath: string;
  resolvedPath: string | null;
}

interface MarkdownImageMatch {
  fullMatch: string;
  rawDestination: string;
  start: number;
  end: number;
}

type ImportMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ImportMetadataValue[]
  | { [key: string]: ImportMetadataValue };

type ImportMetadata = Record<string, ImportMetadataValue>;

interface ParsedImportData {
  content: string;
  metadata?: ImportMetadata;
}

const normalizePathSeparators = (input: string): string => input.replace(/\\/g, '/');

const decodePathSafely = (input: string): string => {
  try {
    return decodeURI(input);
  } catch {
    return input;
  }
};

const normalizeRelativePath = (input: string): string => {
  const normalized = decodePathSafely(normalizePathSeparators(input.trim()));
  const segments = normalized.split('/');
  const resolvedSegments: string[] = [];

  segments.forEach(segment => {
    if (!segment || segment === '.') {
      return;
    }

    if (segment === '..') {
      if (resolvedSegments.length > 0 && resolvedSegments[resolvedSegments.length - 1] !== '..') {
        resolvedSegments.pop();
      } else {
        resolvedSegments.push(segment);
      }
      return;
    }

    resolvedSegments.push(segment);
  });

  return resolvedSegments.join('/');
};

const splitPathSegments = (input: string): string[] =>
  normalizePathSeparators(input)
    .split('/')
    .filter(Boolean);

const getDirectoryName = (input: string): string => {
  const normalized = normalizeRelativePath(input);
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex >= 0 ? normalized.slice(0, lastSlashIndex) : '';
};

const stripQueryAndHash = (input: string): string => input.split(/[?#]/, 1)[0];

const unwrapMarkdownPath = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const isSkippableImageSource = (input: string): boolean => {
  const trimmed = input.trim();
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(trimmed);
};

const getFileRelativePath = (file: DirectoryFile): string =>
  normalizeRelativePath(file.webkitRelativePath || file.name);

const isHiddenOrSystemPath = (input: string): boolean => {
  const segments = splitPathSegments(input);
  return segments.some(segment =>
    segment === '__MACOSX' ||
    segment === '.DS_Store' ||
    (segment.startsWith('.') && segment !== '.' && segment !== '..')
  );
};

const isMarkdownFile = (file: DirectoryFile): boolean => file.name.toLowerCase().endsWith('.md');

const isImportMetadataRecord = (value: unknown): value is ImportMetadata =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const findClosingBracket = (
  content: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): number => {
  let depth = 0;

  for (let index = openIndex; index < content.length; index += 1) {
    const currentChar = content[index];

    if (currentChar === '\\') {
      index += 1;
      continue;
    }

    if (currentChar === openChar) {
      depth += 1;
      continue;
    }

    if (currentChar === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const skipInlineWhitespace = (content: string, startIndex: number): number => {
  let nextIndex = startIndex;

  while (nextIndex < content.length && /[ \t]/.test(content[nextIndex])) {
    nextIndex += 1;
  }

  return nextIndex;
};

const findMarkdownDestinationEnd = (content: string, openParenIndex: number): number => {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inAngleBrackets = false;

  for (let index = openParenIndex; index < content.length; index += 1) {
    const currentChar = content[index];

    if (currentChar === '\\') {
      index += 1;
      continue;
    }

    if (currentChar === '\n') {
      return -1;
    }

    if (inSingleQuote) {
      if (currentChar === '\'') {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (currentChar === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inAngleBrackets) {
      if (currentChar === '>') {
        inAngleBrackets = false;
      }
      continue;
    }

    if (currentChar === '\'') {
      inSingleQuote = true;
      continue;
    }

    if (currentChar === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (currentChar === '<') {
      inAngleBrackets = true;
      continue;
    }

    if (currentChar === '(') {
      depth += 1;
      continue;
    }

    if (currentChar === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const findMarkdownImageMatches = (content: string): MarkdownImageMatch[] => {
  const matches: MarkdownImageMatch[] = [];
  let searchIndex = 0;

  while (searchIndex < content.length) {
    const imageStart = content.indexOf('![', searchIndex);

    if (imageStart === -1) {
      break;
    }

    const altOpenIndex = imageStart + 1;
    const altCloseIndex = findClosingBracket(content, altOpenIndex, '[', ']');

    if (altCloseIndex === -1) {
      searchIndex = imageStart + 2;
      continue;
    }

    const parenOpenIndex = skipInlineWhitespace(content, altCloseIndex + 1);
    if (content[parenOpenIndex] !== '(') {
      searchIndex = altCloseIndex + 1;
      continue;
    }

    const parenCloseIndex = findMarkdownDestinationEnd(content, parenOpenIndex);
    if (parenCloseIndex === -1) {
      searchIndex = parenOpenIndex + 1;
      continue;
    }

    matches.push({
      fullMatch: content.slice(imageStart, parenCloseIndex + 1),
      rawDestination: content.slice(parenOpenIndex + 1, parenCloseIndex),
      start: imageStart,
      end: parenCloseIndex + 1,
    });

    searchIndex = parenCloseIndex + 1;
  }

  return matches;
};

const replaceMarkdownImageMatches = (
  content: string,
  replacer: (match: MarkdownImageMatch) => string
): string => {
  const matches = findMarkdownImageMatches(content);

  if (matches.length === 0) {
    return content;
  }

  let updatedContent = '';
  let lastIndex = 0;

  matches.forEach(match => {
    updatedContent += content.slice(lastIndex, match.start);
    updatedContent += replacer(match);
    lastIndex = match.end;
  });

  updatedContent += content.slice(lastIndex);

  return updatedContent;
};

const parseMarkdownImageDestination = (rawDestination: string): { path: string; start: number; end: number } | null => {
  const leadingWhitespaceLength = rawDestination.match(/^\s*/)?.[0].length ?? 0;
  const trimmed = rawDestination.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('<')) {
    const closingIndex = trimmed.indexOf('>');
    if (closingIndex <= 0) {
      return null;
    }

    return {
      path: trimmed.slice(1, closingIndex),
      start: leadingWhitespaceLength + 1,
      end: leadingWhitespaceLength + closingIndex,
    };
  }

  const pathMatch = trimmed.match(/^(\S+)/);
  if (!pathMatch) {
    return null;
  }

  return {
    path: pathMatch[1],
    start: leadingWhitespaceLength,
    end: leadingWhitespaceLength + pathMatch[1].length,
  };
};

const maskMarkdownCodeSections = (content: string): MarkdownMask => {
  const placeholders = new Map<string, string>();
  let maskedContent = content;

  const addMask = (match: string): string => {
    const token = `${MASK_TOKEN_PREFIX}${placeholders.size}__`;
    placeholders.set(token, match);
    return token;
  };

  maskedContent = maskedContent.replace(
    /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[^\n]*(?=\n|$)/g,
    match => addMask(match)
  );

  maskedContent = maskedContent.replace(/`[^`\n]*`/g, match => addMask(match));

  return { maskedContent, placeholders };
};

const restoreMaskedMarkdown = (content: string, placeholders: Map<string, string>): string => {
  let restoredContent = content;

  placeholders.forEach((originalContent, token) => {
    restoredContent = restoredContent.split(token).join(originalContent);
  });

  return restoredContent;
};

const resolveLocalImagePath = (
  markdownDirectory: string,
  folderRoot: string,
  rawPath: string
): string | null => {
  const cleanedPath = decodePathSafely(
    normalizePathSeparators(stripQueryAndHash(unwrapMarkdownPath(rawPath)))
  );

  if (!cleanedPath || isSkippableImageSource(cleanedPath)) {
    return null;
  }

  const baseSegments = splitPathSegments(markdownDirectory);
  const rootSegments = splitPathSegments(folderRoot);
  const resolvedSegments = [...baseSegments];
  let escapedRoot = false;

  splitPathSegments(cleanedPath).forEach(segment => {
    if (segment === '.') {
      return;
    }

    if (segment === '..') {
      if (resolvedSegments.length > rootSegments.length) {
        resolvedSegments.pop();
      } else {
        escapedRoot = true;
      }
      return;
    }

    resolvedSegments.push(segment);
  });

  if (escapedRoot) {
    return null;
  }

  return resolvedSegments.join('/');
};

const collectLocalImageReferences = (
  markdown: string,
  markdownDirectory: string,
  folderRoot: string
): LocalImageReference[] => {
  const { maskedContent } = maskMarkdownCodeSections(markdown);
  const references: LocalImageReference[] = [];
  const htmlImagePattern = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

  findMarkdownImageMatches(maskedContent).forEach(markdownMatch => {
    const parsedDestination = parseMarkdownImageDestination(markdownMatch.rawDestination);
    if (!parsedDestination || isSkippableImageSource(parsedDestination.path)) {
      return;
    }

    references.push({
      originalPath: parsedDestination.path,
      resolvedPath: resolveLocalImagePath(markdownDirectory, folderRoot, parsedDestination.path),
    });
  });

  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlImagePattern.exec(maskedContent)) !== null) {
    if (isSkippableImageSource(htmlMatch[2])) {
      continue;
    }

    references.push({
      originalPath: htmlMatch[2],
      resolvedPath: resolveLocalImagePath(markdownDirectory, folderRoot, htmlMatch[2]),
    });
  }

  return references;
};

const rewriteMarkdownImagePaths = (
  markdown: string,
  markdownDirectory: string,
  folderRoot: string,
  uploadedAssets: Map<string, string>
): string => {
  const { maskedContent, placeholders } = maskMarkdownCodeSections(markdown);
  const htmlImagePattern = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;

  const updatedMarkdown = replaceMarkdownImageMatches(maskedContent, (match) => {
    const parsedDestination = parseMarkdownImageDestination(match.rawDestination);
    if (!parsedDestination || isSkippableImageSource(parsedDestination.path)) {
      return match.fullMatch;
    }

    const resolvedPath = resolveLocalImagePath(markdownDirectory, folderRoot, parsedDestination.path);
    if (!resolvedPath) {
      return match.fullMatch;
    }

    const uploadedUrl = uploadedAssets.get(resolvedPath);
    if (!uploadedUrl) {
      return match.fullMatch;
    }

    const nextDestination =
      match.rawDestination.slice(0, parsedDestination.start) +
      uploadedUrl +
      match.rawDestination.slice(parsedDestination.end);

    return match.fullMatch.replace(match.rawDestination, nextDestination);
  });

  const updatedHtml = updatedMarkdown.replace(htmlImagePattern, (fullMatch, quote: string, src: string) => {
    if (isSkippableImageSource(src)) {
      return fullMatch;
    }

    const resolvedPath = resolveLocalImagePath(markdownDirectory, folderRoot, src);
    if (!resolvedPath) {
      return fullMatch;
    }

    const uploadedUrl = uploadedAssets.get(resolvedPath);
    if (!uploadedUrl) {
      return fullMatch;
    }

    return fullMatch.replace(`${quote}${src}${quote}`, `${quote}${uploadedUrl}${quote}`);
  });

  return restoreMaskedMarkdown(updatedHtml, placeholders);
};

interface FileImportProps {
  onFileImport: (content: string, metadata?: ImportMetadata) => void;
  onError?: (error: string) => void;
  accept?: string;
  className?: string;
}

interface ImportedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  metadata?: ImportMetadata;
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

  const parseMarkdownFile = (content: string): ParsedImportData => {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontMatterMatch) {
      try {
        const frontMatter = frontMatterMatch[1];
        const bodyContent = frontMatterMatch[2];
        
        const metadata: ImportMetadata = {};
        frontMatter.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length) {
            const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
            metadata[key.trim()] = value;
          }
        });
        
        return { content: bodyContent.trim(), metadata };
      } catch {
        return { content };
      }
    }
    
    return { content };
  };

  const parseJsonFile = (content: string): ParsedImportData => {
    try {
      const data = JSON.parse(content) as unknown;
      
      if (Array.isArray(data)) {
        return {
          content: data.map(item => 
            typeof item === 'string' ? item : JSON.stringify(item, null, 2)
          ).join('\n\n'),
          metadata: { importType: 'json', itemCount: data.length }
        };
      }
      
      if (isImportMetadataRecord(data) && (
        typeof data.content === 'string' ||
        typeof data.body === 'string' ||
        typeof data.text === 'string'
      )) {
        return {
          content: (data.content as string | undefined) || (data.body as string | undefined) || (data.text as string | undefined) || '',
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
    } catch {
      throw new Error('Invalid JSON format');
    }
  };

  const parseCsvFile = (content: string): ParsedImportData => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^['"]|['"]$/g, ''));
    const rows = lines.slice(1);
    
    const articles: Array<Record<string, string>> = rows.map(row => {
      const values = row.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      const item: Record<string, string> = {};
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

  const readFileAsText = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const processFile = useCallback(async (file: File): Promise<ImportedFile> => {
    try {
      const content = await readFileAsText(file);
      const lowerCaseFileName = file.name.toLowerCase();
      let processedData: ParsedImportData;

      if (lowerCaseFileName.endsWith('.md') || file.type === 'text/markdown') {
        processedData = parseMarkdownFile(content);
      } else if (lowerCaseFileName.endsWith('.json') || file.type === 'application/json') {
        processedData = parseJsonFile(content);
      } else if (lowerCaseFileName.endsWith('.csv') || file.type === 'text/csv') {
        processedData = parseCsvFile(content);
      } else {
        processedData = { content };
      }

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        content: processedData.content,
        metadata: processedData.metadata,
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error('Unknown error processing file');
    }
  }, [readFileAsText]);

  const isAllowedSingleFile = useCallback((file: File): boolean => {
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    return allowedTypes.some(type =>
      type === fileExtension ||
      type === file.type ||
      (type === '.txt' && file.type === 'text/plain') ||
      (type === '.md' && (file.type === 'text/markdown' || file.type === 'text/plain'))
    );
  }, [accept]);

  const uploadReferencedImages = useCallback(async (
    assetPaths: string[],
    fileMap: Map<string, DirectoryFile>
  ): Promise<Map<string, string>> => {
    const uploadedAssets = new Map<string, string>();

    if (assetPaths.length === 0) {
      return uploadedAssets;
    }

    for (let index = 0; index < assetPaths.length; index += 1) {
      const assetPath = assetPaths[index];
      const assetFile = fileMap.get(assetPath);

      if (!assetFile) {
        throw new Error(`Markdown 引用了缺失的资源文件: ${assetPath}`);
      }

      try {
        const response = await uploadApi.uploadImage(assetFile, (fileProgress) => {
          const progress = 30 + ((index + fileProgress / 100) / assetPaths.length) * 60;
          setUploadProgress(Math.min(90, Math.max(30, Math.round(progress))));
        });

        const uploadedUrl = response.data?.url;
        if (!uploadedUrl) {
          throw new Error('上传接口未返回可用 URL');
        }

        uploadedAssets.set(assetPath, uploadedUrl);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        throw new Error(`资源上传失败: ${assetFile.name} (${errorMessage})`);
      }
    }

    return uploadedAssets;
  }, []);

  const processFolderImport = useCallback(async (files: DirectoryFile[]): Promise<ImportedFile> => {
    const visibleFiles = files.filter(file => !isHiddenOrSystemPath(getFileRelativePath(file)));

    if (visibleFiles.length === 0) {
      throw new Error('所选文件夹中没有可导入的文件');
    }

    const markdownFiles = visibleFiles.filter(isMarkdownFile);

    if (markdownFiles.length === 0) {
      throw new Error('所选文件夹中未找到 markdown 文件');
    }

    if (markdownFiles.length > 1) {
      throw new Error('所选文件夹中存在多个 markdown 文件，请保留且仅保留一个');
    }

    const markdownFile = markdownFiles[0];
    const markdownPath = getFileRelativePath(markdownFile);
    const folderRoot = splitPathSegments(markdownPath)[0];

    if (!folderRoot) {
      throw new Error('无法识别文件夹结构，请使用“选择文件夹”功能导入');
    }

    if (markdownFile.size > MAX_TEXT_FILE_SIZE) {
      throw new Error('Markdown 文件大小必须小于 5MB');
    }

    setUploadProgress(15);

    const importedMarkdown = await processFile(markdownFile);
    const markdownDirectory = getDirectoryName(markdownPath);
    const localImageReferences = collectLocalImageReferences(
      importedMarkdown.content,
      markdownDirectory,
      folderRoot
    );

    const invalidReference = localImageReferences.find(reference => !reference.resolvedPath);
    if (invalidReference) {
      throw new Error(`图片引用超出了所选文件夹范围: ${invalidReference.originalPath}`);
    }

    const referencedAssetPaths = Array.from(
      new Set(localImageReferences.map(reference => reference.resolvedPath).filter(Boolean))
    ) as string[];

    const fileMap = new Map<string, DirectoryFile>();
    visibleFiles.forEach(file => {
      fileMap.set(getFileRelativePath(file), file);
    });

    const missingAssetPath = referencedAssetPaths.find(assetPath => !fileMap.has(assetPath));
    if (missingAssetPath) {
      throw new Error(`Markdown 引用了缺失的资源文件: ${missingAssetPath}`);
    }

    setUploadProgress(referencedAssetPaths.length > 0 ? 30 : 85);

    const uploadedAssets = await uploadReferencedImages(referencedAssetPaths, fileMap);
    const rewrittenContent = rewriteMarkdownImagePaths(
      importedMarkdown.content,
      markdownDirectory,
      folderRoot,
      uploadedAssets
    );

    return {
      ...importedMarkdown,
      name: markdownFile.name,
      size: markdownFile.size,
      type: markdownFile.type,
      content: rewrittenContent,
      metadata: {
        ...importedMarkdown.metadata,
        importType: 'folder',
        assetCount: referencedAssetPaths.length,
        markdownFileName: markdownFile.name,
      },
    };
  }, [processFile, uploadReferencedImages]);

  const handleFiles = useCallback(async (files: DirectoryFile[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const hasDirectoryStructure = files.some(file => getFileRelativePath(file).includes('/'));
      let importedFile: ImportedFile;

      if (hasDirectoryStructure) {
        importedFile = await processFolderImport(files);
      } else {
        if (files.length > 1) {
          throw new Error('请选择单个文件，或使用“选择文件夹”导入目录内容');
        }

        const file = files[0];

        if (file.size > MAX_TEXT_FILE_SIZE) {
          throw new Error('File size must be less than 5MB');
        }

        if (!isAllowedSingleFile(file)) {
          throw new Error(`File type not supported. Allowed types: ${accept}`);
        }

        setUploadProgress(30);
        importedFile = await processFile(file);
      }

      setUploadProgress(95);
      
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
  }, [accept, isAllowedSingleFile, onFileImport, onError, processFile, processFolderImport]);

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
    
    const files = Array.from(e.dataTransfer.files) as DirectoryFile[];
    void handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as DirectoryFile[];
    if (files.length > 0) {
      void handleFiles(files);
    }
    e.target.value = '';
  }, [handleFiles]);

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as DirectoryFile[];
    if (files.length > 0) {
      void handleFiles(files);
    }
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div className={`file-import ${className}`}>
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={isUploading}
        id="file-import-single-input"
      />
      <input
        type="file"
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory=""
        multiple
        onChange={handleFolderInput}
        className="hidden"
        disabled={isUploading}
        id="file-import-folder-input"
      />

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
                拖拽文件或文件夹到此处导入
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                或选择单个文件 / 整个文件夹
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <label
                htmlFor="file-import-single-input"
                className="inline-flex cursor-pointer items-center rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
              >
                选择文件
              </label>
              <label
                htmlFor="file-import-folder-input"
                className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                选择文件夹
              </label>
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
              <p className="mt-2">文件夹导入需包含 1 个 markdown 文件，可选 assets 资源目录</p>
              <p>单个导入文档最大 5MB，资源文件按上传接口限制处理</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
