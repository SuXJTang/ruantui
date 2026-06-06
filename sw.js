// ============================================
// sw.js — Service Worker：缓存优先 + 版本自动管理
// ============================================
// 版本号可通过修改此字符串触发现有新缓存失效
var CACHE_PREFIX = 'ruantui';
var CACHE_VERSION = 'v8';  // 更新静态资源时手动递增此版本号
var CACHE = CACHE_PREFIX + '-' + CACHE_VERSION;

var URLS = [
    '/', '/index.html', '/style.css', '/shared.js',
    '/data.js', '/ui.js', '/modal.js', '/features.js',
    '/theme.js', '/supabase.js', '/particles.js',
    '/manifest.json', '/icon.svg'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(c) {
            return Promise.all(URLS.map(function(url) {
                return c.add(url).catch(function(err) {
                    console.warn('SW cache skip (non-fatal):', url, err);
                });
            }));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) {
                    // 只删除同一前缀的旧版本缓存，不干扰其他 SW
                    return k.startsWith(CACHE_PREFIX + '-') && k !== CACHE;
                }).map(function(k) {
                    console.log('SW: deleting old cache', k);
                    return caches.delete(k);
                })
            );
        })
    );
    self.clients.claim();
});

// 缓存优先策略：先响应缓存，后台更新网络结果替换缓存
self.addEventListener('fetch', function(e) {
    // 只缓存 GET 请求的同源静态资源
    if (e.request.method !== 'GET') return;
    var url = new URL(e.request.url);
    // 不缓存 API 请求
    if (url.pathname.startsWith('/api/')) return;

    e.respondWith(
        caches.match(e.request).then(function(cached) {
            var fetchPromise = fetch(e.request).then(function(res) {
                // 只缓存有效响应
                if (res && res.ok && res.type === 'basic') {
                    var clone = res.clone();
                    caches.open(CACHE).then(function(c) {
                        c.put(e.request, clone);
                    });
                }
                return res;
            }).catch(function() {
                // 网络失败时返回缓存（如有）
                return cached;
            });
            return cached || fetchPromise;
        })
    );
});
