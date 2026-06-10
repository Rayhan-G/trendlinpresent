// ============================================
// ADVANCED CACHING HANDLER
// Trending Wealth Ultimate Edge Caching
// Version: 1.0.0
// ============================================

// Cache strategies
const CACHE_STRATEGIES = {
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only'
}

// Cache configuration by path pattern
const CACHE_CONFIG = {
  // Homepage
  '/': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 300, // 5 minutes
    staleWhileRevalidate: 3600, // 1 hour
    cacheTags: ['homepage', 'index']
  },
  
  // Category pages
  '/categories/': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 600, // 10 minutes
    staleWhileRevalidate: 7200, // 2 hours
    cacheTags: ['category', 'category:{{slug}}']
  },
  
  // Individual posts
  '/posts/': {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    ttl: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    cacheTags: ['post', 'post:{{id}}', 'category:{{category}}']
  },
  
  // API endpoints
  '/api/v1/trending.json': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 60, // 1 minute
    staleWhileRevalidate: 300, // 5 minutes
    cacheTags: ['api', 'api:trending']
  },
  
  '/api/v1/latest.json': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 120, // 2 minutes
    staleWhileRevalidate: 600, // 10 minutes
    cacheTags: ['api', 'api:latest']
  },
  
  '/api/v1/popular.json': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 300, // 5 minutes
    staleWhileRevalidate: 1800, // 30 minutes
    cacheTags: ['api', 'api:popular']
  },
  
  '/api/v1/categories.json': {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    ttl: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 24 hours
    cacheTags: ['api', 'api:categories']
  },
  
  // Static assets
  '/assets/': {
    strategy: CACHE_STRATEGIES.CACHE_ONLY,
    ttl: 31536000, // 1 year
    immutable: true,
    cacheTags: ['assets', 'assets:{{type}}']
  },
  
  // Images
  '/assets/images/': {
    strategy: CACHE_STRATEGIES.CACHE_ONLY,
    ttl: 31536000, // 1 year
    immutable: true,
    cacheTags: ['images']
  },
  
  // Default
  'default': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    ttl: 3600,
    staleWhileRevalidate: 86400,
    cacheTags: ['default']
  }
}

// ============================================
// CACHE HANDLER CLASS
// ============================================
class CacheHandler {
  constructor(env, ctx) {
    this.env = env
    this.ctx = ctx
    this.cache = caches.default
    this.kvCache = env.CACHE_KV
  }

  /**
   * Get cache configuration for a request
   */
  getCacheConfig(request) {
    const url = new URL(request.url)
    const path = url.pathname
    
    // Find matching config
    for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
      if (pattern === 'default') continue
      
      if (pattern === '/' && path === '/') {
        return config
      }
      
      if (pattern !== '/' && path.startsWith(pattern)) {
        return config
      }
    }
    
    return CACHE_CONFIG.default
  }

  /**
   * Generate cache key with variant
   */
  generateCacheKey(request, config) {
    const url = new URL(request.url)
    const cacheKey = new Request(url.toString(), request)
    
    // Add variant for device type if needed
    const userAgent = request.headers.get('User-Agent') || ''
    let variant = 'default'
    
    if (/mobile/i.test(userAgent)) variant = 'mobile'
    else if (/tablet/i.test(userAgent)) variant = 'tablet'
    else variant = 'desktop'
    
    // Add variant to cache key
    cacheKey.headers.set('X-Cache-Variant', variant)
    
    // Add language variant
    const acceptLanguage = request.headers.get('Accept-Language') || 'en'
    const language = acceptLanguage.split(',')[0].split('-')[0]
    cacheKey.headers.set('X-Cache-Language', language)
    
    return cacheKey
  }

  /**
   * Generate cache tags for invalidation
   */
  generateCacheTags(request, config, data = {}) {
    const url = new URL(request.url)
    let tags = [...config.cacheTags]
    
    // Replace dynamic tags
    tags = tags.map(tag => {
      if (tag.includes('{{slug}}') && data.slug) {
        return tag.replace('{{slug}}', data.slug)
      }
      if (tag.includes('{{id}}') && data.id) {
        return tag.replace('{{id}}', data.id)
      }
      if (tag.includes('{{category}}') && data.category) {
        return tag.replace('{{category}}', data.category)
      }
      if (tag.includes('{{type}}')) {
        const type = url.pathname.split('.').pop()
        return tag.replace('{{type}}', type)
      }
      return tag
    })
    
    // Add path-based tags
    tags.push(`path:${url.pathname}`)
    tags.push(`path:${url.pathname.split('/')[1]}`)
    
    return tags
  }

  /**
   * Get cached response with staleness check
   */
  async getCachedResponse(request, config) {
    const cacheKey = this.generateCacheKey(request, config)
    const cachedResponse = await this.cache.match(cacheKey)
    
    if (!cachedResponse) {
      return null
    }
    
    // Check if response is stale
    const cachedAt = cachedResponse.headers.get('X-Cache-Date')
    const isStale = cachedAt && (Date.now() - new Date(cachedAt).getTime()) > (config.ttl * 1000)
    
    // Add cache metadata
    const headers = new Headers(cachedResponse.headers)
    headers.set('X-Cache-Status', isStale ? 'STALE' : 'HIT')
    headers.set('X-Cache-Date', cachedAt)
    headers.set('X-Cache-TTL', config.ttl.toString())
    
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: headers
    })
  }

  /**
   * Store response in cache
   */
  async storeInCache(request, response, config, tags = []) {
    if (!this.isCachable(response, config)) {
      return response
    }
    
    const cacheKey = this.generateCacheKey(request, config)
    const responseClone = response.clone()
    
    // Add cache headers
    const headers = new Headers(responseClone.headers)
    headers.set('X-Cache-Date', new Date().toISOString())
    headers.set('X-Cache-TTL', config.ttl.toString())
    headers.set('X-Cache-Tags', tags.join(','))
    
    // Set cache control headers
    const cacheControl = config.immutable 
      ? 'public, max-age=31536000, immutable'
      : `public, max-age=${config.ttl}, stale-while-revalidate=${config.staleWhileRevalidate}`
    
    headers.set('Cache-Control', cacheControl)
    headers.set('CDN-Cache-Control', cacheControl)
    headers.set('Cloudflare-CDN-Cache-Control', cacheControl)
    
    const cachedResponse = new Response(responseClone.body, {
      status: responseClone.status,
      statusText: responseClone.statusText,
      headers: headers
    })
    
    // Store in cache
    this.ctx.waitUntil(this.cache.put(cacheKey, cachedResponse.clone()))
    
    // Store tags in KV for invalidation
    await this.storeCacheTags(cacheKey, tags)
    
    return cachedResponse
  }

  /**
   * Check if response is cachable
   */
  isCachable(response, config) {
    if (config.strategy === CACHE_STRATEGIES.NETWORK_ONLY) {
      return false
    }
    
    if (response.status !== 200) {
      return false
    }
    
    const cacheControl = response.headers.get('Cache-Control') || ''
    if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
      return false
    }
    
    return true
  }

  /**
   * Store cache tags in KV for invalidation
   */
  async storeCacheTags(cacheKey, tags) {
    if (!this.kvCache) return
    
    const key = `cache:tags:${cacheKey.url}`
    await this.kvCache.put(key, JSON.stringify({
      cacheKey: cacheKey.url,
      tags: tags,
      storedAt: new Date().toISOString()
    }))
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag) {
    if (!this.kvCache) return
    
    const invalidationKey = `cache:invalidation:${tag}`
    await this.kvCache.put(invalidationKey, new Date().toISOString())
    
    console.log(`Cache invalidated for tag: ${tag}`)
  }

  /**
   * Invalidate cache by multiple tags
   */
  async invalidateByTags(tags) {
    await Promise.all(tags.map(tag => this.invalidateByTag(tag)))
  }

  /**
   * Check if cache is valid for tag
   */
  async isCacheValid(cacheDate, tags = []) {
    for (const tag of tags) {
      const invalidationKey = `cache:invalidation:${tag}`
      const invalidatedAt = await this.kvCache?.get(invalidationKey)
      
      if (invalidatedAt && new Date(invalidatedAt) > new Date(cacheDate)) {
        return false
      }
    }
    
    return true
  }

  /**
   * Purge entire cache
   */
  async purgeCache() {
    // Note: Can't purge entire cache from worker
    // Would need to use Cloudflare API
    return { success: false, message: 'Use Cloudflare API for full purge' }
  }

  /**
   * Warm cache for popular URLs
   */
  async warmCache(urls) {
    const promises = urls.map(async (url) => {
      try {
        const request = new Request(url)
        const response = await fetch(request)
        const config = this.getCacheConfig(request)
        await this.storeInCache(request, response, config)
        return { url, success: true }
      } catch (error) {
        return { url, success: false, error: error.message }
      }
    })
    
    return await Promise.all(promises)
  }
}

// ============================================
// EDGE CACHE PURGE HANDLER
// ============================================
class EdgeCachePurge {
  constructor(env) {
    this.env = env
    this.apiToken = env.CLOUDFLARE_API_TOKEN
    this.zoneId = env.CLOUDFLARE_ZONE_ID
  }

  /**
   * Purge single URL
   */
  async purgeUrl(url) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [url]
        })
      }
    )
    
    return await response.json()
  }

  /**
   * Purge by tags
   */
  async purgeByTags(tags) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tags: tags
        })
      }
    )
    
    return await response.json()
  }

  /**
   * Purge everything
   */
  async purgeAll() {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purge_everything: true
        })
      }
    )
    
    return await response.json()
  }
}

// ============================================
// CACHE ANALYTICS
// ============================================
class CacheAnalytics {
  constructor(env) {
    this.kv = env.ANALYTICS_KV
  }

  /**
   * Record cache hit/miss
   */
  async recordCacheEvent(cacheKey, status, duration) {
    const today = new Date().toISOString().split('T')[0]
    const key = `cache:analytics:${today}`
    
    let analytics = await this.kv?.get(key, 'json') || {
      date: today,
      hits: 0,
      misses: 0,
      stale: 0,
      avgDuration: 0,
      totalRequests: 0
    }
    
    analytics.totalRequests++
    if (status === 'HIT') analytics.hits++
    else if (status === 'MISS') analytics.misses++
    else if (status === 'STALE') analytics.stale++
    
    analytics.avgDuration = (analytics.avgDuration * (analytics.totalRequests - 1) + duration) / analytics.totalRequests
    
    await this.kv?.put(key, JSON.stringify(analytics))
  }

  /**
   * Get cache hit ratio
   */
  async getCacheHitRatio(days = 7) {
    const ratios = []
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const key = `cache:analytics:${dateStr}`
      
      const analytics = await this.kv?.get(key, 'json')
      if (analytics && analytics.totalRequests > 0) {
        const hitRatio = (analytics.hits / analytics.totalRequests) * 100
        ratios.push({ date: dateStr, hitRatio, ...analytics })
      }
    }
    
    return ratios
  }
}

// ============================================
// EXPORT MODULE
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CacheHandler,
    EdgeCachePurge,
    CacheAnalytics,
    CACHE_STRATEGIES,
    CACHE_CONFIG
  }
}