import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { visit } from 'unist-util-visit';
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

// 自定义插件：解析图片尺寸语法 {width=200 height=200}
const remarkImageSize = () => {
  return (tree: any) => {
    visit(tree, 'image', (node: any) => {
      if (node.alt) {
        // 查找 alt 文本后面的 {width=xxx height=xxx} 模式
        const match = node.alt.match(/^(.*?)\s*\{([^}]+)\}$/);
        if (match) {
          const [, cleanAlt, attributes] = match;
          node.alt = cleanAlt.trim();

          // 解析属性
          const attrs: { [key: string]: string } = {};
          const attrMatches = attributes.match(/(\w+)=(\d+)/g);
          if (attrMatches) {
            attrMatches.forEach((attr: string) => {
              const [key, value] = attr.split('=');
              attrs[key] = value;
            });
          }

          // 将尺寸信息保存到 node.data
          if (!node.data) node.data = {};
          if (!node.data.hProperties) node.data.hProperties = {};

          if (attrs.width) {
            node.data.hProperties.width = attrs.width;
            node.data.hProperties['data-width'] = attrs.width;
          }
          if (attrs.height) {
            node.data.hProperties.height = attrs.height;
            node.data.hProperties['data-height'] = attrs.height;
          }
        }
      }
    });
  };
};

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

    // 安全策略配置 - 扩展白名单允许图片相关属性和代码块属性
  const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      img: [
        'src', 'alt', 'title', 'width', 'height', 'className', 'style',
        'loading', 'decoding', 'data-*'
      ],
      // 确保代码块渲染不受影响
      code: [...(defaultSchema.attributes?.code || []), 'className', 'style'],
      pre: [...(defaultSchema.attributes?.pre || []), 'className', 'style'],
      div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
      span: [...(defaultSchema.attributes?.span || []), 'className', 'style']
    },
    protocols: {
      ...defaultSchema.protocols,
      src: ['http', 'https', 'data']
    }
  };

  // 统一字体大小映射 - 确保正文和折叠块使用相同的字体大小
  const getFontSizeValues = (fontSize: string) => {
    const fontSizeMap = {
      'sm': {
        base: '0.875rem',     // text-sm
        lg: '1rem',           // text-base for larger elements
        code: '0.8125rem'     // slightly smaller for code
      },
      'base': {
        base: '1rem',         // text-base
        lg: '1.125rem',       // text-lg for larger elements  
        code: '0.875rem'      // text-sm for code
      },
      'lg': {
        base: '1.125rem',     // text-lg
        lg: '1.25rem',        // text-xl for larger elements
        code: '1rem'          // text-base for code
      },
      'xl': {
        base: '1.25rem',      // text-xl
        lg: '1.5rem',         // text-2xl for larger elements
        code: '1.125rem'      // text-lg for code
      }
    };
    return fontSizeMap[fontSize as keyof typeof fontSizeMap] || fontSizeMap.base;
  };

  // 统一文字样式定义 - 确保所有正文元素完全一致
  const getUnifiedTextStyles = () => {
    const sizeClass = settings.fontSize === 'sm' ? 'text-sm' :
      settings.fontSize === 'lg' ? 'text-lg' :
        settings.fontSize === 'xl' ? 'text-xl' : 'text-base';

    return {
      className: `${sizeClass} text-gray-700 dark:text-gray-300`,
      style: {
        fontWeight: '400', // normal font weight for all text elements
        lineHeight: '1.6', // unified line height for better readability
        fontFamily: 'inherit', // ensure consistent font family
      }
    };
  };

  const fontSizes = getFontSizeValues(settings.fontSize);

  // 内联样式用于折叠块动画 - 现在包含动态字体大小
  const foldableStyles = `
    <style>
      .foldable-block {
        font-family: inherit;
        --fold-duration: 300ms;
        --fold-ease: cubic-bezier(0.4, 0.0, 0.2, 1);
        /* 动态字体大小变量 - 与正文保持一致 */
        --fold-font-size-base: ${fontSizes.base};
        --fold-font-size-lg: ${fontSizes.lg};
        --fold-font-size-code: ${fontSizes.code};
        /* 新增：折叠块内部统一的间距变量，可按需在 data-density 上覆盖 */
        --fold-content-py: 1rem;
        --fold-content-px: 1.25rem;
        --fold-list-mt: 0.125rem;
        --fold-list-mb: 0.25rem;
        --fold-li-gap: 0.1rem;
        --fold-li-line-height: 1.3;
        --fold-heading-line-height: 1.8; /* 标题行高（增大一倍视觉空间） */
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

      /* 核心修复：解决 react-markdown 中列表项内容被 p 标签包裹导致的换行问题 */
      .prose li > p:only-child {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* 更通用的修复，针对所有li中的p标签 */
      .prose li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 强制所有列表项内的段落都内联显示 */
      .prose ol li p,
      .prose ul li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
      }

      /* 兼容：有些解析链可能在 li 内包一层 div（如编辑器或 rehype），
         导致序号与正文分行。将仅子元素的 div 视为“内容容器”并扁平化处理 */
      .prose li > div:only-child {
        display: contents !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 特别针对有序列表的修复 - 确保数字标记与内容在同一行 */
      .prose ol li {
        display: list-item !important;
        list-style-position: outside !important;
        list-style-type: decimal !important;
      }
      
      .prose ol li > p:only-child,
      .prose ol li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
      }

      /* 强化修复：针对中文内容和复杂markdown的列表项渲染 */
      .prose ol li::marker {
        content: counter(list-item) ". " !important;
        font-weight: 600 !important;
        color: inherit !important;
      }

      /* 确保列表项内的所有块级元素都内联化 */
      .prose li > *:first-child:last-child {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 特别处理：当li内有多个元素时，确保第一个元素不产生额外间距 */
      .prose li > *:first-child {
        margin-top: 0 !important;
      }

      /* 修复：确保列表项的display属性不被其他样式覆盖 */
      .prose ul li,
      .prose ol li {
        display: list-item !important;
        list-style-position: outside !important;
      }
      
      /* 折叠块内容区域 - 仅修改背景，不在 open 状态添加外层 padding，避免 Summary 位移 */
      .foldable-block[open] {
        background: rgba(255, 255, 255, 0.5);
      }
      
      .dark .foldable-block[open] {
        background: rgba(17, 24, 39, 0.3);
      }

      /* 确保 Summary 在折叠/展开前后宽度与圆角保持一致 */
      .prose .foldable-block > summary {
        display: block;
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
      }

      /* 核心修复：移除 prose 对子元素的间距影响，并建立新的垂直节奏 */
      .prose .foldable-block > *:not(summary) {
        margin: 0;
        padding: 0;
        background: transparent;
      }

      .prose .foldable-block > *:not(summary) + *:not(summary) {
        margin-top: var(--fold-block-gap, 0.75rem) !important; /* 增大块间距 */
      }

      /* 列表项修复：确保 li 表现为列表项，并处理内部 p 标签的边距 */
      .prose .foldable-block li {
        display: list-item !important;
      }
      .prose .foldable-block li > p:only-child,
      .prose .foldable-block li p {
        display: inline !important; /* 强制内联显示，确保与列表标记在同一行 */
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 特别针对折叠块内有序列表的修复 */
      .prose .foldable-block ol li {
        display: list-item !important;
        list-style-position: outside !important;
      }
      
      .prose .foldable-block ol li > p:only-child,
      .prose .foldable-block ol li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
      }

      /* 当 li 仅包含一段纯文本（或仅被 div 包裹）时，避免块级元素导致的换行 */
      .prose .foldable-block ol li > p:first-child:last-child,
      .prose .foldable-block ol li > div:first-child:last-child {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 有序列表：强制十进制序号并提升可读性（仅作用于折叠块内部）*/
      .prose .foldable-block ol {
        list-style-type: decimal !important;
        list-style-position: outside !important;
      }

      .prose .foldable-block ol li {
        display: list-item !important;
        list-style-type: decimal !important;
        list-style-position: outside !important;
      }

      .prose .foldable-block ol li::marker {
        font-weight: 600 !important;
        color: inherit !important;
      }

      /* 最高优先级修复：确保所有折叠块内的列表项段落都内联显示 */
      details.foldable-block ol li p,
      details.foldable-block ul li p,
      .foldable-block ol li p,
      .foldable-block ul li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 展开后，summary 与第一行正文之间的间距 */
      .prose .foldable-block summary + * {
        margin-top: var(--fold-after-summary-gap, 0.75rem) !important;
      }

      /* 正文的左右内边距（不影响 summary）*/
      .prose .foldable-block > :where(p,h1,h2,h3,h4,h5,h6,ul,ol,pre,blockquote,table,div) {
        padding-left: var(--fold-content-px) !important;
        padding-right: var(--fold-content-px) !important;
      }

      /* 正文底部留白，避免紧贴边框 */
      .prose .foldable-block > :not(summary):last-child {
        margin-bottom: var(--fold-content-py, 1rem) !important;
      }

      /* 列表的特殊处理，使其与周围块有合适的间距，同时内部保持紧凑 */
      .prose .foldable-block > ul,
      .prose .foldable-block > ol {
        padding-left: calc(var(--fold-content-px, 1.25rem) + var(--fold-nested-indent, 1.25rem)) !important;
        padding-right: var(--fold-content-px, 1.25rem) !important;
        margin-top: var(--fold-list-mt, 0.25rem) !important;
        margin-bottom: var(--fold-list-mb, 0.25rem) !important;
        list-style-position: outside;
      }

      .prose .foldable-block li {
        margin: 0 !important;
        padding: 0 !important;
        line-height: var(--fold-li-line-height, 1.3) !important;
      }

      .prose .foldable-block li + li {
        margin-top: var(--fold-li-gap, 0.1rem) !important;
      }

      /* 段落、列表、引用使用统一的文字样式 - 与外部元素完全一致 */
      .prose .foldable-block p,
      .prose .foldable-block li,
      .prose .foldable-block blockquote {
        font-size: var(--fold-font-size-base) !important;
        font-weight: 400 !important; /* 统一字体粗细 */
        line-height: 1.6 !important; /* 统一行高 */
        font-family: inherit !important; /* 统一字体族 */
        color: inherit !important; /* 统一颜色，继承父元素 */
      }

      /* 段落紧凑化 */
      .prose .foldable-block p {
        margin: 0 !important;
        font-size: var(--fold-font-size-base) !important;
        font-weight: 400 !important;
        line-height: 1.6 !important;
        font-family: inherit !important;
      }

      /* 标题的顶部间距，底部保持紧凑 - 使用动态字体大小 */
      .prose .foldable-block h1 {
        font-size: calc(var(--fold-font-size-base) * 1.875) !important; /* 相当于text-3xl */
        margin-bottom: 0.125rem !important;
        line-height: var(--fold-heading-line-height, 1.6) !important;
      }
      .prose .foldable-block h2 {
        font-size: calc(var(--fold-font-size-base) * 1.5) !important; /* 相当于text-2xl */
        margin-bottom: 0.125rem !important;
        line-height: var(--fold-heading-line-height, 1.6) !important;
      }
      .prose .foldable-block h3 {
        font-size: calc(var(--fold-font-size-base) * 1.25) !important; /* 相当于text-xl */
        margin-bottom: 0.125rem !important;
        line-height: var(--fold-heading-line-height, 1.6) !important;
      }
      .prose .foldable-block h4,
      .prose .foldable-block h5,
      .prose .foldable-block h6 {
        font-size: var(--fold-font-size-lg) !important;
        margin-bottom: 0.125rem !important;
        line-height: var(--fold-heading-line-height, 1.6) !important;
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
      .prose .foldable-block > ul,
      .prose .foldable-block > ol {
        margin-top: var(--fold-list-mt) !important;
        margin-bottom: var(--fold-list-mb) !important;
        padding-left: calc(var(--fold-content-px) + var(--fold-nested-indent)) !important;
        padding-right: var(--fold-content-px) !important;
        list-style-position: outside !important;
      }
      .prose .foldable-block li {
        margin: 0 !important;
        font-size: var(--fold-font-size-base) !important;
        font-weight: 400 !important; /* 统一字体粗细 */
        line-height: 1.6 !important; /* 统一行高 */
        font-family: inherit !important; /* 统一字体族 */
        display: list-item !important; /* 强制列表项显示 */
      }
      .prose .foldable-block li > p:only-child,
      .prose .foldable-block li p {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: var(--fold-font-size-base) !important;
        font-weight: 400 !important;
        line-height: 1.6 !important;
        font-family: inherit !important;
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
      
      /* 折叠块内代码的字体大小统一 */
      .prose .foldable-block code {
        font-size: var(--fold-font-size-code) !important;
      }
      
      .prose .foldable-block pre code {
        font-size: var(--fold-font-size-code) !important;
      }

      /* Summary 与第一内容元素的间距 - 放在末尾覆盖上面的重置规则 */
      .prose .foldable-block summary + p,
      .prose .foldable-block summary + h1,
      .prose .foldable-block summary + h2,
      .prose .foldable-block summary + h3,
      .prose .foldable-block summary + h4,
      .prose .foldable-block summary + h5,
      .prose .foldable-block summary + h6,
      .prose .foldable-block summary + ul,
      .prose .foldable-block summary + ol,
      .prose .foldable-block summary + pre,
      .prose .foldable-block summary + blockquote,
      .prose .foldable-block summary + table,
      .prose .foldable-block summary + div {
        margin-top: var(--fold-after-summary-gap, 1rem) !important;
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
          <PhotoProvider 
            maskOpacity={isDark ? 0.9 : 0.8}
            bannerVisible={false}
            maskStyle={{
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)'
            }}
            toolbarRender={({ rotate, onRotate, scale, onScale }) => (
              <div className={`flex items-center space-x-3 backdrop-blur-sm rounded-lg px-3 py-2 ${
                isDark 
                  ? 'bg-gray-800/40 border border-gray-600/30' 
                  : 'bg-white/20 border border-white/30'
              }`}>
                <button
                  onClick={() => onScale(scale + 0.5)}
                  className={`p-2 transition-colors ${
                    isDark 
                      ? 'text-gray-100 hover:text-blue-300' 
                      : 'text-white hover:text-blue-200'
                  }`}
                  aria-label="放大"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button
                  onClick={() => onScale(scale - 0.5)}
                  className={`p-2 transition-colors ${
                    isDark 
                      ? 'text-gray-100 hover:text-blue-300' 
                      : 'text-white hover:text-blue-200'
                  }`}
                  aria-label="缩小"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </button>
                <button
                  onClick={() => onRotate(rotate + 90)}
                  className={`p-2 transition-colors ${
                    isDark 
                      ? 'text-gray-100 hover:text-blue-300' 
                      : 'text-white hover:text-blue-200'
                  }`}
                  aria-label="旋转"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            )}
            overlayRender={({ images, index }) => {
              const currentImage = images[index];
              return currentImage?.alt ? (
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 backdrop-blur-sm px-4 py-2 rounded-lg max-w-md text-center ${
                  isDark 
                    ? 'bg-gray-800/60 text-gray-100 border border-gray-600/30' 
                    : 'bg-black/50 text-white border border-white/20'
                }`}>
                  {currentImage.alt}
                </div>
              ) : null;
            }}
          >
          <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeRaw,
            [rehypeSanitize, sanitizeSchema],
            rehypeSlug
          ]}
          components={{
            code: ({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
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
              const textStyles = getUnifiedTextStyles();
              return (
                <p
                  className={`${textStyles.className} mb-4`}
                  style={textStyles.style}
                >
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
            blockquote: ({ children }) => {
              const textStyles = getUnifiedTextStyles();
              return (
                <blockquote
                  className={`border-l-4 border-primary-500 pl-4 py-1.5 my-4 ${textStyles.className}`}
                  style={{
                    ...textStyles.style,
                    quotes: 'none',
                    fontStyle: 'normal',
                  }}
                >
                  <div style={{ quotes: 'none', fontStyle: 'normal' }}>
                    {children}
                  </div>
                </blockquote>
              );
            },
            ul: ({ children }) => {
              const textStyles = getUnifiedTextStyles();
              return (
                <ul
                  className={`list-disc list-outside !ml-0 pl-5 mb-4 ${textStyles.className}`}
                  style={textStyles.style}
                >
                  {children}
                </ul>
              );
            },
            ol: ({ children, start, ...props }) => {
              const textStyles = getUnifiedTextStyles();
              return (
                <ol
                  start={start}
                  className={`list-decimal list-outside !ml-0 pl-5 mb-4 ${textStyles.className}`}
                  style={{
                    ...textStyles.style,
                    listStylePosition: 'outside'
                  }}
                  {...props}
                >
                  {children}
                </ol>
              );
            },
            li: ({ children }) => {
              const textStyles = getUnifiedTextStyles();
              return (
                <li
                  className={`ml-0 ${textStyles.className}`}
                  style={{
                    ...textStyles.style,
                    display: 'list-item',
                    listStylePosition: 'outside'
                  }}
                >
                  {children}
                </li>
              );
            },
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
            img: ({ src, alt, node, ...props }) => {
              // Fallback 语法解析：![封面 | w=480 h=320 .mx-auto .rounded](url)
              const parseFallbackAttributes = (altText: string) => {
                const pipeIndex = altText?.indexOf(' | ');
                if (pipeIndex === -1) return { cleanAlt: altText, attributes: {} };
                
                const cleanAlt = altText.substring(0, pipeIndex);
                const attributeString = altText.substring(pipeIndex + 3);
                const attributes: any = {};
                const classes: string[] = [];
                
                const parts = attributeString.split(/\s+/);
                parts.forEach(part => {
                  if (part.startsWith('.')) {
                    classes.push(part.substring(1));
                  } else if (part.includes('=')) {
                    const [key, value] = part.split('=');
                    if (key === 'w' || key === 'width') {
                      attributes.width = value;
                    } else if (key === 'h' || key === 'height') {
                      attributes.height = value;
                    } else {
                      attributes[key] = value;
                    }
                  }
                });
                
                if (classes.length > 0) {
                  attributes.className = classes.join(' ');
                }
                
                return { cleanAlt, attributes };
              };
              
              // 从 node.properties 获取 remark-attr 解析的属性
              const nodeAttributes = node?.properties || {};
              
              // 解析 Fallback 语法
              const { cleanAlt, attributes: fallbackAttributes } = parseFallbackAttributes(alt || '');
              
              // 合并属性：remark-attr 优先级更高
              const finalAttributes = { ...fallbackAttributes, ...nodeAttributes };
              
              // 构建样式和类名
              const customClasses = finalAttributes.className || '';
              const width = finalAttributes.width;
              const height = finalAttributes.height;
              
              // 基础类名，保持响应式和懒加载特性
              const baseClasses = "max-w-full h-auto my-4 cursor-zoom-in transition-transform duration-200 hover:scale-[1.02]";
              const finalClassName = customClasses ? `${baseClasses} ${customClasses}` : baseClasses;
              
              // 构建内联样式
              const inlineStyle: React.CSSProperties = {};
              if (width) {
                inlineStyle.width = width.includes('%') ? width : `${width}px`;
              }
              if (height) {
                inlineStyle.height = height.includes('%') ? height : `${height}px`;
              }
              
              return (
                <PhotoView src={src}>
                  <img
                    src={src}
                    alt={cleanAlt}
                    className={finalClassName}
                    style={inlineStyle}
                    loading="lazy"
                    decoding="async"
                    {...props}
                  />
                </PhotoView>
              );
            },
            // 增强的折叠块支持 - 使用动态字体大小系统
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
              `}
                style={{ fontSize: fontSizes.base }}
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
            `}
                style={{
                  fontSize: fontSizes.base,
                  fontWeight: settings.fontSize === 'sm' ? '500' :
                    settings.fontSize === 'lg' ? '600' :
                      settings.fontSize === 'xl' ? '600' : '500'
                }}>
                <span className="relative z-10 flex items-center">
                  <span className="mr-3 text-blue-600 dark:text-blue-400 font-mono text-xs opacity-70">
                    ▶
                  </span>
                  {children}
                </span>
              </summary>
            ),
          }}
        >
          {content}
          </ReactMarkdown>
          </PhotoProvider>
      </div>
    </>
  );
}