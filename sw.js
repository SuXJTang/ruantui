// ============================================
// sw.js — Service Worker v4
// ============================================
// 策略（本次修复的三个真实缺陷见 CHANGELOG「未发布」）：
//   1. 导航请求（HTML）走 network-first —— 之前是 cache-first，所以首页
//      永远先吐缓存里的旧 index.html，用户要等到「第二次访问」才看到新版本。
//   2. 静态资源走 stale-while-revalidate —— 先给缓存保证秒开，同时后台
//      拉新写回缓存，下次访问即最新；之前 `return cached || fetchPromise`
//      既拿不到后台更新的结果，又让后台那次写缓存毫无意义。
//   3. 匹配统一带 ignoreSearch —— 页面请求 style.css?v=11 而预缓存的是
//      ./style.css，query 不同会导致双份缓存；现在一律按路径匹配。
//   4. 预缓存清单改为页面真实依赖的前端资源；去掉 sitemap.xml / robots.txt
//      （搜索引擎抓取用，不是页面依赖，首次安装时多两次无谓请求）。
var CACHE_PREFIX = 'ruantui';
var CACHE_VERSION = 'v19';  // 与 index.html 的 ?v=11 同属一次发布，详见 README「缓存版本号」
var CACHE = CACHE_PREFIX + '-' + CACHE_VERSION;
// 离线回退页：优先 ./，再退到 ./index.html（GitHub Pages 目录会自动解析到 index.html）
var OFFLINE_URLS = ['./', './index.html'];

// 使用相对路径，兼容子路径部署（GitHub Pages 的 /ruantui/ 与 Worker 根路径）
var URLS = [
    './', './index.html', './style.css', './icon.svg', './manifest.json',
    './shared.js', './supabase.js', './data.js', './ui.js', './modal.js',
    './apikey-config.js', './features.js', './theme.js', './particles.js',
    './effects.js', './interactions.js', './engagement.js', './mobile.js',
    './analytics.js', './adsense.js'
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
        }).then(function() {
            return self.clients.claim();
        })
    );
});

function isCacheable(res) {
    // 只缓存同源、成功、非 opaque 的响应
    return res && res.ok && res.type === 'basic';
}

// 缓存 key 统一剥掉 query（?v=11 只是防 HTTP 缓存的版本戳，不是独立资源），
// 否则页面里的 style.css?v=11 会和预缓存的 ./style.css 各存一份。
// 不依赖 caches.match 的 ignoreSearch，因为 put 阶段同样需要归一化。
function cacheKey(request) {
    var u = new URL(typeof request === 'string' ? request : request.url);
    u.search = '';
    u.hash = '';
    return u.href;
}

function putInCache(request, res) {
    if (!isCacheable(res)) return;
    var clone = res.clone();
    var key = cacheKey(request);
    caches.open(CACHE).then(function(c) { c.put(key, clone); }).catch(function() {});
}

// 资源：stale-while-revalidate（命中即回，同时后台刷新）
function staleWhileRevalidate(e) {
    var key = cacheKey(e.request);
    return caches.match(key).then(function(cached) {
        var network = fetch(e.request).then(function(res) {
            putInCache(e.request, res);
            return res;
        }).catch(function() {
            return cached;
        });
        return cached || network;
    });
}

// 导航：network-first，断网回退到缓存的首页
// 缓存 key 同样剥掉 query，避免 ?tool=12 这类深链接各存一份。
function matchOffline(request) {
    return caches.match(cacheKey(request)).then(function(hit) {
        if (hit) return hit;
        var scope = self.registration.scope;
        return caches.match(new URL(OFFLINE_URLS[0], scope).href).then(function(hit2) {
            return hit2 || caches.match(new URL(OFFLINE_URLS[1], scope).href);
        });
    });
}

function networkFirst(e) {
    return fetch(e.request).then(function(res) {
        // 只缓存「干净的」首页响应，避免把 ?tool=12 之类的变体各存一份
        if (res && res.ok && res.type === 'basic') {
            var url = new URL(e.request.url);
            if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
                putInCache(e.request, res);
            }
        }
        return res;
    }).catch(function() {
        return matchOffline(e.request);
    });
}

self.addEventListener('fetch', function(e) {
    // 只处理 GET
    if (e.request.method !== 'GET') return;
    var url = new URL(e.request.url);

    // 跨域资源（字体图标 CDN、AdSense、二维码 API）交给浏览器/Google 自己处理
    if (url.origin !== self.location.origin) return;
    // 不缓存 API 请求
    if (url.pathname.startsWith('/api/')) return;

    if (e.request.mode === 'navigate') {
        e.respondWith(networkFirst(e));
        return;
    }
    e.respondWith(staleWhileRevalidate(e));
});
