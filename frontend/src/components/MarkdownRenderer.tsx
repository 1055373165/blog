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

  // 内联样式用于折叠块动画
  const foldableStyles = `
    <style>
      .foldable-block {
        --fold-duration: 300ms;
        --fold-ease: cubic-bezier(0.4, 0.0, 0.2, 1);
        /* 新增：折叠块内部统一的间距变量，可按需在 data-density 上覆盖 */
        --fold-content-py: 1rem;
        --fold-content-px: 1.25rem;
        --fold-list-mt: 0.25rem;
        --fold-list-mb: 0.375rem;
        --fold-li-gap: 0.125rem;
        --fold-li-line-height: 1.35;
        --fold-nested-indent: 1.25rem;
      }
      
      .foldable-block[open] {
        animation: foldable-expand var(--fold-duration) var(--fold-ease) forwards;
      }
      
      .foldable-block:not([open]) {
        animation: foldable-collapse var(--fold-duration) var(--fold-ease) forwards;
      }
      
      .foldable-block summary {
        list-style: none;
        -webkit-appearance: none;
      }
      
      .foldable-block summary::-webkit-details-marker {
        display: none;
      }
      
      .foldable-block summary::-moz-list-bullet {
        list-style-type: none;
      }
      
      .foldable-content {
        animation: content-fade-in var(--fold-duration) var(--fold-ease) forwards;
      }
      
      .foldable-block:not([open]) .foldable-content {
        animation: content-fade-out calc(var(--fold-duration) * 0.5) var(--fold-ease) forwards;
      }
      
      @keyframes foldable-expand {
        from {
          opacity: 0.8;
          transform: translateY(-4px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes foldable-collapse {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0.9;
          transform: translateY(-2px) scale(0.99);
        }
      }
      
      @keyframes content-fade-in {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes content-fade-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      
      /* 折叠块内容区域 - 统一背景容器 */
      .foldable-block[open]::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.5);
        z-index: -1;
        pointer-events: none;
      }
      
      .dark .foldable-block[open]::after {
        background: rgba(17, 24, 39, 0.3);
      }
      
      /* 内容区域统一内边距 */
      .foldable-block[open] {
        padding: 0 var(--fold-content-px) var(--fold-content-py) var(--fold-content-px);
        padding-top: 0;
      }
      
      /* 移除单个元素的独立容器化，让内容自然流动 */
      .foldable-block > *:not(summary) {
        margin: 0;
        background: transparent;
      }
      
      /* 统一内容间距 - 让内容自然流动 */
      .foldable-block > *:not(summary) {
        margin-top: 1rem;
        margin-bottom: 0;
      }
      
      .foldable-block > *:not(summary):first-of-type {
        margin-top: 0;
      }
      
      .foldable-block > *:not(summary):last-of-type {
        margin-bottom: 0;
      }
      
      /* 段落间距优化 */
      .foldable-block > *:not(summary) > p + p {
        margin-top: 0.75rem;
      }
      
      /* 列表间距优化 - 直接选中列表元素 */
      .foldable-block ul,
      .foldable-block ol {
        margin-top: var(--fold-list-mt) !important;
        margin-bottom: var(--fold-list-mb) !important;
        padding-left: var(--fold-nested-indent) !important;
        list-style-position: outside;
      }
      
      /* 列表项内部间距优化 - 简化选择器 */
      .foldable-block li {
        margin: 0 !important;
        line-height: var(--fold-li-line-height) !important;
      }
      
      .foldable-block li:last-child {
        margin-bottom: 0 !important;
      }
      
      /* 列表项间距控制 */
      .foldable-block ul > li + li,
      .foldable-block ol > li + li {
        margin-top: var(--fold-li-gap) !important;
      }
      
      /* 列表项内部元素间距 */
      .foldable-block li > * {
        margin: 0 !important;
      }
      
      .foldable-block li > * + * {
        margin-top: 0.125rem !important;
      }
      
      /* 标题间距优化 - 直接选中标题元素 */
      .foldable-block h1,
      .foldable-block h2,
      .foldable-block h3,
      .foldable-block h4,
      .foldable-block h5,
      .foldable-block h6 {
        margin-top: 1.5rem !important;
        margin-bottom: 0.5rem !important;
      }
      
      .foldable-block h1:first-child,
      .foldable-block h2:first-child,
      .foldable-block h3:first-child,
      .foldable-block h4:first-child,
      .foldable-block h5:first-child,
      .foldable-block h6:first-child {
        margin-top: 0 !important;
      }
      
      /* 代码块间距优化 */
      .foldable-block pre {
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
      }
      
      /* 引用块间距优化 */
      .foldable-block blockquote {
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
      }
      
      /* 段落间距优化 */
      .foldable-block p {
        margin-top: 0.75rem !important;
        margin-bottom: 0.75rem !important;
      }
      
      .foldable-block p:first-child {
        margin-top: 0 !important;
      }
      
      .foldable-block p:last-child {
        margin-bottom: 0 !important;
      }
      
      /* 强调元素优化 */
      .foldable-block strong,
      .foldable-block em {
        line-height: inherit;
        margin: 0;
        padding: 0;
        vertical-align: baseline;
      }
      
      /* 三角形指示器的平滑旋转 */
      .foldable-block summary::after {
        transition: all var(--fold-duration) var(--fold-ease);
      }
      
      /* 增强的渐变悬停效果 */
      .foldable-block summary:hover::before {
        animation: shimmer 1s ease-in-out infinite;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%) skewX(-15deg); }
        100% { transform: translateX(200%) skewX(-15deg); }
      }

      /* Prose 插件覆盖：更高优先级选择器，保证折叠块内列表紧凑但清晰 */
      .prose .foldable-block ul,
      .prose .foldable-block ol {
        margin-top: var(--fold-list-mt) !important;
        margin-bottom: var(--fold-list-mb) !important;
        padding-left: var(--fold-nested-indent) !important;
        list-style-position: outside;
      }
      .prose .foldable-block li {
        margin: 0 !important;
        line-height: var(--fold-li-line-height) !important;
      }
      .prose .foldable-block li > p {
        margin: 0 !important;
      }
      .prose .foldable-block ul li + li,
      .prose .foldable-block ol li + li {
        margin-top: var(--fold-li-gap) !important;
      }
      .prose .foldable-block ul ul,
      .prose .foldable-block ol ul,
      .prose .foldable-block ul ol,
      .prose .foldable-block ol ol {
        margin-top: var(--fold-li-gap) !important;
        margin-bottom: var(--fold-li-gap) !important;
        padding-left: var(--fold-nested-indent) !important;
      }
      .prose .foldable-block ul { list-style-type: disc; }
      .prose .foldable-block ul ul { list-style-type: circle; }
      .prose .foldable-block ul ul ul { list-style-type: square; }

      /* 密度预设：通过 <details data-density="..."> 控制 */
      .foldable-block[data-density="compact"] {
        --fold-li-line-height: 1.3;
        --fold-li-gap: 0.075rem;
        --fold-list-mb: 0.25rem;
      }
      .foldable-block[data-density="comfortable"] {
        --fold-li-line-height: 1.45;
        --fold-li-gap: 0.2rem;
        --fold-list-mb: 0.5rem;
      }

      /* 列表项中代码块与引用的间距微调 */
      .prose .foldable-block li pre,
      .prose .foldable-block li blockquote {
        margin-top: 0.25rem !important;
        margin-bottom: 0.25rem !important;
      }
    </style>
  `;

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
    <>
      {/* 注入折叠块的自定义样式 */}
      <div dangerouslySetInnerHTML={{ __html: foldableStyles }} />
      
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
            <ul className="list-disc list-outside !ml-0 pl-5 mb-4 text-gray-700 dark:text-gray-300" style={{ lineHeight: '1.3' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside !ml-0 pl-5 mb-4 text-gray-700 dark:text-gray-300" style={{ lineHeight: '1.3' }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-tight ml-0" style={{ lineHeight: '1.3' }}>
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
          // 增强的折叠块支持 - 简化版本，通过 CSS 处理
          details: ({ children, ...props }) => (
            <details 
              className={`
                foldable-block group relative my-6 
                border border-gray-200/80 dark:border-gray-700/80 
                rounded-xl shadow-sm hover:shadow-md
                bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/30 dark:to-gray-900/50
                backdrop-blur-sm overflow-hidden
                transition-all duration-300 ease-in-out
                hover:border-blue-200 dark:hover:border-blue-700/50
                hover:from-blue-50/30 hover:to-blue-50/10 
                dark:hover:from-blue-900/20 dark:hover:to-blue-900/10
                focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300
                dark:focus-within:ring-blue-400/20 dark:focus-within:border-blue-600
                ${settings.fontSize === 'sm' ? 'text-sm' : 
                  settings.fontSize === 'lg' ? 'text-base' : 
                  settings.fontSize === 'xl' ? 'text-lg' : 'text-sm'}
              `}
              {...props}
            >
              {children}
            </details>
          ),
          summary: ({ children }) => (
            <summary className={`
              px-5 py-4 cursor-pointer font-medium select-none
              bg-gradient-to-r from-gray-100/80 to-gray-50/60 
              dark:from-gray-700/60 dark:to-gray-800/60
              text-gray-800 dark:text-gray-100
              border-b border-gray-200/70 dark:border-gray-600/50
              transition-all duration-300 ease-in-out
              hover:from-blue-100/80 hover:to-blue-50/60 
              dark:hover:from-blue-800/40 dark:hover:to-blue-900/30
              hover:text-blue-900 dark:hover:text-blue-100
              active:bg-blue-200/50 dark:active:bg-blue-700/30
              focus:outline-none focus:bg-blue-100/50 dark:focus:bg-blue-800/30
              relative overflow-hidden
              before:absolute before:inset-0 before:bg-gradient-to-r 
              before:from-transparent before:via-white/20 before:to-transparent
              before:translate-x-[-100%] before:transition-transform before:duration-700
              hover:before:translate-x-[100%]
              after:content-[''] after:absolute after:right-5 after:top-1/2 
              after:w-0 after:h-0 after:border-l-[6px] after:border-r-[6px] 
              after:border-t-[8px] after:border-l-transparent after:border-r-transparent
              after:border-t-gray-500 dark:after:border-t-gray-400
              after:transition-all after:duration-300 after:ease-in-out
              after:transform after:-translate-y-1/2 after:rotate-[-90deg]
              group-open:after:rotate-0 group-open:after:border-t-blue-600 
              dark:group-open:after:border-t-blue-400
              ${settings.fontSize === 'sm' ? 'text-sm font-medium' : 
                settings.fontSize === 'lg' ? 'text-base font-semibold' : 
                settings.fontSize === 'xl' ? 'text-lg font-semibold' : 'text-sm font-medium'}
            `}>
              <span className="relative z-10 flex items-center">
                <span className="mr-3 text-blue-600 dark:text-blue-400 font-mono text-xs opacity-70">
                  ▶
                </span>
                {children}
              </span>
            </summary>
          ),
          // 自定义 div 处理 - 保持简洁，避免过度检测
          div: ({ children, className, ...props }) => {
            return (
              <div className={className} {...props}>
                {children}
              </div>
            );
          },
        }}
      >
          {content}
        </ReactMarkdown>
      </div>
    </>
  );
}