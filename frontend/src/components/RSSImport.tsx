import { useState } from 'react';

interface RSSImportProps {
  onArticlesImport: (articles: Array<{
    title: string;
    content: string;
    excerpt: string;
    publishedAt?: string;
    author?: string;
    tags?: string[];
    link?: string;
  }>) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface RSSItem {
  title: string;
  description: string;
  content?: string;
  pubDate?: string;
  author?: string;
  category?: string[];
  link?: string;
  guid?: string;
}

export default function RSSImport({
  onArticlesImport,
  onError,
  className = '',
}: RSSImportProps) {
  const [rssUrl, setRssUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<RSSItem[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const parseRSSContent = (xmlContent: string): RSSItem[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML/RSS format');
    }
    
    const items = doc.querySelectorAll('item');
    const articles: RSSItem[] = [];
    
    items.forEach(item => {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const content = item.querySelector('content\\:encoded, content')?.textContent?.trim() || description;
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      const author = item.querySelector('author, dc\\:creator')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const guid = item.querySelector('guid')?.textContent?.trim() || '';
      
      const categories: string[] = [];
      const categoryElements = item.querySelectorAll('category');
      categoryElements.forEach(cat => {
        const catText = cat.textContent?.trim();
        if (catText) categories.push(catText);
      });
      
      if (title && (description || content)) {
        articles.push({
          title,
          description,
          content,
          pubDate,
          author,
          category: categories,
          link,
          guid,
        });
      }
    });
    
    return articles;
  };

  const cleanHtmlContent = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());
    
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  };

  const convertToMarkdown = (content: string): string => {
    let markdown = content;
    
    markdown = markdown.replace(/<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/gi, (match, level, attrs, text) => {
      const headerLevel = '#'.repeat(parseInt(level));
      return `${headerLevel} ${text.trim()}\n\n`;
    });
    
    markdown = markdown.replace(/<p([^>]*)>(.*?)<\/p>/gi, '$2\n\n');
    
    markdown = markdown.replace(/<strong([^>]*)>(.*?)<\/strong>/gi, '**$2**');
    markdown = markdown.replace(/<b([^>]*)>(.*?)<\/b>/gi, '**$2**');
    
    markdown = markdown.replace(/<em([^>]*)>(.*?)<\/em>/gi, '*$2*');
    markdown = markdown.replace(/<i([^>]*)>(.*?)<\/i>/gi, '*$2*');
    
    markdown = markdown.replace(/<a([^>]*href=["']([^"']+)["'][^>]*)>(.*?)<\/a>/gi, '[$3]($2)');
    
    markdown = markdown.replace(/<img([^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*)>/gi, '![$3]($2)');
    markdown = markdown.replace(/<img([^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*)>/gi, '![$2]($3)');
    markdown = markdown.replace(/<img([^>]*src=["']([^"']+)["'][^>]*)>/gi, '![]($2)');
    
    markdown = markdown.replace(/<ul([^>]*)>(.*?)<\/ul>/gis, (match, attrs, content) => {
      return content.replace(/<li([^>]*)>(.*?)<\/li>/gi, '- $2\n') + '\n';
    });
    
    markdown = markdown.replace(/<ol([^>]*)>(.*?)<\/ol>/gis, (match, attrs, content) => {
      let counter = 1;
      return content.replace(/<li([^>]*)>(.*?)<\/li>/gi, () => `${counter++}. $2\n`) + '\n';
    });
    
    markdown = markdown.replace(/<blockquote([^>]*)>(.*?)<\/blockquote>/gis, (match, attrs, content) => {
      return content.split('\n').map(line => `> ${line.trim()}`).join('\n') + '\n\n';
    });
    
    markdown = markdown.replace(/<code([^>]*)>(.*?)<\/code>/gi, '`$2`');
    
    markdown = markdown.replace(/<pre([^>]*)>(.*?)<\/pre>/gis, '```\n$2\n```\n\n');
    
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    
    markdown = markdown.replace(/<[^>]+>/g, '');
    
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");
    
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
  };

  const fetchRSSFeed = async (url: string): Promise<RSSItem[]> => {
    try {
      const corsProxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(corsProxy);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.contents) {
        throw new Error('No content received from RSS feed');
      }
      
      const articles = parseRSSContent(data.contents);
      
      if (articles.length === 0) {
        throw new Error('No articles found in RSS feed');
      }
      
      return articles;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch RSS feed');
    }
  };

  const handlePreviewFeed = async () => {
    if (!rssUrl.trim()) {
      onError?.('Please enter an RSS feed URL');
      return;
    }
    
    setIsImporting(true);
    setPreviewData(null);
    setSelectedItems(new Set());
    
    try {
      const articles = await fetchRSSFeed(rssUrl);
      setPreviewData(articles);
      setSelectedItems(new Set(Array.from({ length: Math.min(articles.length, 10) }, (_, i) => i)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = () => {
    if (!previewData || selectedItems.size === 0) return;
    
    const selectedArticles = Array.from(selectedItems).map(index => {
      const item = previewData[index];
      const content = item.content || item.description;
      const cleanContent = content.includes('<') ? convertToMarkdown(content) : content;
      
      const excerpt = item.description 
        ? (item.description.includes('<') ? cleanHtmlContent(item.description) : item.description)
        : cleanContent.substring(0, 200) + '...';
      
      return {
        title: item.title,
        content: cleanContent,
        excerpt: excerpt.substring(0, 300),
        publishedAt: item.pubDate,
        author: item.author,
        tags: item.category,
        link: item.link,
      };
    });
    
    onArticlesImport(selectedArticles);
    setPreviewData(null);
    setRssUrl('');
    setSelectedItems(new Set());
  };

  const handleToggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (!previewData) return;
    
    if (selectedItems.size === previewData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(Array.from({ length: previewData.length }, (_, i) => i)));
    }
  };

  return (
    <div className={`rss-import ${className}`}>
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">RSS 导入说明</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                输入RSS/Atom feed链接，预览并选择要导入的文章。HTML内容将自动转换为Markdown格式。
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            RSS Feed URL
          </label>
          <div className="flex space-x-3">
            <input
              type="url"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 
                         rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isImporting}
            />
            <button
              onClick={handlePreviewFeed}
              disabled={isImporting || !rssUrl.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>加载中...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>预览</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {previewData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                发现 {previewData.length} 篇文章
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  {selectedItems.size === previewData.length ? '取消全选' : '全选'}
                </button>
                <button
                  onClick={handleImportSelected}
                  disabled={selectedItems.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 
                             transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  导入选中的 {selectedItems.size} 篇文章
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {previewData.map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(index)}
                    onChange={() => handleToggleItem(index)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 
                               focus:ring-primary-500 dark:bg-gray-700 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {item.description ? (item.description.includes('<') ? cleanHtmlContent(item.description) : item.description).substring(0, 150) + '...' : ''}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {item.author && (
                        <span>作者: {item.author}</span>
                      )}
                      {item.pubDate && (
                        <span>发布: {new Date(item.pubDate).toLocaleDateString()}</span>
                      )}
                      {item.category && item.category.length > 0 && (
                        <span>标签: {item.category.slice(0, 2).join(', ')}{item.category.length > 2 ? '...' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}