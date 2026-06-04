var CACHE = 'mytoolbox-v7';
var URLS = ['/', '/index.html', '/style.css', '/data.js?v=2', '/ui.js?v=2', '/modal.js?v=2', '/features.js?v=2', '/theme.js?v=2', '/supabase.js?v=2', '/particles.js?v=2', '/manifest.json', '/icon.svg'];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) {
        // 闁劒閲滅紓鎾崇摠閿涘奔鎹㈡稉鈧径杈Е娑撳秴濂栭崫宥嗘殻娴ｆ挸鐣ㄧ憗?        return Promise.all(URLS.map(function(url) {
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


