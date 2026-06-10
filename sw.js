// ============================================
// ULTRA PRO MAX SERVICE WORKER v5.0.0
// Enterprise-grade with advanced caching strategies
// FIXED FOR YOUR ACTUAL FILE STRUCTURE
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

// ============================================
// FIXED: Assets that match YOUR file structure
// ============================================
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/404.html',
    '/200.html',
    '/manifest.json',
    '/robots.txt',
    '/sitemap-index.xml',
    '/news.xml',
    '/assets/css/main.css',
    '/assets/css/critical.css',
    '/assets/js/main.js',
    '/assets/js/critical.js',
    '/api/v1/posts/index.json',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap'
];

// Image extensions to cache separately
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$/i;

// ============================================
// FIXED: API endpoints that match YOUR structure
// ============================================
const API_CACHE_STRATEGIES = {
    // Your actual API endpoints
    '/api/v1/posts/index.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    '/api/v1/latest.json': { strategy: 'stale-while-revalidate', ttl: 300 },
    '/api/v1/trending.json': { strategy: 'stale-while-revalidate', ttl: 300 },
    '/api/v1/categories.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    
    // Backward compatibility for old paths
    '/data/posts.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    '/posts.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    
    // Dynamic endpoints
    '/api/v1/posts/page/1.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    '/api/v1/posts/page/2.json': { strategy: 'stale-while-revalidate', ttl: 600 },
    '/api/v1/posts/page/3.json': { strategy: 'stale-while-revalidate', ttl: 600 }
};

// Categories that need to be cached
const CATEGORY_PATHS = [
    '/categories/technology/',
    '/categories/wealth/',
    '/categories/health/',
    '/categories/growth/',
    '/categories/entertainment/',
    '/categories/lifestyle/',
    '/categories/world/'
];

// ============================================
// INSTALL EVENT - Precache critical assets
// ============================================
self.addEventListener('install', event => {
    console.log('[SW] Installing Ultra Pro Max v5.0.0...');
    
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_CONFIG.static);
            
            // Cache static assets with error handling
            const cachePromises = STATIC_ASSETS.map(async (asset) => {
                try {
                    const response = await fetch(asset, { cache: 'reload' });
                    if (response.ok) {
                        await cache.put(asset, response);
                        console.log(`[SW] ✅ Cached: ${asset}`);
                    } else {
                        console.warn(`[SW] ⚠️ Failed (${response.status}): ${asset}`);
                    }
                } catch (error) {
                    console.warn(`[SW] ❌ Error caching: ${asset}`, error);
                }
            });
            
            // Cache category pages
            const categoryPromises = CATEGORY_PATHS.map(async (categoryPath) => {
                try {
                    const response = await fetch(categoryPath, { cache: 'reload' });
                    if (response.ok) {
                        await cache.put(categoryPath, response);
                        console.log(`[SW] ✅ Cached category: ${categoryPath}`);
                    }
                } catch (error) {
                    console.warn(`[SW] ⚠️ Category not cached: ${categoryPath}`);
                }
            });
            
            await Promise.allSettled([...cachePromises, ...categoryPromises]);
            
            // Create offline page if doesn't exist
            await createOfflinePage();
            
            console.log('[SW] ✅ Installation complete!');
        })()
    );
    
    // Force activate immediately
    self.skipWaiting();
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activating Ultra Pro Max v5.0.0...');
    
    event.waitUntil(
        (async () => {
            // Get all cache names
            const cacheNames = await caches.keys();
            const validCaches = Object.values(CACHE_CONFIG);
            
            // Delete old caches
            const deletePromises = cacheNames.map(async cacheName => {
                if (!validCaches.includes(cacheName) && !cacheName.includes('failed-requests')) {
                    console.log(`[SW] 🗑️ Deleting old cache: ${cacheName}`);
                    await caches.delete(cacheName);
                }
            });
            
            await Promise.all(deletePromises);
            
            // Take control of all clients
            await self.clients.claim();
            
            console.log('[SW] ✅ Activation complete! Active caches:', validCaches);
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
    
    // Skip analytics/pixel requests
    if (url.pathname.includes('/analytics') || url.pathname.includes('/pixel')) {
        return event.respondWith(fetch(request));
    }
    
    // ========================================
    // STRATEGY 1: STALE-WHILE-REVALIDATE (API)
    // Matches YOUR API structure
    // ========================================
    if (url.pathname.includes('/api/v1/') || 
        url.pathname === '/data/posts.json' || 
        url.pathname === '/posts.json' ||
        url.pathname.includes('/api/trending')) {
        return event.respondWith(staleWhileRevalidate(request, url.pathname));
    }
    
    // ========================================
    // STRATEGY 2: CACHE FIRST (Images & Fonts)
    // ========================================
    if (IMAGE_EXTENSIONS.test(url.pathname) || 
        url.pathname.includes('/fonts/') ||
        url.pathname.includes('/assets/images/')) {
        return event.respondWith(cacheFirst(request));
    }
    
    // ========================================
    // STRATEGY 3: NETWORK FIRST (HTML pages)
    // Includes category pages and post pages
    // ========================================
    if (request.headers.get('accept')?.includes('text/html') ||
        url.pathname.includes('/categories/') ||
        url.pathname.includes('/posts/') ||
        url.pathname.match(/\/\d+\/$/)) {  // Matches /1/, /2/, etc.
        return event.respondWith(networkFirstWithFallback(request));
    }
    
    // ========================================
    // STRATEGY 4: CACHE WITH NETWORK FALLBACK (CSS, JS, etc.)
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
    
    // Get strategy config or use defaults
    const strategy = API_CACHE_STRATEGIES[pathname] || 
                     { strategy: 'stale-while-revalidate', ttl: 300 };
    
    // Fetch fresh data in background
    const fetchPromise = fetch(request.clone()).then(async networkResponse => {
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            console.log(`[SW] 🔄 API updated: ${pathname}`);
        }
        return networkResponse;
    }).catch(error => {
        console.warn(`[SW] ⚠️ Network failed for ${pathname}:`, error);
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
    
    // Ultimate fallback - return cached version of index if available
    const indexCache = await cache.match('/api/v1/posts/index.json');
    if (indexCache) {
        console.log(`[SW] 📦 Using cached index as fallback for ${pathname}`);
        return indexCache;
    }
    
    // Return error response
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
        console.log(`[SW] 📸 Cache hit: ${request.url.split('/').pop()}`);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            console.log(`[SW] 💾 Cached image: ${request.url.split('/').pop()}`);
        }
        return networkResponse;
    } catch (error) {
        // Return placeholder for images
        if (IMAGE_EXTENSIONS.test(request.url)) {
            // Create a simple SVG placeholder
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e2e8f0"/><text x="50" y="55" text-anchor="middle" fill="#94a3b8" font-size="14">📷</text></svg>`;
            return new Response(svg, {
                status: 200,
                headers: { 'Content-Type': 'image/svg+xml' }
            });
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
        const networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_CONFIG.static);
            await cache.put(request, networkResponse.clone());
            console.log(`[SW] 🌐 Network success: ${request.url.split('/').pop() || '/'}`);
            return networkResponse;
        }
        
        throw new Error(`HTTP ${networkResponse.status}`);
    } catch (error) {
        console.warn('[SW] ⚠️ Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`[SW] 💾 Cache hit: ${request.url.split('/').pop() || '/'}`);
            return cachedResponse;
        }
        
        // For category pages, try to serve main page
        if (request.url.includes('/categories/')) {
            const mainPage = await caches.match('/');
            if (mainPage) {
                console.log('[SW] 🏠 Serving homepage as fallback');
                return mainPage;
            }
        }
        
        // Ultimate fallback - offline page
        console.log('[SW] 📡 Serving offline page');
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
            fetch(request.clone()).then(async networkResponse => {
                if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                    console.log(`[SW] 🔄 Updated cached asset: ${request.url.split('/').pop()}`);
                }
            }).catch(() => {})
        );
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request.clone());
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            console.log(`[SW] 💾 Cached new asset: ${request.url.split('/').pop()}`);
        }
        return networkResponse;
    } catch (error) {
        console.warn(`[SW] ❌ Failed to fetch: ${request.url}`, error);
        
        // Return minimal response for CSS/JS to avoid breaking layout
        if (request.url.includes('.css')) {
            return new Response('/* CSS loading failed */', {
                status: 200,
                headers: { 'Content-Type': 'text/css' }
            });
        }
        
        if (request.url.includes('.js')) {
            return new Response('// JS loading failed', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' }
            });
        }
        
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
    <title>Offline | Trending Wealth</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h2 {
            color: #1a1a2e;
            margin-bottom: 0.5rem;
        }
        p {
            color: #5a5a7a;
            margin: 1rem 0;
            line-height: 1.6;
        }
        .retry-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 100px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
            transition: transform 0.2s;
        }
        .retry-btn:hover {
            transform: translateY(-2px);
        }
        .tips {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e2e8f0;
            font-size: 0.875rem;
            color: #8a8aa8;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h2>You're Offline</h2>
        <p>Please check your internet connection and try again.</p>
        <button class="retry-btn" onclick="location.reload()">⟳ Retry Connection</button>
        <div class="tips">
            💡 Previously viewed articles are available offline
        </div>
    </div>
    <script>
        window.addEventListener('online', () => {
            document.querySelector('.offline-container').innerHTML = '<div class="offline-icon">✅</div><h2>Back Online!</h2><p>Redirecting...</p>';
            setTimeout(() => location.reload(), 1000);
        });
    </script>
</body>
</html>`;
    
    const cache = await caches.open(CACHE_CONFIG.static);
    const offlineResponse = new Response(offlineHTML, {
        headers: { 'Content-Type': 'text/html' }
    });
    await cache.put(OFFLINE_URL, offlineResponse);
    console.log('[SW] 📄 Offline page created');
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
                console.log('[SW] 🔄 Synced failed request:', request.url);
            }
        } catch (error) {
            console.warn('[SW] ⚠️ Failed to sync:', request.url);
        }
    }
}

/**
 * Push notification support
 */
self.addEventListener('push', event => {
    const data = event.data?.json() || { 
        title: 'New Article', 
        body: 'Check out our latest content!',
        url: '/'
    };
    
    const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
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
                event.ports[0].postMessage({ status: 'Cache cleared', timestamp: Date.now() });
                console.log('[SW] 🗑️ All caches cleared');
            })()
        );
    }
    
    if (event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            (async () => {
                let totalSize = 0;
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    const cache = await caches.open(name);
                    const keys = await cache.keys();
                    totalSize += keys.length;
                }
                event.ports[0].postMessage({ size: totalSize, caches: cacheNames.length });
            })()
        );
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: '5.0.0', name: 'Ultra Pro Max' });
    }
});

// Log successful registration
console.log('[SW] 🚀 Ultra Pro Max v5.0.0 loaded successfully!');