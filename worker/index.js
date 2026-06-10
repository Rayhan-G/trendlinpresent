// ============================================
// CLOUDFLARE WORKER - MAIN ENTRY POINT
// Trending Wealth Ultimate Edge Computing
// Version: 1.0.0
// ============================================

// Handle all requests at the edge
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Cache configuration
const CACHE_CONFIG = {
  ttl: 3600, // 1 hour default
  staleWhileRevalidate: 86400, // 24 hours
  cacheable: {
    statusCodes: [200],
    methods: ['GET', 'HEAD']
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  windowSeconds: 60,
  maxRequests: 100,
  paths: {
    '/api/': 60, // Stricter for API
    '/search/': 30,
    'default': 100
  }
}

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // CORS preflight
  if (method === 'OPTIONS') {
    return handleCORS()
  }

  // Apply rate limiting
  const rateLimitStatus = await checkRateLimit(request)
  if (!rateLimitStatus.allowed) {
    return new Response('Too Many Requests', { status: 429 })
  }

  // Route handlers
  const routes = {
    // API Routes
    '/api/v1/trending.json': () => handleAPI('/api/v1/trending.json', request),
    '/api/v1/latest.json': () => handleAPI('/api/v1/latest.json', request),
    '/api/v1/popular.json': () => handleAPI('/api/v1/popular.json', request),
    '/api/v1/categories.json': () => handleAPI('/api/v1/categories.json', request),
    '/api/v1/search.json': () => handleSearch(request),
    
    // Category routes
    '/categories/technology/': () => handleCategory('technology', request),
    '/categories/health/': () => handleCategory('health', request),
    '/categories/wealth/': () => handleCategory('wealth', request),
    '/categories/growth/': () => handleCategory('growth', request),
    '/categories/entertainment/': () => handleCategory('entertainment', request),
    '/categories/world/': () => handleCategory('world', request),
    '/categories/lifestyle/': () => handleCategory('lifestyle', request),
    
    // Post routes (dynamic)
    '/posts/': () => handlePosts(request),
    
    // Search route
    '/search/': () => handleSearchPage(request),
    
    // Homepage
    '/': () => handleHomepage(request),
    
    // Health check
    '/health': () => handleHealthCheck()
  }

  // Find matching route
  for (const [routePath, handler] of Object.entries(routes)) {
    if (path === routePath || path.startsWith(routePath)) {
      return await handler()
    }
  }

  // Static file handler (fallback)
  return await handleStatic(request)
}

// ============================================
// API HANDLERS
// ============================================

async function handleAPI(apiPath, request) {
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    // Fetch from origin
    response = await fetch(request)
    
    // Cache the response
    if (response.status === 200) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      headers.set('X-Cache-Status', 'MISS')
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      })
      
      // Store in cache
      event.waitUntil(cache.put(request, response.clone()))
    }
  } else {
    // Add cache hit header
    const headers = new Headers(response.headers)
    headers.set('X-Cache-Status', 'HIT')
    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    })
  }
  
  return response
}

async function handleSearch(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q') || ''
  
  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ error: 'Search query too short' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Fetch search index from cache or KV
  const searchIndex = await getSearchIndex()
  
  // Perform search (simple implementation)
  const results = searchIndex.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.excerpt.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)
  
  return new Response(JSON.stringify({
    query: query,
    total: results.length,
    results: results
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    }
  })
}

// ============================================
// CATEGORY HANDLERS
// ============================================

async function handleCategory(category, request) {
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    // Fetch category page from origin
    response = await fetch(request)
    
    if (response.status === 200) {
      const html = await response.text()
      
      // Inject dynamic category data
      const categoryData = await getCategoryData(category)
      const enhancedHtml = injectCategoryData(html, categoryData)
      
      response = new Response(enhancedHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
          'X-Category': category
        }
      })
      
      event.waitUntil(cache.put(request, response.clone()))
    }
  }
  
  return response
}

// ============================================
// POST HANDLERS
// ============================================

async function handlePosts(request) {
  const url = new URL(request.url)
  const postPath = url.pathname.replace('/posts/', '')
  
  // Check if it's an AMP request
  const isAmp = url.searchParams.get('amp') === 'true' || postPath.endsWith('/amp')
  
  // Fetch post from cache or origin
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    response = await fetch(request)
    
    if (response.status === 200) {
      let html = await response.text()
      
      // Add structured data for SEO
      const structuredData = await getPostStructuredData(postPath)
      html = injectStructuredData(html, structuredData)
      
      // Add affiliate link tracking
      if (html.includes('affiliate-link')) {
        html = injectAffiliateTracking(html)
      }
      
      response = new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'X-Post-Version': structuredData.version || '1.0'
        }
      })
      
      event.waitUntil(cache.put(request, response.clone()))
    }
  }
  
  return response
}

// ============================================
// HOMEPAGE HANDLER
// ============================================

async function handleHomepage(request) {
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    response = await fetch(request)
    
    if (response.status === 200) {
      let html = await response.text()
      
      // Inject dynamic trending data
      const trendingData = await getTrendingData()
      html = injectTrendingData(html, trendingData)
      
      // Add personalized recommendations (if user is logged in)
      const userData = await getUserData(request)
      if (userData) {
        html = injectRecommendations(html, userData)
      }
      
      response = new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
        }
      })
      
      event.waitUntil(cache.put(request, response.clone()))
    }
  }
  
  return response
}

// ============================================
// STATIC FILE HANDLER
// ============================================

async function handleStatic(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Static assets have long cache
  if (path.startsWith('/assets/')) {
    const response = await fetch(request)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    
    return new Response(response.body, {
      status: response.status,
      headers: headers
    })
  }
  
  // Default: pass through
  return fetch(request)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function checkRateLimit(request) {
  const url = new URL(request.url)
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   'unknown'
  
  // Determine rate limit for this path
  let limit = RATE_LIMIT.paths.default
  for (const [path, pathLimit] of Object.entries(RATE_LIMIT.paths)) {
    if (url.pathname.startsWith(path)) {
      limit = pathLimit
      break
    }
  }
  
  // Create rate limit key
  const key = `rate_limit:${clientIP}:${url.pathname}`
  
  // Get current count from KV (simplified - would use Workers KV in production)
  const currentCount = await getRateLimitCount(key)
  
  if (currentCount >= limit) {
    return { allowed: false, retryAfter: RATE_LIMIT.windowSeconds }
  }
  
  await incrementRateLimit(key, RATE_LIMIT.windowSeconds)
  return { allowed: true }
}

async function getRateLimitCount(key) {
  // Placeholder - implement with Workers KV
  return 0
}

async function incrementRateLimit(key, ttl) {
  // Placeholder - implement with Workers KV
}

async function getSearchIndex() {
  // Placeholder - fetch from R2 or KV
  return []
}

async function getCategoryData(category) {
  // Placeholder - fetch category data
  return { name: category, posts: [] }
}

async function getTrendingData() {
  // Placeholder - fetch trending data
  return { items: [] }
}

async function getPostStructuredData(postPath) {
  // Placeholder - fetch post structured data
  return { version: '1.0' }
}

async function getUserData(request) {
  // Placeholder - get user data from session
  return null
}

function injectCategoryData(html, data) {
  // Placeholder - inject category data into HTML
  return html.replace('{{CATEGORY_DATA}}', JSON.stringify(data))
}

function injectTrendingData(html, data) {
  // Placeholder - inject trending data
  return html.replace('{{TRENDING_DATA}}', JSON.stringify(data))
}

function injectRecommendations(html, userData) {
  // Placeholder - inject personalized recommendations
  return html
}

function injectStructuredData(html, data) {
  // Placeholder - inject JSON-LD structured data
  const script = `<script type="application/ld+json">${JSON.stringify(data)}</script>`
  return html.replace('</head>', `${script}</head>`)
}

function injectAffiliateTracking(html) {
  // Placeholder - add affiliate tracking parameters
  return html.replace(/affiliate-link/g, 'affiliate-link?ref=worker')
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}

function handleHealthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime ? process.uptime() : 0
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleSearchPage(request) {
  return await handleStatic(request)
}

// ============================================
// EDGE CACHE PURGE (Admin endpoint)
// ============================================

async function purgeCache(request) {
  const auth = request.headers.get('Authorization')
  
  if (auth !== `Bearer ${CACHE_PURGE_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const cache = caches.default
  // Purge logic here
  
  return new Response('Cache purged', { status: 200 })
}

// ============================================
// ERROR HANDLING
// ============================================

async function handleError(error) {
  console.error('Worker error:', error)
  
  return new Response(JSON.stringify({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  })
}