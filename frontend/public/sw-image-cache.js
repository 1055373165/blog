// 图片缓存 Service Worker
const CACHE_NAME = 'book-images-v1';
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 需要缓存的图片文件扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

// 判断是否为图片请求
function isImageRequest(url) {
  return IMAGE_EXTENSIONS.some(ext => url.toLowerCase().includes(ext));
}

// 判断是否为书籍图片
function isBookImage(url) {
  return url.includes('/books/') && isImageRequest(url);
}

// 安装事件
self.addEventListener('install', event => {
  console.log('Image Cache Service Worker 安装中...');
  event.waitUntil(self.skipWaiting());
});

// 激活事件
self.addEventListener('activate', event => {
  console.log('Image Cache Service Worker 已激活');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 清理旧版本的缓存
          if (cacheName !== CACHE_NAME && cacheName.startsWith('book-images-')) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 获取事件 - 拦截图片请求
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // 只处理书籍图片请求
  if (!isBookImage(url) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    handleImageRequest(event.request)
  );
});

// 处理图片请求
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // 检查缓存是否存在且未过期
  if (cached) {
    const cacheTime = cached.headers.get('sw-cache-time');
    if (cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < IMAGE_CACHE_DURATION) {
        console.log('从缓存返回图片:', request.url);
        return cached;
      } else {
        console.log('缓存已过期，删除:', request.url);
        await cache.delete(request);
      }
    }
  }

  try {
    console.log('网络请求图片:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      // 克隆响应用于缓存
      const responseClone = response.clone();
      
      // 添加缓存时间戳
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(await responseClone.arrayBuffer(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      // 异步缓存，不阻塞响应
      cache.put(request, cachedResponse).catch(err => {
        console.error('缓存图片失败:', request.url, err);
      });
      
      return response;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('图片加载失败:', request.url, error);
    
    // 返回默认的错误图片或透明图片
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">图片加载失败</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// 监听消息，支持手动清理缓存
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('图片缓存已清理');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      })
    );
  }
});

// 获取缓存状态
async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const validImages = [];
    const expiredImages = [];
    
    for (const request of keys) {
      const cached = await cache.match(request);
      const cacheTime = cached.headers.get('sw-cache-time');
      
      if (cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < IMAGE_CACHE_DURATION) {
          validImages.push(request.url);
        } else {
          expiredImages.push(request.url);
          await cache.delete(request);
        }
      }
    }
    
    return {
      total: validImages.length,
      expired: expiredImages.length,
      images: validImages
    };
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    return { total: 0, expired: 0, images: [] };
  }
}