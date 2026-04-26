import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

const ANALYZE = process.env.ANALYZE === '1'

// Bundle 可视化插件按需启用：
// 只有显式 `ANALYZE=1 npm run build` 时才尝试 require，避免把它塞进 lockfile / 生产镜像。
// 想用之前先临时安装：`npm i -D rollup-plugin-visualizer`（用完可直接卸载）。
async function loadVisualizerPlugin(): Promise<PluginOption | null> {
  if (!ANALYZE) return null
  try {
    const mod = await import('rollup-plugin-visualizer')
    return mod.visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }) as unknown as PluginOption
  } catch {
    console.warn('[vite] ANALYZE=1 但未安装 rollup-plugin-visualizer，跳过 bundle 分析')
    return null
  }
}

export default defineConfig(async ({ mode }) => ({
  plugins: [react(), await loadVisualizerPlugin()].filter(Boolean) as PluginOption[],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  esbuild:
    mode === 'production'
      ? { drop: ['console', 'debugger'] }
      : undefined,
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1024,
    // 自定义 modulepreload：只保留真正首屏需要的 vendor chunk，
    // 把大型懒加载分块（markdown/syntax/highlight/mermaid/bytemd/tiptap）从首屏 HTML 中剔除，
    // 它们仅在用户进入对应路由时才按需加载。
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        deps.filter(
          (dep) =>
            !/(markdown|syntax|highlight|mermaid|bytemd|tiptap|dnd|date)-vendor/.test(dep)
        ),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'react-vendor'
          }
          if (id.includes('react-router')) return 'router-vendor'
          if (id.includes('@tanstack/react-query')) return 'query-vendor'
          if (id.includes('axios')) return 'http-vendor'

          // Mermaid + 其全部传递依赖 — 单独成块且仅在动态 import 时拉取
          if (
            id.includes('/mermaid/') ||
            id.includes('@mermaid-js') ||
            id.includes('/dagre') ||
            id.includes('/graphlib') ||
            id.includes('/cytoscape') ||
            id.includes('/elkjs') ||
            id.includes('/khroma') ||
            id.includes('/katex') ||
            id.includes('chevrotain') ||
            id.includes('/d3') ||
            id.includes('/dompurify') ||
            id.includes('@braintree/sanitize-url') ||
            id.includes('/internmap') ||
            id.includes('/delaunator') ||
            id.includes('/robust-predicates') ||
            id.includes('/ts-dedent') ||
            id.includes('/stylis')
          ) {
            return 'mermaid-vendor'
          }
          if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('prismjs')) {
            return 'syntax-vendor'
          }
          if (id.includes('highlight.js') || id.includes('lowlight')) return 'highlight-vendor'

          // unified 生态（react-markdown / bytemd / 各类 remark/rehype 插件共用）
          // 必须把 unified 自身、所有 *-util-*、各种小 util 全部圈进同一个 chunk，
          // 否则跨 chunk 循环 re-export 会触发 "Cannot access X before initialization" TDZ。
          if (
            /node_modules\/(?:unified|bail|trough|vfile|vfile-message|devlop|extend|zwitch|ccount|mdurl|hastscript|html-(?:void-elements|url-attributes)|property-information|web-namespaces|comma-separated-tokens|space-separated-tokens|escape-string-regexp|longest-streak|markdown-table|character-entities[^/]*|decode-named-character-reference|stringify-entities|parse-entities|is-(?:plain-obj|alphabetical|decimal|hexadecimal|alphanumerical|reference)|estree-util-[^/]+|mdast-util-[^/]+|hast-util-[^/]+|unist-util-[^/]+|micromark[^/]*|remark-[^/]+|rehype-[^/]+|react-markdown|@types\/(?:hast|mdast|unist))\//.test(
              id
            )
          ) {
            return 'markdown-vendor'
          }

          // bytemd 编辑器（仅 admin 编辑页用）
          if (
            id.includes('/@bytemd/') ||
            id.includes('/bytemd/') ||
            id.includes('/@uiw/react-md-editor/') ||
            id.includes('/marked/')
          ) {
            return 'bytemd-vendor'
          }

          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'tiptap-vendor'

          if (
            id.includes('@headlessui') ||
            id.includes('@heroicons') ||
            id.includes('lucide-react') ||
            id.includes('@floating-ui') ||
            id.includes('react-photo-view') ||
            id.includes('yet-another-react-lightbox')
          ) {
            return 'ui-vendor'
          }

          if (id.includes('@dnd-kit')) return 'dnd-vendor'
          if (id.includes('date-fns')) return 'date-vendor'
          if (id.includes('@chenglou/pretext')) return 'pretext-vendor'

          return 'vendor'
        },
      },
    },
  },
}))
