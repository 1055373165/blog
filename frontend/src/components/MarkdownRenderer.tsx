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
  oneDark,
  materialDark,
  materialLight,
  atomDark,
  base16AteliersulphurpoolLight,
  coldarkCold,
  coldarkDark,
  prism,
  synthwave84,
  nightOwl,
  shadesOfPurple,
  lucario,
  duotoneDark,
  duotoneLight,
  okaidia,
  solarizedlight,
  darcula
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  github, 
  monokai,
  atelierCaveLight,
  atelierCaveDark,
  atelierDuneLight,
  atelierDuneDark,
  atelierEstuaryLight,
  atelierEstuaryDark,
  atelierForestLight,
  atelierForestDark,
  atelierHeathLight,
  atelierHeathDark,
  atelierLakesideLight,
  atelierLakesideDark,
  atelierPlateauLight,
  atelierPlateauDark,
  atelierSavannaLight,
  atelierSavannaDark,
  atelierSeasideLight,
  atelierSeasideDark,
  atelierSulphurpoolLight,
  atelierSulphurpoolDark
} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { settings, isDark } = useTheme();

  // 自定义极客主题 - 纯黑色
  const geekTheme: { [key: string]: React.CSSProperties } = {
    'code[class*="language-"]': {
      color: '#00FF00',
      background: '#000000',
      textShadow: '0 0 2px #00FF00',
      fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      tabSize: 4,
      hyphens: 'none',
    },
    'pre[class*="language-"]': {
      color: '#00FF00',
      background: '#000000',
      textShadow: '0 0 2px #00FF00',
      fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      tabSize: 4,
      hyphens: 'none',
      padding: '0.5rem',
      margin: '0',
      overflow: 'auto',
    },
    'comment': { color: '#555555', fontStyle: 'italic' },
    'prolog': { color: '#555555' },
    'doctype': { color: '#555555' },
    'cdata': { color: '#555555' },
    'punctuation': { color: '#00FF00' },
    'property': { color: '#00FFFF' },
    'tag': { color: '#FF6600' },
    'boolean': { color: '#FFFF00' },
    'number': { color: '#FFFF00' },
    'constant': { color: '#FFFF00' },
    'symbol': { color: '#FFFF00' },
    'deleted': { color: '#FF0000' },
    'selector': { color: '#00FFFF' },
    'attr-name': { color: '#00FFFF' },
    'string': { color: '#FFFF00' },
    'char': { color: '#FFFF00' },
    'builtin': { color: '#00FFFF' },
    'inserted': { color: '#00FF00' },
    'operator': { color: '#FF6600' },
    'entity': { color: '#FF6600' },
    'url': { color: '#00FFFF' },
    'variable': { color: '#00FFFF' },
    'atrule': { color: '#FF6600' },
    'attr-value': { color: '#FFFF00' },
    'function': { color: '#FF6600' },
    'class-name': { color: '#00FFFF' },
    'keyword': { color: '#FF6600', fontWeight: 'bold' },
    'regex': { color: '#FFFF00' },
    'important': { color: '#FF0000', fontWeight: 'bold' },
  };

  // 获取代码主题样式
  const getCodeStyle = () => {
    // 如果是geek主题，返回自定义主题
    if (settings.codeTheme === 'geek') {
      return geekTheme;
    }
    
    const themeMap = {
      // 经典主题
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
      
      // 现代化主题 - Prism样式
      materialDark,
      materialLight,
      atomDark,
      coldarkCold,
      coldarkDark,
      prism,
      synthwave84,
      nightOwl,
      shadesOfPurple,
      lucario,
      duotoneDark,
      duotoneLight,
      okaidia,
      solarizedlight,
      darcula,
      base16AteliersulphurpoolLight,
      
      // 现代化主题 - HLJS样式
      atelierCaveLight,
      atelierCaveDark,
      atelierDuneLight,
      atelierDuneDark,
      atelierEstuaryLight,
      atelierEstuaryDark,
      atelierForestLight,
      atelierForestDark,
      atelierHeathLight,
      atelierHeathDark,
      atelierLakesideLight,
      atelierLakesideDark,
      atelierPlateauLight,
      atelierPlateauDark,
      atelierSavannaLight,
      atelierSavannaDark,
      atelierSeasideLight,
      atelierSeasideDark,
      atelierSulphurpoolLight,
      atelierSulphurpoolDark,
    };
    return themeMap[settings.codeTheme as keyof typeof themeMap] || vscDarkPlus;
  };

  return (
    <div className={`prose dark:prose-invert max-w-none prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug
        ]}
        components={{
                    code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 确保children是字符串
            const codeString = String(children).trim();
            
            // 多行代码块
            if (!inline && codeString.includes('\n')) {
              return (
                <div className="my-1">
                  <SyntaxHighlighter
                    style={getCodeStyle()}
                    language={language || 'text'}
                    PreTag="div"
                    className={`!mt-0 !mb-0 !bg-transparent [&>*]:!bg-transparent [&_*]:!bg-transparent ${settings.fontSize === 'sm' ? 'text-sm' : settings.fontSize === 'lg' ? 'text-lg' : settings.fontSize === 'xl' ? 'text-xl' : 'text-base'}`}
                    showLineNumbers={false}
                    wrapLines={settings.wordWrap}
                    wrapLongLines={settings.wordWrap}
                    customStyle={{ 
                      backgroundColor: isDark ? '#111827' : '#f9fafb',
                      background: isDark ? '#111827' : '#f9fafb',
                      border: 'none',
                      borderRadius: '0px',
                      padding: '16px',
                      margin: '0'
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            // 行内代码
            return (
              <code
                className={`font-mono text-gray-800 dark:text-gray-200 ${settings.fontSize === 'sm' ? 'text-sm' : settings.fontSize === 'lg' ? 'text-base' : settings.fontSize === 'xl' ? 'text-lg' : 'text-sm'}`}
                style={{
                  color: isDark ? '#e5e7eb' : '#374151',
                  fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace',
                }}
              >
                {codeString}
              </code>
            );
          },
          h1: ({ children, id }) => {
            const sizeClass = settings.fontSize === 'sm' ? 'text-2xl' : 
                             settings.fontSize === 'lg' ? 'text-4xl' : 
                             settings.fontSize === 'xl' ? 'text-5xl' : 'text-3xl';
            return (
              <h1 id={id} className={`${sizeClass} font-bold text-gray-900 dark:text-white mt-8 mb-4 first:mt-0`}>
                {children}
              </h1>
            );
          },
          h2: ({ children, id }) => {
            const sizeClass = settings.fontSize === 'sm' ? 'text-xl' : 
                             settings.fontSize === 'lg' ? 'text-3xl' : 
                             settings.fontSize === 'xl' ? 'text-4xl' : 'text-2xl';
            return (
              <h2 id={id} className={`${sizeClass} font-bold text-gray-900 dark:text-white mt-6 mb-3`}>
                {children}
              </h2>
            );
          },
          h3: ({ children, id }) => {
            const sizeClass = settings.fontSize === 'sm' ? 'text-lg' : 
                             settings.fontSize === 'lg' ? 'text-2xl' : 
                             settings.fontSize === 'xl' ? 'text-3xl' : 'text-xl';
            return (
              <h3 id={id} className={`${sizeClass} font-bold text-gray-900 dark:text-white mt-5 mb-3`}>
                {children}
              </h3>
            );
          },
          p: ({ children }) => {
            const sizeClass = settings.fontSize === 'sm' ? 'text-sm' : 
                             settings.fontSize === 'lg' ? 'text-lg' : 
                             settings.fontSize === 'xl' ? 'text-xl' : 'text-base';
            return (
              <p className={`${sizeClass} text-gray-700 dark:text-gray-300 leading-relaxed mb-4`}>
                {children}
              </p>
            );
          },
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
            <blockquote 
              className="border-l-4 border-primary-500 pl-4 py-1.5 text-gray-600 dark:text-gray-400 my-4"
              style={{
                quotes: 'none'
              }}
            >
              <div style={{ quotes: 'none' }}>
                {children}
              </div>
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
              className="max-w-full h-auto my-4"
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