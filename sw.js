var CACHE = 'mytoolbox-v5';
var URLS = ['/', '/index.html', '/style.css', '/data.js', '/ui.js', '/modal.js', '/features.js', '/theme.js', '/supabase.js', '/particles.js', '/manifest.json', '/icon.svg'];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) {
        // 逐个缓存，任一失败不影响整体安装
        return Promise.all(URLS.map(function(url) {
            return c.add(url).catch(function(err) { console.warn('SW cache skip:', url, err); });
        }));
    }));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) { return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })); }));
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request).then(function(res) { var clone = res.clone(); caches.open(CACHE).then(function(c) { c.put(e.request, clone); }); return res; }); }));
});
