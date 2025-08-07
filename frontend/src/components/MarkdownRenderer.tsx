import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  vscDarkPlus, 
  vs, 
  tomorrow,
  twilight,
  dracula,
  nord,
  oneLight,
  oneDark
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { github, monokai } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { settings, isDark } = useTheme();

  // 获取代码主题样式
  const getCodeStyle = () => {
    const themeMap = {
      vs,
      vscDarkPlus,
      github,
      tomorrow,
      twilight,
      monokai,
      dracula,
      nord,
      oneLight,
      oneDark,
    };
    return themeMap[settings.codeTheme] || vscDarkPlus;
  };

  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug
        ]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 确保children是字符串
            const codeString = Array.isArray(children) 
              ? children.join('') 
              : String(children || '');
            
            // 多行代码块
            if (!inline && codeString.includes('\n')) {
              return (
                <div className="relative my-4">
                  {language && (
                    <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded z-10">
                      {language}
                    </div>
                  )}
                  <SyntaxHighlighter
                    style={getCodeStyle()}
                    language={language || 'text'}
                    PreTag="div"
                    className={`rounded-lg !mt-0 !mb-0 ${settings.fontSize === 'sm' ? 'text-sm' : settings.fontSize === 'lg' ? 'text-lg' : settings.fontSize === 'xl' ? 'text-xl' : 'text-base'}`}
                    showLineNumbers={settings.lineNumbers}
                    wrapLines={settings.wordWrap}
                    wrapLongLines={settings.wordWrap}
                  >
                    {codeString.replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            // 行内代码
            return (
              <code
                className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                {codeString}
              </code>
            );
          },
          h1: ({ children, id }) => (
            <h1 id={id} className="text-3xl font-bold text-gray-900 dark:text-white mt-8 mb-4 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-3">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
              {children}
            </td>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="rounded-lg shadow-md max-w-full h-auto my-4"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}