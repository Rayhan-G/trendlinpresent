// ULTRA PRO MAX SERVICE WORKER v4.0.0
const CACHE = 'ultra-cache-v4';
const STATIC_ASSETS = ['/', '/index.html', '/offline.html', '/assets/css/critical.css'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) {
        e.respondWith(
            fetch(e.request).catch(() => new Response(JSON.stringify({error:'Offline'}), {
                headers: {'Content-Type':'application/json'}
            }))
        );
    } else {
        e.respondWith(
            caches.match(e.request).then(r => r || fetch(e.request).then(res => {
                if(res.ok) e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, res.clone())));
                return res;
            }))
        );
    }
});
