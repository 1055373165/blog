import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 图片缓存 Service Worker — 仅服务于回访，推迟到页面加载完成且主线程空闲后再注册，
// 避免首屏期间的安装与预缓存抢占带宽
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const register = () => navigator.serviceWorker.register('/sw-image-cache.js').catch(() => {})
    if ('requestIdleCallback' in window) window.requestIdleCallback(register, { timeout: 5000 })
    else setTimeout(register, 3000)
  })
}
