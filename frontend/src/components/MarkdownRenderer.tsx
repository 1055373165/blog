import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Root, Image } from 'mdast';
import type { Root as HastRoot, Element as HastElement, ElementContent } from 'hast';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import { visit } from 'unist-util-visit';
import { useTheme } from '../contexts/ThemeContext';
import {
  Children,
  isValidElement,
  lazy,
  memo,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  baseSlug,
  getMarkdownDocument,
  type MarkdownChunk,
  type MarkdownDocument,
  type MarkdownHeading,
} from '../utils/markdownChunks';
import { REVEAL_HEADING_EVENT, scrollElementIntoView, takePendingReveal } from '../utils/articleNavigation';

// mermaid 体积约 150KB+，仅在文档中真有 ```mermaid 代码块时才动态加载
type MermaidApi = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidApi> | null = null;
const loadMermaid = (): Promise<MermaidApi> => {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 自定义插件：解析图片尺寸语法 {width=200 height=200}
const remarkImageSize = () => {
  return (tree: Root) => {
    visit(tree, 'image', (node: Image) => {
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
    let cancelled = false;
    const renderDiagram = async () => {
      if (!elementRef.current) return;

      try {
        const mermaid = await loadMermaid();
        if (cancelled || !elementRef.current) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: isDark ? '#f9fafb' : '#1f2937',
            primaryBorderColor: '#d1d5db',
            lineColor: isDark ? '#6b7280' : '#374151',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#fafafa',
          },
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
          },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled && elementRef.current) {
          elementRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
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


// 安全策略配置 - 扩展白名单允许图片相关属性和代码块属性
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'video', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    img: [
      'src', 'alt', 'title', 'width', 'height', 'className', 'style',
      'loading', 'decoding', 'data-*'
    ],
    video: [
      'src', 'controls', 'preload', 'style', 'className', 'width', 'height',
      'poster', 'muted', 'loop', 'autoplay', 'playsInline'
    ],
    source: ['src', 'type'],
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

const REMARK_PLUGINS = [remarkGfm, remarkImageSize];

function hastText(node: HastElement | ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(hastText).join('');
  return '';
}

/* Assigns heading ids precomputed from the whole document (see markdownChunks),
   so ids stay unique and stable although each chunk is parsed on its own.
   Matching is by slugged text; anything unmatched gets a chunk-scoped id. */
const rehypeHeadingIds = (headings: MarkdownHeading[], chunkIndex: number) => () => (tree: HastRoot) => {
  const pool = headings.slice();
  let fallback = 0;
  visit(tree, 'element', (node: HastElement) => {
    if (!/^h[1-6]$/.test(node.tagName)) return;
    const base = baseSlug(hastText(node).trim());
    const i = pool.findIndex((h) => h.base === base);
    const id = i >= 0 ? pool.splice(i, 1)[0].id : `${base || 'section'}-c${chunkIndex}-${fallback++}`;
    node.properties = { ...node.properties, id };
  });
};

/* Safari 没有 requestIdleCallback，退化为短 setTimeout */
const hasIdleCallback = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function';
const requestIdle = (cb: () => void): number =>
  hasIdleCallback ? window.requestIdleCallback(cb, { timeout: 300 }) : window.setTimeout(cb, 16);
const cancelIdle = (h: number) => (hasIdleCallback ? window.cancelIdleCallback(h) : window.clearTimeout(h));

/* ─── Code blocks: plain text first, syntax highlighting once near the viewport ─── */
const CodeHighlighter = lazy(() => import('./CodeHighlighter'));

/* The theme table (syntax-vendor chunk) is fetched once — after the article has fully
   rendered, or when the first code block nears the viewport — so plain code can use the
   theme's font metrics and highlighting swaps in without reflow. */
type CodeMetricsFn = typeof import('./code/codeThemes')['getCodeMetrics'];
let codeMetrics: CodeMetricsFn | null = null;
let codeThemesPromise: Promise<void> | null = null;
const loadCodeThemes = () =>
  (codeThemesPromise ??= import('./code/codeThemes').then((m) => {
    codeMetrics = m.getCodeMetrics;
  }));
/* vscDarkPlus (the default theme) until the table has loaded */
const DEFAULT_CODE_METRICS = { fontSize: '13px', lineHeight: 1.5, fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace' };

interface LazyCodeProps {
  code: string;
  language: string;
  themeName: string;
  isDark: boolean;
  wordWrap: boolean;
  fontSizeClass: string;
}

function LazyCode(props: LazyCodeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadCodeThemes();
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '800px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // 与高亮后的版式一致（主题字号 / 行高 / 字体 + 同样的内边距与背景），替换时不跳动
  const metrics = codeMetrics ? codeMetrics(props.themeName) : DEFAULT_CODE_METRICS;
  const plain = (
    <div
      className={`overflow-x-auto ${props.fontSizeClass}`}
      style={{
        padding: '16px',
        fontSize: metrics.fontSize,
        lineHeight: metrics.lineHeight,
        fontFamily: metrics.fontFamily,
        whiteSpace: props.wordWrap ? 'pre-wrap' : 'pre',
        background: props.isDark ? '#111827' : '#f9fafb',
        color: props.isDark ? '#e5e7eb' : '#1f2937',
      }}
    >
      <code>{props.code}</code>
    </div>
  );

  return (
    <div ref={ref} className="my-1">
      {near ? <Suspense fallback={plain}><CodeHighlighter {...props} /></Suspense> : plain}
    </div>
  );
}

/* ─── <details>: the body is only rendered once the reader first opens it ─── */
type LazyDetailsProps = React.DetailsHTMLAttributes<HTMLDetailsElement> & { node?: unknown; children?: ReactNode };

function LazyDetails({ children, open, ...props }: LazyDetailsProps) {
  // react-markdown 传入的 hast 节点不能落到 DOM 上
  const rest = { ...props };
  delete rest.node;
  const [opened, setOpened] = useState(Boolean(open));
  const items = Children.toArray(children);
  const isSummary = (c: ReactNode) =>
    isValidElement(c) && (c.props as { node?: { tagName?: string } }).node?.tagName === 'summary';
  const summary = items.filter(isSummary);
  const body = items.filter((c) => !isSummary(c));

  return (
    <details
      {...rest}
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      {summary}
      {opened ? body : null}
    </details>
  );
}

/* ─── Progressive rendering of chunks ─── */

/* Rendered height per source character, measured on long bilingual articles */
const PX_PER_CHAR = 0.62;
/* Render placeholders this close to the viewport right away */
const PLACEHOLDER_ROOT_MARGIN = '1500px 0px';


const MarkdownChunkView = memo(function MarkdownChunkView({ chunk, components }: { chunk: MarkdownChunk; components: Components }) {
  const rehypePlugins = useMemo(
    () => [
      rehypeRaw,
      [rehypeSanitize as unknown as never, sanitizeSchema],
      rehypeHeadingIds(chunk.headings, chunk.index),
    ],
    [chunk]
  );
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={rehypePlugins as never} components={components}>
      {chunk.source}
    </ReactMarkdown>
  );
});

interface ChunkSectionProps {
  chunk: MarkdownChunk;
  components: Components;
  /** Estimated height, used until the browser lays the section out for real */
  estimatedHeight: number;
}

/* content-visibility: auto from the first render: off-screen sections of a very long
   article skip style, layout and paint entirely. No height is measured here — reading
   offsetHeight after each mount would force a synchronous layout of the whole document.
   The `auto` intrinsic size lets the browser remember a section's real height once it
   has been rendered, and native scroll anchoring absorbs the correction. */
function ChunkSection({ chunk, components, estimatedHeight }: ChunkSectionProps) {
  return (
    <section
      data-chunk={chunk.index}
      style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${estimatedHeight}px` }}
    >
      <MarkdownChunkView chunk={chunk} components={components} />
    </section>
  );
}

interface ProgressiveMarkdownProps {
  doc: MarkdownDocument;
  components: Components;
}

function ProgressiveMarkdown({ doc, components }: ProgressiveMarkdownProps) {
  const total = doc.chunks.length;
  const [rendered, setRendered] = useState<ReadonlySet<number>>(() => new Set([0]));
  const priority = useRef<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderNow = useCallback((indices: number[]) => {
    setRendered((prev) => {
      const missing = indices.filter((i) => i >= 0 && i < total && !prev.has(i));
      if (missing.length === 0) return prev;
      const next = new Set(prev);
      missing.forEach((i) => next.add(i));
      return next;
    });
  }, [total]);

  /* Idle fill: prioritized chunks first (after a jump), then in document order.
     The next chunk is picked inside the updater from the latest state — IntersectionObserver
     may have rendered chunks meanwhile, and a no-op update here would stall the fill. */
  useEffect(() => {
    if (rendered.size >= total) {
      // 全文渲染完之后再空闲预取代码主题表，避免与首屏和分段渲染抢主线程
      const handle = requestIdle(() => void loadCodeThemes());
      return () => cancelIdle(handle);
    }
    priority.current = priority.current.filter((i) => i >= 0 && i < total && !rendered.has(i));
    const handle = requestIdle(() => {
      startTransition(() => {
        setRendered((prev) => {
          let next = priority.current.find((i) => !prev.has(i)) ?? -1;
          if (next < 0) for (let i = 0; i < total; i++) if (!prev.has(i)) { next = i; break; }
          if (next < 0) return prev;
          const updated = new Set(prev);
          updated.add(next);
          return updated;
        });
      });
    });
    return () => cancelIdle(handle);
  }, [rendered, total]);

  /* Placeholders near the viewport render immediately (fast scrolling / jumps) */
  useEffect(() => {
    const root = containerRef.current;
    if (!root || rendered.size >= total) return;
    const io = new IntersectionObserver(
      (entries) => {
        const near = entries
          .filter((e) => e.isIntersecting)
          .map((e) => Number((e.target as HTMLElement).dataset.chunkPlaceholder));
        if (near.length > 0) renderNow(near);
      },
      { rootMargin: PLACEHOLDER_ROOT_MARGIN }
    );
    root.querySelectorAll<HTMLElement>('[data-chunk-placeholder]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rendered, total, renderNow]);

  /* Reveal a heading that isn't rendered yet (TOC click, resume reading, #hash):
     render its chunk, then scroll once that render has committed */
  const pendingReveal = useRef<string | null>(null);

  const reveal = useCallback((id: string) => {
    const heading = doc.headings.find((h) => h.id === id);
    if (!heading) return;
    pendingReveal.current = id;
    // 目标之后的段落优先补齐，读者接着往下读时不会遇到占位
    priority.current.unshift(heading.chunk + 2, heading.chunk + 3);
    // 连同前一段一起渲染：scroll-margin 让目标上方露出的那一截是真实内容而非占位
    renderNow([heading.chunk - 1, heading.chunk, heading.chunk + 1]);
  }, [doc, renderNow]);

  useLayoutEffect(() => {
    const id = pendingReveal.current;
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    pendingReveal.current = null;
    scrollElementIntoView(el, { instant: true });
  }, [rendered]);

  useEffect(() => {
    const onReveal = () => {
      const id = takePendingReveal();
      if (id) reveal(id);
    };
    window.addEventListener(REVEAL_HEADING_EVENT, onReveal);
    // 渲染器是懒加载的：挂载前发出的跳转请求（如过早点了"继续阅读"）在这里补上
    onReveal();
    // 文章是异步加载的，浏览器自身的 #锚点 定位发生在正文出现之前，这里补做一次
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    if (target) scrollElementIntoView(target, { instant: true });
    else if (hash) reveal(hash);
    return () => window.removeEventListener(REVEAL_HEADING_EVENT, onReveal);
  }, [reveal]);

  return (
    <div ref={containerRef}>
      {doc.chunks.map((chunk) => {
        // 估算高度只取决于该段字数，保持不变：若随渲染进度整体重算，视口上方的占位会一起变高，正文整屏跳动
        const estimate = Math.round(chunk.source.length * PX_PER_CHAR);
        if (rendered.has(chunk.index)) {
          return (
            <ChunkSection key={chunk.index} chunk={chunk} components={components} estimatedHeight={estimate} />
          );
        }
        // overflow-anchor: none — 占位会被替换掉，不能被浏览器选作滚动锚点，否则锚点消失后无法补偿位移
        return (
          <div
            key={chunk.index}
            data-chunk-placeholder={chunk.index}
            style={{ height: estimate, overflowAnchor: 'none' }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { settings, isDark } = useTheme();
  
  const doc = useMemo(() => getMarkdownDocument(content), [content]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 图片查看器状态管理 — 点击时再从已渲染的正文收集图片，避免渲染后 setState 引发整篇重渲染
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [slides, setSlides] = useState<Array<{ src: string; alt?: string; width?: number; height?: number }>>([]);

  const openLightbox = useCallback((src: string) => {
    const images = Array.from(
      containerRef.current?.querySelectorAll<HTMLImageElement>('.markdown-image') ?? []
    );
    setSlides(
      images.map((img) => ({
        src: img.currentSrc || img.src,
        alt: img.alt,
        width: img.naturalWidth || img.width || undefined,
        height: img.naturalHeight || img.height || undefined,
      }))
    );
    setLightboxIndex(Math.max(0, images.findIndex((img) => img.src === src || img.getAttribute('src') === src)));
    setLightboxOpen(true);
  }, []);

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

      /* Lightbox样式优化：增强遮罩强度，提升图片与背景的对比度 */
      .yarl__container {
        background: rgba(0, 0, 0, 0.90) !important;
      }

      /* 暗模式适配：使用更深的遮罩以获得最佳视觉效果 */
      .dark .yarl__container {
        background: rgba(0, 0, 0, 0.95) !important;
      }

      /* 图片容器：白色画布效果，确保黑色线条清晰可见 */
      .yarl__slide {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 2rem !important;
        background: transparent !important;
        /* 允许内容溢出，支持缩放后的拖拽查看 */
        overflow: visible !important;
      }

      /* 图片本身：添加白色背景，形成画廊效果 */
      .yarl__slide img {
        background: white !important;
        /* 使用 outline 创建白色边框，不占据布局空间，不影响拖拽 */
        outline: 24px solid white !important;
        outline-offset: 0px !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        /* 移除 max-width/max-height 限制，允许 Zoom 插件自由控制尺寸 */
        /* Zoom 插件会自动处理：初始适配视窗，缩放后可超出并拖拽 */
        object-fit: contain !important;
        /* 确保图片可以被拖拽 */
        user-select: none !important;
        -webkit-user-drag: none !important;
        pointer-events: auto !important;
        cursor: grab !important;
      }

      /* 拖拽时的光标 */
      .yarl__slide img:active {
        cursor: grabbing !important;
      }

      /* 确保所有 Lightbox 容器允许溢出，支持缩放后的拖拽查看 */
      .yarl__slide_container,
      .yarl__slide_image_container,
      .yarl__slide_image {
        overflow: visible !important;
      }

      /* 确保拖拽手势能够正确触发 */
      .yarl__slide {
        pointer-events: auto !important;
        touch-action: none !important;  /* 禁用浏览器默认触摸行为，让Zoom插件接管 */
      }

      /* 暗模式：使用浅灰色背景，既保持对比度又不刺眼 */
      .dark .yarl__slide img {
        background: #f3f4f6 !important;
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

  // 组件映射只在主题 / 字号 / 代码设置变化时重建，保证已渲染的段落不会被重新解析
  const components = useMemo<Components>(() => ({
    code: ({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // 确保children是字符串
      const codeString = String(children).trim();

      // Mermaid diagram rendering
      if (!inline && language === 'mermaid') {
        return <MermaidDiagram code={codeString} isDark={isDark} />;
      }

      // 多行代码块 — 先纯文本，接近视口再加载高亮
      if (!inline && codeString.includes('\n')) {
        return (
          <LazyCode
            code={codeString}
            language={language}
            themeName={settings.codeTheme}
            isDark={isDark}
            wordWrap={settings.wordWrap}
            fontSizeClass={settings.fontSize === 'sm' ? 'text-sm' : settings.fontSize === 'lg' ? 'text-lg' : settings.fontSize === 'xl' ? 'text-xl' : 'text-base'}
          />
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
    video: ({ ...props }) => {
      return (
        <video
          {...props}
          controls={props.controls ?? true}
          autoPlay={props.autoPlay ?? true}
          loop={props.loop ?? true}
          muted={props.muted ?? true}
          playsInline={props.playsInline ?? true}
          preload={typeof props.preload === 'string' ? props.preload : 'metadata'}
        />
      );
    },
    a: ({ href, children }) => {
      return (
        <a
          href={href}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
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
    img: ({ node, alt, src, ...props }) => {
      // Fallback 语法解析：![封面 | w=480 h=320 .mx-auto .rounded](url)
      const parseFallbackAttributes = (altText: string) => {
        const pipeIndex = altText?.indexOf(' | ');
        if (pipeIndex === -1) return { cleanAlt: altText, attributes: {} };
        
        const cleanAlt = altText.substring(0, pipeIndex);
        const attributeString = altText.substring(pipeIndex + 3);
        const attributes: Record<string, string> = {};
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
      const nodeAttributes = (node?.properties || {}) as Record<string, string>;
      
      // 解析 Fallback 语法
      const { cleanAlt, attributes: fallbackAttributes } = parseFallbackAttributes(alt || '');
      
      // 合并属性：remark-attr 优先级更高
      const finalAttributes = { ...fallbackAttributes, ...nodeAttributes };
      
      // 构建样式和类名
      const customClasses = finalAttributes.className || '';
      const width = finalAttributes.width;
      const height = finalAttributes.height;
      
      // 基础类名，保持响应式和懒加载特性
      const baseClasses = "max-w-full h-auto my-4 cursor-zoom-in transition-all duration-200 hover:scale-[1.02] hover:shadow-lg rounded-lg";
      const finalClassName = customClasses ? `${baseClasses} ${customClasses}` : baseClasses;
      
      // 构建内联样式
      const inlineStyle: React.CSSProperties = {};
      if (width) {
        inlineStyle.width = width.includes('%') ? width : `${width}px`;
      }
      if (height) {
        inlineStyle.height = height.includes('%') ? height : `${height}px`;
      }
      
      if (!src) return null;
      
      return (
        <img
          src={src}
          alt={cleanAlt}
          className={`markdown-image ${finalClassName}`}
          style={inlineStyle}
          loading="lazy"
          decoding="async"
          onClick={() => openLightbox(src)}
          {...props}
        />
      );
    },
    // 增强的折叠块支持 - 使用动态字体大小系统
    details: ({ children, ...props }) => (
      <LazyDetails
        className={`
        foldable-block group relative my-6 
        border border-gray-200/80 dark:border-gray-700/80 
        rounded-xl shadow-sm hover:shadow-md
        bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/30 dark:to-gray-900/50
        overflow-hidden
        transition-[border-color,box-shadow] duration-300 ease-in-out
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
      </LazyDetails>
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
  // getUnifiedTextStyles / fontSizes 均由 settings 派生
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [settings, isDark, openLightbox]);

  return (
    <>
      {/* 注入折叠块的自定义样式 */}
      <div dangerouslySetInnerHTML={{ __html: foldableStyles }} />

      <div ref={containerRef} className={`prose dark:prose-invert max-w-none prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 [&_video]:w-full [&_video]:max-w-full [&_video]:rounded-xl [&_video]:shadow-medium [&_video]:border [&_video]:border-gray-200 dark:[&_video]:border-gray-700 [&_video]:bg-black [&_video]:my-6 ${className}`}>
          <ProgressiveMarkdown key={doc.id} doc={doc} components={components} />
      </div>
      
      {/* Lightbox 组件 */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        plugins={[Zoom, Fullscreen]}
        zoom={{
          maxZoomPixelRatio: 8,           // 提升至 8x（适配大型 SVG 图表的细节查看）
          zoomInMultiplier: 1.5,          // 降至 1.5x（2x 步进过大）
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 4,         // 增至 4 步（提供更多缩放级别）
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
        controller={{
          closeOnPullDown: true,
          closeOnBackdropClick: true,
        }}
        render={{
          iconClose: () => (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          iconZoomIn: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          ),
          iconZoomOut: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          ),
          iconEnterFullscreen: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m2-5h3m0 0v3M3 16v3a2 2 0 002 2h3m-6-5h3m0 0v3m10-3h3a2 2 0 002-2v-3m-6 5h3m0-3v3m0-10V5a2 2 0 00-2-2h-3m6 5h-3m0 0V3" />
            </svg>
          ),
          iconExitFullscreen: () => (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0 0l5.5 5.5" />
            </svg>
          ),
        }}
      />
    </>
  );
}