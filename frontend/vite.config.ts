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

          // Mermaid 不在此处手工 chunk —— 它依赖大量带原型链初始化模式的包
          // (lodash-es/chevrotain/dayjs/roughjs/d3 等)，手工分块会把
          // `Foo.prototype.method = ...` 这类副作用赋值与 `new Foo()` 拆到不同 chunk，
          // 引发运行时 "this.X is not a function" 类错误。
          // mermaid 已在 MarkdownRenderer 内通过动态 import 加载，
          // Rollup 会自动按动态 import 边界生成独立 chunk，且不进首屏 preload。
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

          // 其余 node_modules 不强制 chunk —— 交给 Rollup 按 import 边界（特别是
          // 动态 import 边界）自动决定。这样 mermaid/lodash-es/chevrotain/d3/dayjs
          // 这类 mermaid 传递依赖会被自动归到 mermaid 动态 chunk，而不是堆进 vendor。
          return undefined
        },
      },
    },
  },
}))
