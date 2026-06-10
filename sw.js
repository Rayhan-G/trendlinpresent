// ============================================
// ULTRA PRO MAX SERVICE WORKER v5.0.0
// Enterprise-grade with advanced caching strategies
// ============================================

const CACHE_NAME = 'ultra-platform-v5';
const OFFLINE_URL = '/offline.html';

// Intelligent cache versioning
const CACHE_CONFIG = {
    static: 'static-v5',
    images: 'images-v5',
    api: 'api-v5',
    fonts: 'fonts-v5'
};

// Assets that NEVER change - cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/404.html',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap',
    'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
];

// Image extensions to cache separately
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i;

// API endpoints with different strategies
const API_CACHE_STRATEGIES = {
    '/data/posts.json': { strategy: 'stale-while-revalidate', ttl: 600 }, // 10 min
    '/api/trending': { strategy: 'network-first', ttl: 300 }, // 5 min
    '/api/comments': { strategy: 'network-only', ttl: 0 }
};

// ============================================
// INSTALL EVENT - Precache critical assets
// ============================================
self.addEventListener('install', event => {
    console.log('[SW] Installing Ultra Pro Max v5...');
    
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_CONFIG.static);
            
            // Cache static assets with error handling
            const cachePromises = STATIC_ASSETS.map(async (asset) => {
                try {
                    const response = await fetch(asset, { cache: 'reload' });
                    if (response.ok) {
                        await cache.put(asset, response);
                        console.log(`[SW] Cached: ${asset}`);
                    }
                } catch (error) {
                    console.warn(`[SW] Failed to cache: ${asset}`, error);
                }
            });
            
            await Promise.allSettled(cachePromises);
            
            // Create offline page if doesn't exist
            await createOfflinePage();
            
            console.log('[SW] Installation complete!');
        })()
    );
    
    // Force activate immediately
    self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activating Ultra Pro Max v5...');
    
    event.waitUntil(
        (async () => {
            // Get all cache names
            const cacheNames = await caches.keys();
            const validCaches = Object.values(CACHE_CONFIG);
            
            // Delete old caches
            const deletePromises = cacheNames.map(async cacheName => {
                if (!validCaches.includes(cacheName)) {
                    console.log(`[SW] Deleting old cache: ${cacheName}`);
                    await caches.delete(cacheName);
                }
            });
            
            await Promise.all(deletePromises);
            
            // Take control of all clients
            await self.clients.claim();
            
            console.log('[SW] Activation complete! Active caches:', validCaches);
        })()
    );
});

// ============================================
// FETCH EVENT - Intelligent caching strategies
// ============================================
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return event.respondWith(fetch(request));
    }
    
    // ========================================
    // STRATEGY 1: STALE-WHILE-REVALIDATE (API)
    // ========================================
    if (url.pathname === '/data/posts.json' || url.pathname.includes('/api/')) {
        return event.respondWith(staleWhileRevalidate(request, url.pathname));
    }
    
    // ========================================
    // STRATEGY 2: CACHE FIRST (Images & Fonts)
    // ========================================
    if (IMAGE_EXTENSIONS.test(url.pathname) || url.pathname.includes('/fonts/')) {
        return event.respondWith(cacheFirst(request));
    }
    
    // ========================================
    // STRATEGY 3: NETWORK FIRST (HTML pages)
    // ========================================
    if (request.headers.get('accept')?.includes('text/html')) {
        return event.respondWith(networkFirstWithFallback(request));
    }
    
    // ========================================
    // STRATEGY 4: CACHE WITH NETWORK FALLBACK (Everything else)
    // ========================================
    return event.respondWith(cacheWithNetworkFallback(request));
});

// ============================================
// CORE STRATEGY FUNCTIONS
// ============================================

/**
 * Stale-While-Revalidate: Serve cached then update
 * Best for API data where freshness matters but speed is critical
 */
async function staleWhileRevalidate(request, pathname) {
    const cache = await caches.open(CACHE_CONFIG.api);
    const cachedResponse = await cache.match(request);
    
    // Get strategy config
    const strategy = API_CACHE_STRATEGIES[pathname] || 
                     { strategy: 'stale-while-revalidate', ttl: 300 };
    
    // Fetch fresh data in background
    const fetchPromise = fetch(request).then(async networkResponse => {
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn(`[SW] Network failed for ${pathname}:`, error);
        return null;
    });
    
    // Return cached immediately if available
    if (cachedResponse) {
        // Update cache in background
        event.waitUntil(fetchPromise);
        return cachedResponse;
    }
    
    // No cache, wait for network
    const networkResponse = await fetchPromise;
    if (networkResponse?.ok) return networkResponse;
    
    // Ultimate fallback
    return new Response(JSON.stringify({
        error: 'offline',
        message: 'You are offline. Please check your connection.',
        timestamp: Date.now()
    }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Cache First: Try cache, fallback to network
 * Best for static assets that rarely change
 */
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_CONFIG.images);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return placeholder image for images
        if (IMAGE_EXTENSIONS.test(request.url)) {
            return new Response(null, { status: 404, statusText: 'Image Not Found' });
        }
        throw error;
    }
}

/**
 * Network First: Try network, fallback to cache
 * Best for HTML pages where freshness is critical
 */
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_CONFIG.static);
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error(`HTTP ${networkResponse.status}`);
    } catch (error) {
        console.warn('[SW] Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Ultimate fallback - offline page
        return caches.match(OFFLINE_URL);
    }
}

/**
 * Cache with Network Fallback: Try cache, then network
 * Best for CSS, JS, and other assets
 */
async function cacheWithNetworkFallback(request) {
    const cache = await caches.open(CACHE_CONFIG.static);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        event.waitUntil(
            fetch(request).then(async networkResponse => {
                if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                }
            }).catch(() => {})
        );
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn(`[SW] Failed to fetch: ${request.url}`, error);
        return new Response(null, { status: 404, statusText: 'Not Found' });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create offline page dynamically if not exists
 */
async function createOfflinePage() {
    const offlineHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline | UltimateRead</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .offline-container {
            background: white;
            border-radius: 2rem;
            padding: 3rem;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        h1 { font-size: 4rem; margin-bottom: 1rem; }
        p { color: #5a5a7a; margin: 1rem 0; line-height: 1.6; }
        .retry-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 100px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
        }
        .articles-list {
            margin-top: 2rem;
            text-align: left;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5rem;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <h1>📡</h1>
        <h2>You're Offline</h2>
        <p>Please check your internet connection and try again.</p>
        <button class="retry-btn" onclick="location.reload()">⟳ Retry Connection</button>
        <div class="articles-list">
            <p style="font-size: 0.875rem; color: #8a8aa8;">💡 Tip: Previously viewed articles are available offline</p>
        </div>
    </div>
</body>
</html>`;
    
    const cache = await caches.open(CACHE_CONFIG.static);
    const offlineResponse = new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
    });
    await cache.put(OFFLINE_URL, offlineResponse);
}

/**
 * Background sync for failed requests
 */
self.addEventListener('sync', event => {
    if (event.tag === 'sync-failed-requests') {
        event.waitUntil(syncFailedRequests());
    }
});

async function syncFailedRequests() {
    const cache = await caches.open('failed-requests-v1');
    const requests = await cache.keys();
    
    for (const request of requests) {
        try {
            const response = await fetch(request);
            if (response.ok) {
                await cache.delete(request);
                console.log('[SW] Synced failed request:', request.url);
            }
        } catch (error) {
            console.warn('[SW] Failed to sync:', request.url);
        }
    }
}

/**
 * Push notification support
 */
self.addEventListener('push', event => {
    const data = event.data?.json() || { title: 'New Article', body: 'Check out our latest content!' };
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/badge.png',
            data: { url: data.url || '/' }
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// ============================================
// MESSAGE HANDLING (for page communication)
// ============================================
self.addEventListener('message', event => {
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            (async () => {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                event.ports[0].postMessage({ status: 'Cache cleared' });
            })()
        );
    }
    
    if (event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            (async () => {
                const cache = await caches.open(CACHE_CONFIG.api);
                const keys = await cache.keys();
                event.ports[0].postMessage({ size: keys.length });
            })()
        );
    }
});

// Log successful registration
console.log('[SW] Ultra Pro Max v5.0.0 loaded successfully!');