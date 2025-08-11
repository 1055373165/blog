import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import type { CreateArticleInput } from '../types';

interface ArticlePreviewProps {
  article: CreateArticleInput;
  className?: string;
}

export default function ArticlePreview({ article, className = '' }: ArticlePreviewProps) {
  const estimatedReadingTime = Math.ceil(article.content.length / 200);
  
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Article Header */}
      <header className="mb-8">
        {article.cover_image && (
          <div className="mb-6">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-64 sm:h-80 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}
        
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            {article.title || '无标题'}
          </h1>
          
          {article.excerpt && (
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              预计阅读时间: {estimatedReadingTime} 分钟
            </div>
            
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              字数: {article.content.length.toLocaleString()}
            </div>
            
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1V2a1 1 0 00-1-1H7zM5 6a1 1 0 000 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
              </svg>
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              article.is_published
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {article.is_published ? '已发布' : '草稿'}
            </span>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeHighlight,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: 'wrap' }]
          ]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={oneLight as any}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img({ node, ...props }: any) {
              return (
                <img
                  {...props}
                  className="rounded-lg shadow-md max-w-full h-auto"
                  loading="lazy"
                />
              );
            },
            blockquote({ node, children, ...props }: any) {
              return (
                <blockquote
                  className="border-l-4 border-primary-500 bg-gray-50 dark:bg-gray-800 p-4 my-4 italic"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            },
            table({ node, children, ...props }: any) {
              return (
                <div className="overflow-x-auto my-6">
                  <table
                    className="min-w-full border border-gray-300 dark:border-gray-600"
                    {...props}
                  >
                    {children}
                  </table>
                </div>
              );
            },
            th({ node, children, ...props }: any) {
              return (
                <th
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-semibold text-left"
                  {...props}
                >
                  {children}
                </th>
              );
            },
            td({ node, children, ...props }: any) {
              return (
                <td
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600"
                  {...props}
                >
                  {children}
                </td>
              );
            },
          }}
        >
          {article.content || '暂无内容'}
        </ReactMarkdown>
      </article>

      {/* Article Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          {/* SEO Information (for admin preview) */}
          {(article.meta_title || article.meta_description || article.meta_keywords) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                SEO 信息预览
              </h3>
              <div className="space-y-2 text-sm">
                {article.meta_title && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">标题: </span>
                    <span className="text-blue-600 dark:text-blue-400">{article.meta_title}</span>
                  </div>
                )}
                {article.meta_description && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">描述: </span>
                    <span className="text-blue-600 dark:text-blue-400">{article.meta_description}</span>
                  </div>
                )}
                {article.meta_keywords && (
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-300">关键词: </span>
                    <span className="text-blue-600 dark:text-blue-400">{article.meta_keywords}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>这是文章预览模式</p>
          </div>
        </div>
      </footer>
    </div>
  );
}