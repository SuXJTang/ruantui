const CACHE = 'mytoolbox-v2';
const URLS = ['/', '/index.html', '/style.css', '/data.js', '/ui.js', '/modal.js', '/features.js', '/theme.js', '/manifest.json', '/icon.svg'];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(URLS); }));
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) { return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })); }));
});

self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request).then(function(res) { var clone = res.clone(); caches.open(CACHE).then(function(c) { c.put(e.request, clone); }); return res; }); }));
});
