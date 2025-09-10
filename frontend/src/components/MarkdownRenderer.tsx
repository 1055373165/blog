import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
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
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Mermaid diagram component
const MermaidDiagram = ({ code, isDark }: { code: string; isDark: boolean }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!elementRef.current) return;

      try {
        // Initialize Mermaid with appropriate theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: isDark ? '#f9fafb' : '#1f2937',
            primaryBorderColor: '#d1d5db',
            lineColor: isDark ? '#6b7280' : '#374151',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#fafafa'
          },
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true
          }
        });

        // Generate unique ID for the diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the diagram
        const { svg } = await mermaid.render(id, code);
        
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
      }
    };

    renderDiagram();
  }, [code, isDark]);

  if (error) {
    return (
      <div className="my-4 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Mermaid Diagram Error</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            <details className="mt-2">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:text-red-800 dark:hover:text-red-200">
                Show diagram code
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-800/30 p-2 rounded border overflow-x-auto">
                <code>{code}</code>
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 flex justify-center">
      <div 
        ref={elementRef}
        className="mermaid-diagram max-w-full overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      />
    </div>
  );
};

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { settings, isDark } = useTheme();

  // 获取代码主题样式
  const getCodeStyle = () => {    
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
          rehypeSlug,
          rehypeRaw
        ]}
        components={{
                    code({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            // 确保children是字符串
            const codeString = String(children).trim();
            
            // Mermaid diagram rendering
            if (!inline && language === 'mermaid') {
              return <MermaidDiagram code={codeString} isDark={isDark} />;
            }
            
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
                quotes: 'none',
                fontStyle: 'normal',
                fontFamily: 'var(--font-body)'
              }}
            >
              <div style={{ quotes: 'none', fontStyle: 'normal' }}>
                {children}
              </div>
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside !ml-0 pl-5 space-y-2 mb-4 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside !ml-0 pl-5 space-y-2 mb-4 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed ml-0">
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
          // 增强的折叠块支持 - 与新的 ByteMD 插件同步
          details: ({ children, ...props }) => (
            <details 
              className="foldable-block border border-gray-200 dark:border-gray-700 rounded-lg my-4 bg-gray-50 dark:bg-gray-800/50 overflow-hidden transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
              {...props}
            >
              {children}
            </details>
          ),
          summary: ({ children }) => (
            <summary className="px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 cursor-pointer font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 user-select-none transition-all duration-200 hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-700 relative before:content-['▶'] before:absolute before:right-4 before:top-1/2 before:-translate-y-1/2 before:transition-transform before:duration-200 before:text-gray-500 dark:before:text-gray-400 before:text-xs [details[open]>&]:before:rotate-90">
              {children}
            </summary>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}