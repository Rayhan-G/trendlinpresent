// ============================================
// EDGE ANALYTICS HANDLER
// Trending Wealth Ultimate Real-time Analytics
// Version: 1.0.0
// ============================================

// Analytics event types
const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  CLICK: 'click',
  AFFILIATE_CLICK: 'affiliate_click',
  SHARE: 'share',
  LIKE: 'like',
  COMMENT: 'comment',
  SEARCH: 'search',
  CATEGORY_VIEW: 'category_view',
  POST_VIEW: 'post_view',
  SCROLL_DEPTH: 'scroll_depth',
  TIME_ON_PAGE: 'time_on_page',
  BOUNCE: 'bounce',
  CONVERSION: 'conversion'
}

// Analytics configuration
const ANALYTICS_CONFIG = {
  flushInterval: 60, // seconds
  batchSize: 50,
  retentionDays: 90,
  samplingRate: 1.0, // 100% sampling
  ipAnonymization: true,
  userAgentParsing: true
}

// ============================================
// ANALYTICS HANDLER CLASS
// ============================================
class AnalyticsHandler {
  constructor(env, ctx) {
    this.env = env
    this.ctx = ctx
    this.kv = env.ANALYTICS_KV
    this.queue = []
    this.flushTimeout = null
  }

  /**
   * Track an analytics event
   */
  async trackEvent(eventType, data, request) {
    // Apply sampling
    if (Math.random() > ANALYTICS_CONFIG.samplingRate) {
      return null
    }

    const event = await this.buildEvent(eventType, data, request)
    
    // Add to queue
    this.queue.push(event)
    
    // Flush if queue is full
    if (this.queue.length >= ANALYTICS_CONFIG.batchSize) {
      await this.flush()
    } else if (!this.flushTimeout) {
      // Schedule flush
      this.flushTimeout = setTimeout(() => this.flush(), ANALYTICS_CONFIG.flushInterval * 1000)
    }
    
    return event
  }

  /**
   * Build event object with metadata
   */
  async buildEvent(eventType, data, request) {
    const url = new URL(request.url)
    const userAgent = request.headers.get('User-Agent') || ''
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown'
    
    // Parse user agent
    const deviceInfo = this.parseUserAgent(userAgent)
    
    // Get geo data from Cloudflare
    const geo = {
      country: request.headers.get('CF-IPCountry') || 'unknown',
      city: request.headers.get('CF-IPCity') || 'unknown',
      region: request.headers.get('CF-IPRegion') || 'unknown',
      latitude: request.headers.get('CF-IPLatitude') || null,
      longitude: request.headers.get('CF-IPLongitude') || null,
      timezone: request.headers.get('CF-IPTimezone') || 'unknown'
    }
    
    // Anonymize IP if required
    const clientIp = ANALYTICS_CONFIG.ipAnonymization 
      ? this.anonymizeIp(ip)
      : ip
    
    // Generate session ID
    const sessionId = this.getSessionId(request)
    
    return {
      event_id: this.generateEventId(),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      client_ip: clientIp,
      user_agent: userAgent,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen_size: data.screenSize || null,
      referrer: request.headers.get('Referer') || 'direct',
      url: url.pathname,
      full_url: url.toString(),
      query: Object.fromEntries(url.searchParams),
      geo: geo,
      data: data,
      is_bot: this.isBot(userAgent),
      is_mobile: deviceInfo.isMobile,
      load_time: data.loadTime || null
    }
  }

  /**
   * Parse user agent string
   */
  parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase()
    
    let device = 'desktop'
    let isMobile = false
    
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
      device = 'mobile'
      isMobile = true
    }
    if (/tablet|ipad/i.test(ua)) device = 'tablet'
    
    let browser = 'other'
    if (ua.includes('chrome')) browser = 'chrome'
    else if (ua.includes('firefox')) browser = 'firefox'
    else if (ua.includes('safari')) browser = 'safari'
    else if (ua.includes('edge')) browser = 'edge'
    else if (ua.includes('opera')) browser = 'opera'
    
    let os = 'other'
    if (ua.includes('windows')) os = 'windows'
    else if (ua.includes('mac')) os = 'macos'
    else if (ua.includes('linux')) os = 'linux'
    else if (ua.includes('android')) os = 'android'
    else if (ua.includes('ios')) os = 'ios'
    
    return { device, browser, os, isMobile }
  }

  /**
   * Check if request is from bot
   */
  isBot(userAgent) {
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'headless',
      'googlebot', 'bingbot', 'slurp', 'duckduckbot',
      'baiduspider', 'yandexbot', 'facebookexternalhit',
      'twitterbot', 'linkedinbot', 'pinterest', 'discordbot'
    ]
    
    const ua = userAgent.toLowerCase()
    return botPatterns.some(pattern => ua.includes(pattern))
  }

  /**
   * Anonymize IP address (remove last octet)
   */
  anonymizeIp(ip) {
    if (ip.includes('.')) {
      // IPv4
      const parts = ip.split('.')
      parts[parts.length - 1] = '0'
      return parts.join('.')
    } else if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':')
      parts[parts.length - 1] = '0000'
      return parts.join(':')
    }
    return ip
  }

  /**
   * Get or create session ID
   */
  getSessionId(request) {
    // Try to get from cookie
    const cookies = request.headers.get('Cookie') || ''
    const sessionMatch = cookies.match(/session_id=([^;]+)/)
    
    if (sessionMatch) {
      return sessionMatch[1]
    }
    
    // Generate new session ID
    return this.generateSessionId()
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
  }

  /**
   * Flush events to storage
   */
  async flush() {
    if (this.queue.length === 0) return
    
    clearTimeout(this.flushTimeout)
    this.flushTimeout = null
    
    const events = [...this.queue]
    this.queue = []
    
    await this.storeEvents(events)
  }

  /**
   * Store events in KV and R2
   */
  async storeEvents(events) {
    if (!this.kv) return
    
    const today = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()
    
    // Store in KV for real-time access
    const kvKey = `analytics:realtime:${today}:${hour}`
    let realtimeData = await this.kv.get(kvKey, 'json') || []
    realtimeData.push(...events)
    
    // Keep only last 1000 events in realtime
    if (realtimeData.length > 1000) {
      realtimeData = realtimeData.slice(-1000)
    }
    
    await this.kv.put(kvKey, JSON.stringify(realtimeData), {
      expirationTtl: 24 * 60 * 60 // 24 hours
    })
    
    // Aggregate metrics
    await this.aggregateMetrics(events, today)
  }

  /**
   * Aggregate metrics from events
   */
  async aggregateMetrics(events, date) {
    const metrics = {
      date: date,
      total_views: 0,
      unique_visitors: new Set(),
      page_views: {},
      referrers: {},
      devices: {},
      browsers: {},
      os: {},
      countries: {},
      top_posts: {},
      top_categories: {},
      conversions: 0,
      affiliate_clicks: 0,
      avg_load_time: 0,
      bounce_count: 0,
      total_time: 0
    }
    
    for (const event of events) {
      // Skip bots
      if (event.is_bot) continue
      
      metrics.total_views++
      metrics.unique_visitors.add(event.client_ip)
      
      // Page views by path
      metrics.page_views[event.url] = (metrics.page_views[event.url] || 0) + 1
      
      // Referrers
      const referrerDomain = event.referrer !== 'direct' 
        ? new URL(event.referrer).hostname 
        : 'direct'
      metrics.referrers[referrerDomain] = (metrics.referrers[referrerDomain] || 0) + 1
      
      // Devices
      metrics.devices[event.device] = (metrics.devices[event.device] || 0) + 1
      
      // Browsers
      metrics.browsers[event.browser] = (metrics.browsers[event.browser] || 0) + 1
      
      // OS
      metrics.os[event.os] = (metrics.os[event.os] || 0) + 1
      
      // Countries
      if (event.geo.country !== 'unknown') {
        metrics.countries[event.geo.country] = (metrics.countries[event.geo.country] || 0) + 1
      }
      
      // Event-specific metrics
      if (event.event_type === ANALYTICS_EVENTS.POST_VIEW) {
        const postId = event.data.postId
        metrics.top_posts[postId] = (metrics.top_posts[postId] || 0) + 1
      }
      
      if (event.event_type === ANALYTICS_EVENTS.CATEGORY_VIEW) {
        const category = event.data.category
        metrics.top_categories[category] = (metrics.top_categories[category] || 0) + 1
      }
      
      if (event.event_type === ANALYTICS_EVENTS.CONVERSION) {
        metrics.conversions++
      }
      
      if (event.event_type === ANALYTICS_EVENTS.AFFILIATE_CLICK) {
        metrics.affiliate_clicks++
      }
      
      if (event.event_type === ANALYTICS_EVENTS.BOUNCE) {
        metrics.bounce_count++
      }
      
      if (event.load_time) {
        metrics.avg_load_time = (metrics.avg_load_time * (metrics.total_views - 1) + event.load_time) / metrics.total_views
      }
    }
    
    // Convert Set to count
    metrics.unique_visitors = metrics.unique_visitors.size
    
    // Store aggregated metrics
    const metricsKey = `analytics:aggregated:${date}`
    let existingMetrics = await this.kv.get(metricsKey, 'json') || metrics
    
    // Merge metrics
    existingMetrics.total_views += metrics.total_views
    existingMetrics.unique_visitors += metrics.unique_visitors
    existingMetrics.conversions += metrics.conversions
    existingMetrics.affiliate_clicks += metrics.affiliate_clicks
    existingMetrics.bounce_count += metrics.bounce_count
    
    // Merge counts
    for (const [key, value] of Object.entries(metrics.page_views)) {
      existingMetrics.page_views[key] = (existingMetrics.page_views[key] || 0) + value
    }
    
    for (const [key, value] of Object.entries(metrics.referrers)) {
      existingMetrics.referrers[key] = (existingMetrics.referrers[key] || 0) + value
    }
    
    for (const [key, value] of Object.entries(metrics.top_posts)) {
      existingMetrics.top_posts[key] = (existingMetrics.top_posts[key] || 0) + value
    }
    
    await this.kv.put(metricsKey, JSON.stringify(existingMetrics))
  }

  /**
   * Get analytics for a date range
   */
  async getAnalytics(startDate, endDate) {
    const metrics = []
    const currentDate = new Date(startDate)
    const end = new Date(endDate)
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const metricsKey = `analytics:aggregated:${dateStr}`
      const data = await this.kv?.get(metricsKey, 'json')
      
      if (data) {
        metrics.push(data)
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return this.mergeAnalytics(metrics)
  }

  /**
   * Merge multiple analytics objects
   */
  mergeAnalytics(metricsArray) {
    const merged = {
      total_views: 0,
      unique_visitors: 0,
      conversions: 0,
      affiliate_clicks: 0,
      bounce_rate: 0,
      page_views: {},
      referrers: {},
      top_posts: {},
      top_categories: {}
    }
    
    for (const metrics of metricsArray) {
      merged.total_views += metrics.total_views
      merged.unique_visitors += metrics.unique_visitors
      merged.conversions += metrics.conversions
      merged.affiliate_clicks += metrics.affiliate_clicks
      
      for (const [key, value] of Object.entries(metrics.page_views || {})) {
        merged.page_views[key] = (merged.page_views[key] || 0) + value
      }
      
      for (const [key, value] of Object.entries(metrics.referrers || {})) {
        merged.referrers[key] = (merged.referrers[key] || 0) + value
      }
      
      for (const [key, value] of Object.entries(metrics.top_posts || {})) {
        merged.top_posts[key] = (merged.top_posts[key] || 0) + value
      }
    }
    
    if (merged.total_views > 0) {
      merged.bounce_rate = (merged.bounce_count / merged.total_views) * 100
    }
    
    return merged
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics() {
    const today = new Date().toISOString().split('T')[0]
    const currentHour = new Date().getHours()
    
    const realtimeKey = `analytics:realtime:${today}:${currentHour}`
    const events = await this.kv?.get(realtimeKey, 'json') || []
    
    const realtime = {
      active_visitors: new Set(),
      views_last_hour: events.length,
      top_pages: {},
      events: events.slice(-20) // Last 20 events
    }
    
    for (const event of events) {
      if (!event.is_bot && (Date.now() - new Date(event.timestamp).getTime()) < 30 * 60 * 1000) {
        realtime.active_visitors.add(event.client_ip)
      }
      
      realtime.top_pages[event.url] = (realtime.top_pages[event.url] || 0) + 1
    }
    
    realtime.active_visitors = realtime.active_visitors.size
    
    return realtime
  }

  /**
   * Clean old analytics data
   */
  async cleanup() {
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - ANALYTICS_CONFIG.retentionDays)
    
    // List and delete old analytics keys
    // Note: Would need to maintain an index of keys for cleanup
  }
}

// ============================================
// EXPORT MODULE
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AnalyticsHandler,
    ANALYTICS_EVENTS,
    ANALYTICS_CONFIG
  }
}