// ============================================
// KV STORAGE HANDLER - EDGE DATABASE
// Trending Wealth Ultimate KV Operations
// Version: 1.0.0
// ============================================

// KV Namespace bindings (configure in wrangler.toml)
// - TRENDING_KV: Main KV store for trending data
// - USER_KV: User preferences and sessions
// - ANALYTICS_KV: Analytics data storage
// - CACHE_KV: Cache invalidation tags

// ============================================
// KV KEY NAMESPACES
// ============================================
const KV_KEYS = {
  // Trending data keys
  TRENDING: {
    CURRENT: 'trending:current',
    HISTORY: 'trending:history:',
    SCORES: 'trending:scores:',
    VELOCITY: 'trending:velocity:'
  },
  
  // Post data keys
  POSTS: {
    METADATA: 'posts:metadata:',
    VIEWS: 'posts:views:',
    LIKES: 'posts:likes:',
    SHARES: 'posts:shares:',
    COMMENTS: 'posts:comments:'
  },
  
  // User data keys
  USER: {
    SESSION: 'user:session:',
    PREFERENCES: 'user:prefs:',
    HISTORY: 'user:history:',
    BOOKMARKS: 'user:bookmarks:'
  },
  
  // Analytics keys
  ANALYTICS: {
    DAILY: 'analytics:daily:',
    HOURLY: 'analytics:hourly:',
    REFERRERS: 'analytics:referrers:',
    DEVICES: 'analytics:devices:'
  },
  
  // Cache tags
  CACHE: {
    INVALIDATION: 'cache:invalidation:',
    TAGS: 'cache:tags:'
  },
  
  // Rate limiting
  RATE_LIMIT: {
    IP: 'ratelimit:ip:',
    USER: 'ratelimit:user:',
    ENDPOINT: 'ratelimit:endpoint:'
  }
}

// ============================================
// INITIALIZE KV NAMESPACES
// ============================================
let kvNamespaces = {}

function initializeKV(env) {
  kvNamespaces = {
    trending: env.TRENDING_KV,
    user: env.USER_KV,
    analytics: env.ANALYTICS_KV,
    cache: env.CACHE_KV
  }
}

// ============================================
// TRENDING DATA OPERATIONS
// ============================================

/**
 * Get current trending posts
 */
async function getCurrentTrending() {
  try {
    const data = await kvNamespaces.trending.get(KV_KEYS.TRENDING.CURRENT, 'json')
    return data || { posts: [], lastUpdated: null }
  } catch (error) {
    console.error('Error getting trending:', error)
    return { posts: [], error: error.message }
  }
}

/**
 * Update trending posts
 */
async function updateTrending(posts) {
  const trendingData = {
    posts: posts,
    lastUpdated: new Date().toISOString(),
    version: '1.0'
  }
  
  await kvNamespaces.trending.put(KV_KEYS.TRENDING.CURRENT, JSON.stringify(trendingData))
  await updateTrendingHistory(posts)
  
  return trendingData
}

/**
 * Update trending history
 */
async function updateTrendingHistory(posts) {
  const dateKey = new Date().toISOString().split('T')[0]
  const historyKey = `${KV_KEYS.TRENDING.HISTORY}${dateKey}`
  
  const history = await kvNamespaces.trending.get(historyKey, 'json')
  if (history) {
    history.posts = posts
    await kvNamespaces.trending.put(historyKey, JSON.stringify(history))
  } else {
    await kvNamespaces.trending.put(historyKey, JSON.stringify({
      date: dateKey,
      posts: posts,
      timestamp: new Date().toISOString()
    }))
  }
}

/**
 * Update trending score for a post
 */
async function updateTrendingScore(postId, score, velocity) {
  const scoreKey = `${KV_KEYS.TRENDING.SCORES}${postId}`
  const velocityKey = `${KV_KEYS.TRENDING.VELOCITY}${postId}`
  
  await Promise.all([
    kvNamespaces.trending.put(scoreKey, score.toString()),
    kvNamespaces.trending.put(velocityKey, velocity.toString())
  ])
}

/**
 * Get trending score for a post
 */
async function getTrendingScore(postId) {
  const [score, velocity] = await Promise.all([
    kvNamespaces.trending.get(`${KV_KEYS.TRENDING.SCORES}${postId}`),
    kvNamespaces.trending.get(`${KV_KEYS.TRENDING.VELOCITY}${postId}`)
  ])
  
  return {
    score: score ? parseFloat(score) : 0,
    velocity: velocity ? parseFloat(velocity) : 0
  }
}

// ============================================
// POST ANALYTICS OPERATIONS
// ============================================

/**
 * Increment post view count
 */
async function incrementPostViews(postId) {
  const viewKey = `${KV_KEYS.POSTS.VIEWS}${postId}`
  const views = await kvNamespaces.analytics.get(viewKey)
  const newCount = (views ? parseInt(views) : 0) + 1
  
  await kvNamespaces.analytics.put(viewKey, newCount.toString())
  
  // Update daily analytics
  await updateDailyAnalytics('views', postId)
  
  return newCount
}

/**
 * Increment post likes
 */
async function incrementPostLikes(postId, userId = null) {
  const likeKey = `${KV_KEYS.POSTS.LIKES}${postId}`
  const likes = await kvNamespaces.analytics.get(likeKey)
  const newCount = (likes ? parseInt(likes) : 0) + 1
  
  await kvNamespaces.analytics.put(likeKey, newCount.toString())
  
  // Track user like if userId provided
  if (userId) {
    await trackUserAction(userId, 'like', postId)
  }
  
  return newCount
}

/**
 * Get post statistics
 */
async function getPostStats(postId) {
  const [views, likes, shares, comments] = await Promise.all([
    kvNamespaces.analytics.get(`${KV_KEYS.POSTS.VIEWS}${postId}`),
    kvNamespaces.analytics.get(`${KV_KEYS.POSTS.LIKES}${postId}`),
    kvNamespaces.analytics.get(`${KV_KEYS.POSTS.SHARES}${postId}`),
    kvNamespaces.analytics.get(`${KV_KEYS.POSTS.COMMENTS}${postId}`)
  ])
  
  return {
    views: views ? parseInt(views) : 0,
    likes: likes ? parseInt(likes) : 0,
    shares: shares ? parseInt(shares) : 0,
    comments: comments ? parseInt(comments) : 0
  }
}

/**
 * Batch update multiple post stats
 */
async function batchUpdatePostStats(updates) {
  const promises = []
  
  for (const update of updates) {
    const { postId, type, increment = 1 } = update
    const key = `${KV_KEYS.POSTS[type.toUpperCase()]}${postId}`
    
    promises.push(
      kvNamespaces.analytics.get(key).then(current => {
        const newValue = (current ? parseInt(current) : 0) + increment
        return kvNamespaces.analytics.put(key, newValue.toString())
      })
    )
  }
  
  await Promise.all(promises)
}

// ============================================
// USER DATA OPERATIONS
// ============================================

/**
 * Create or update user session
 */
async function createUserSession(userId, userData) {
  const sessionKey = `${KV_KEYS.USER.SESSION}${userId}`
  const session = {
    userId: userId,
    data: userData,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  }
  
  await kvNamespaces.user.put(sessionKey, JSON.stringify(session), {
    expirationTtl: 30 * 24 * 60 * 60 // 30 days
  })
  
  return session
}

/**
 * Get user session
 */
async function getUserSession(userId) {
  const sessionKey = `${KV_KEYS.USER.SESSION}${userId}`
  const session = await kvNamespaces.user.get(sessionKey, 'json')
  
  if (session && new Date(session.expiresAt) > new Date()) {
    return session
  }
  
  return null
}

/**
 * Update user preferences
 */
async function updateUserPreferences(userId, preferences) {
  const prefsKey = `${KV_KEYS.USER.PREFERENCES}${userId}`
  const existingPrefs = await kvNamespaces.user.get(prefsKey, 'json') || {}
  
  const updatedPrefs = { ...existingPrefs, ...preferences }
  await kvNamespaces.user.put(prefsKey, JSON.stringify(updatedPrefs))
  
  return updatedPrefs
}

/**
 * Add to user reading history
 */
async function addToUserHistory(userId, postId) {
  const historyKey = `${KV_KEYS.USER.HISTORY}${userId}`
  const history = await kvNamespaces.user.get(historyKey, 'json') || []
  
  history.unshift({
    postId: postId,
    timestamp: new Date().toISOString()
  })
  
  // Keep only last 100 items
  const trimmedHistory = history.slice(0, 100)
  await kvNamespaces.user.put(historyKey, JSON.stringify(trimmedHistory))
  
  return trimmedHistory
}

/**
 * Get user reading history
 */
async function getUserHistory(userId, limit = 20) {
  const historyKey = `${KV_KEYS.USER.HISTORY}${userId}`
  const history = await kvNamespaces.user.get(historyKey, 'json') || []
  
  return history.slice(0, limit)
}

/**
 * Track user action (like, share, save)
 */
async function trackUserAction(userId, action, postId) {
  const actionKey = `user:action:${userId}:${action}:${postId}`
  await kvNamespaces.user.put(actionKey, new Date().toISOString())
}

// ============================================
// ANALYTICS OPERATIONS
// ============================================

/**
 * Update daily analytics
 */
async function updateDailyAnalytics(metric, postId, value = 1) {
  const today = new Date().toISOString().split('T')[0]
  const dailyKey = `${KV_KEYS.ANALYTICS.DAILY}${today}`
  
  let dailyData = await kvNamespaces.analytics.get(dailyKey, 'json')
  if (!dailyData) {
    dailyData = {
      date: today,
      metrics: {},
      posts: {}
    }
  }
  
  dailyData.metrics[metric] = (dailyData.metrics[metric] || 0) + value
  dailyData.posts[postId] = dailyData.posts[postId] || {}
  dailyData.posts[postId][metric] = (dailyData.posts[postId][metric] || 0) + value
  
  await kvNamespaces.analytics.put(dailyKey, JSON.stringify(dailyData))
}

/**
 * Track referrer
 */
async function trackReferrer(referrer, postId = null) {
  const referrerKey = `${KV_KEYS.ANALYTICS.REFERRERS}${new Date().toISOString().split('T')[0]}`
  let referrerData = await kvNamespaces.analytics.get(referrerKey, 'json') || {}
  
  const domain = referrer ? new URL(referrer).hostname : 'direct'
  referrerData[domain] = (referrerData[domain] || 0) + 1
  
  if (postId) {
    referrerData[`post_${postId}`] = referrerData[`post_${postId}`] || {}
    referrerData[`post_${postId}`][domain] = (referrerData[`post_${postId}`][domain] || 0) + 1
  }
  
  await kvNamespaces.analytics.put(referrerKey, JSON.stringify(referrerData))
}

/**
 * Track device info
 */
async function trackDevice(userAgent, postId = null) {
  const deviceKey = `${KV_KEYS.ANALYTICS.DEVICES}${new Date().toISOString().split('T')[0]}`
  let deviceData = await kvNamespaces.analytics.get(deviceKey, 'json') || {}
  
  // Simple device detection
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) deviceType = 'mobile'
  if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet'
  
  deviceData[deviceType] = (deviceData[deviceType] || 0) + 1
  
  await kvNamespaces.analytics.put(deviceKey, JSON.stringify(deviceData))
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Invalidate cache by tag
 */
async function invalidateCache(tag) {
  const invalidationKey = `${KV_KEYS.CACHE.INVALIDATION}${tag}`
  await kvNamespaces.cache.put(invalidationKey, new Date().toISOString())
}

/**
 * Check if cache is valid
 */
async function isCacheValid(tag, cachedTime) {
  const invalidationKey = `${KV_KEYS.CACHE.INVALIDATION}${tag}`
  const invalidatedAt = await kvNamespaces.cache.get(invalidationKey)
  
  if (invalidatedAt && new Date(invalidatedAt) > new Date(cachedTime)) {
    return false
  }
  
  return true
}

// ============================================
// RATE LIMITING OPERATIONS
// ============================================

/**
 * Check rate limit
 */
async function checkRateLimit(identifier, endpoint, limit, windowSeconds) {
  const key = `${KV_KEYS.RATE_LIMIT.ENDPOINT}${endpoint}:${identifier}`
  const current = await kvNamespaces.cache.get(key)
  
  if (!current) {
    await kvNamespaces.cache.put(key, '1', { expirationTtl: windowSeconds })
    return { allowed: true, count: 1 }
  }
  
  const count = parseInt(current) + 1
  
  if (count > limit) {
    return { allowed: false, count: count, limit: limit }
  }
  
  await kvNamespaces.cache.put(key, count.toString(), { expirationTtl: windowSeconds })
  return { allowed: true, count: count }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk get multiple KV keys
 */
async function bulkGet(keys, namespace = 'trending') {
  const kv = kvNamespaces[namespace]
  const promises = keys.map(key => kv.get(key, 'json'))
  const results = await Promise.all(promises)
  
  return keys.reduce((acc, key, index) => {
    acc[key] = results[index]
    return acc
  }, {})
}

/**
 * Bulk put multiple KV entries
 */
async function bulkPut(entries, namespace = 'trending') {
  const kv = kvNamespaces[namespace]
  const promises = entries.map(({ key, value, options }) => 
    kv.put(key, JSON.stringify(value), options)
  )
  
  await Promise.all(promises)
}

// ============================================
// CLEANUP OPERATIONS
// ============================================

/**
 * Clean old analytics data (older than 90 days)
 */
async function cleanupOldAnalytics() {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  // Implementation would list keys and delete old ones
  // Note: KV doesn't support listing all keys by default
  // Would need to maintain a separate index
}

// ============================================
// EXPORT MODULE
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeKV,
    getCurrentTrending,
    updateTrending,
    updateTrendingScore,
    getTrendingScore,
    incrementPostViews,
    incrementPostLikes,
    getPostStats,
    batchUpdatePostStats,
    createUserSession,
    getUserSession,
    updateUserPreferences,
    addToUserHistory,
    getUserHistory,
    trackUserAction,
    updateDailyAnalytics,
    trackReferrer,
    trackDevice,
    invalidateCache,
    isCacheValid,
    checkRateLimit,
    bulkGet,
    bulkPut
  }
}