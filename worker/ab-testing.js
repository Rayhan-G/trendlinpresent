// ============================================
// A/B TESTING HANDLER
// Trending Wealth Ultimate Experimentation
// Version: 1.0.0
// ============================================

// A/B test configurations
const AB_TESTS = {
  // Hero section layout test
  hero_layout: {
    id: 'hero_layout',
    name: 'Hero Section Layout',
    description: 'Testing different hero section designs',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: 'active', // active, paused, ended
    trafficAllocation: 0.5, // 50% of traffic
    variants: [
      {
        id: 'control',
        name: 'Current Design',
        weight: 0.5, // 50% of test traffic
        metrics: ['click_through_rate', 'conversion_rate', 'bounce_rate']
      },
      {
        id: 'variant_a',
        name: 'Video Hero',
        weight: 0.25, // 25% of test traffic
        metrics: ['click_through_rate', 'conversion_rate', 'bounce_rate']
      },
      {
        id: 'variant_b',
        name: 'Interactive Hero',
        weight: 0.25, // 25% of test traffic
        metrics: ['click_through_rate', 'conversion_rate', 'bounce_rate']
      }
    ]
  },
  
  // CTA button color test
  cta_button_color: {
    id: 'cta_button_color',
    name: 'CTA Button Color',
    description: 'Testing optimal button color for conversions',
    startDate: '2024-01-15',
    endDate: '2024-02-28',
    status: 'active',
    trafficAllocation: 0.3, // 30% of traffic
    variants: [
      {
        id: 'control',
        name: 'Blue Button',
        weight: 0.33,
        value: { color: '#667eea', text: 'Shop Now' }
      },
      {
        id: 'variant_a',
        name: 'Green Button',
        weight: 0.33,
        value: { color: '#10b981', text: 'Shop Now' }
      },
      {
        id: 'variant_b',
        name: 'Orange Button',
        weight: 0.34,
        value: { color: '#f59e0b', text: 'Shop Now' }
      }
    ]
  },
  
  // Pricing page layout
  pricing_layout: {
    id: 'pricing_layout',
    name: 'Pricing Page Layout',
    description: 'Testing pricing page design',
    startDate: '2024-02-01',
    endDate: '2024-04-30',
    status: 'active',
    trafficAllocation: 0.2,
    variants: [
      {
        id: 'control',
        name: 'Three Column',
        weight: 0.5,
        metrics: ['conversion_rate', 'average_order_value']
      },
      {
        id: 'variant_a',
        name: 'Two Column + Comparison',
        weight: 0.5,
        metrics: ['conversion_rate', 'average_order_value']
      }
    ]
  },
  
  // Newsletter placement test
  newsletter_placement: {
    id: 'newsletter_placement',
    name: 'Newsletter Signup Placement',
    description: 'Optimal position for newsletter signup',
    startDate: '2024-01-10',
    endDate: '2024-03-15',
    status: 'active',
    trafficAllocation: 0.4,
    variants: [
      {
        id: 'control',
        name: 'Sidebar',
        weight: 0.5,
        metrics: ['signup_rate']
      },
      {
        id: 'variant_a',
        name: 'Popup',
        weight: 0.5,
        metrics: ['signup_rate']
      }
    ]
  },
  
  // Content layout test
  content_layout: {
    id: 'content_layout',
    name: 'Article Content Layout',
    description: 'Testing different content layouts',
    startDate: '2024-01-20',
    endDate: '2024-03-20',
    status: 'active',
    trafficAllocation: 0.5,
    variants: [
      {
        id: 'control',
        name: 'Standard Layout',
        weight: 0.5,
        metrics: ['time_on_page', 'scroll_depth', 'share_rate']
      },
      {
        id: 'variant_a',
        name: 'Sticky Sidebar',
        weight: 0.5,
        metrics: ['time_on_page', 'scroll_depth', 'share_rate']
      }
    ]
  }
}

// ============================================
// A/B TESTING HANDLER CLASS
// ============================================
class ABTestingHandler {
  constructor(env, ctx) {
    this.env = env
    this.ctx = ctx
    this.kv = env.AB_TESTING_KV || null
    this.tests = AB_TESTS
  }

  /**
   * Get variant for a test
   */
  async getVariant(testId, request) {
    const test = this.tests[testId]
    
    // Check if test is active
    if (!this.isTestActive(test)) {
      return { variant: null, testId: null }
    }
    
    // Check if user should be included in test
    if (!this.shouldIncludeInTest(test, request)) {
      return { variant: null, testId: null }
    }
    
    // Check for existing assignment
    const existingAssignment = await this.getExistingAssignment(testId, request)
    if (existingAssignment) {
      return existingAssignment
    }
    
    // Assign new variant
    const variant = this.assignVariant(test)
    
    // Store assignment
    await this.storeAssignment(testId, variant, request)
    
    return { variant: variant.id, testId: testId, variantData: variant }
  }

  /**
   * Check if test is active
   */
  isTestActive(test) {
    if (test.status !== 'active') return false
    
    const now = new Date()
    const startDate = new Date(test.startDate)
    const endDate = new Date(test.endDate)
    
    return now >= startDate && now <= endDate
  }

  /**
   * Determine if user should be included in test
   */
  shouldIncludeInTest(test, request) {
    // Use cookie to persist test participation
    const cookie = request.headers.get('Cookie') || ''
    const testCookie = cookie.match(new RegExp(`${test.id}=([^;]+)`))
    
    // If already in test, include
    if (testCookie) {
      return true
    }
    
    // Use consistent hashing for traffic allocation
    const userId = this.getUserId(request)
    const hash = this.hashString(`${userId}:${test.id}`)
    const normalizedHash = hash / 0xFFFFFFFF // Normalize to 0-1
    
    return normalizedHash < test.trafficAllocation
  }

  /**
   * Get user ID for consistent bucketing
   */
  getUserId(request) {
    // Try to get from cookie first
    const cookie = request.headers.get('Cookie') || ''
    const sessionMatch = cookie.match(/session_id=([^;]+)/)
    
    if (sessionMatch) {
      return sessionMatch[1]
    }
    
    // Fallback to IP + User Agent
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const ua = request.headers.get('User-Agent') || 'unknown'
    return `${ip}:${ua}`
  }

  /**
   * Hash string to number
   */
  hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Assign variant based on weights
   */
  assignVariant(test) {
    const random = Math.random()
    let cumulativeWeight = 0
    
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight
      if (random < cumulativeWeight) {
        return variant
      }
    }
    
    return test.variants[0] // Fallback to first variant
  }

  /**
   * Get existing variant assignment
   */
  async getExistingAssignment(testId, request) {
    if (!this.kv) return null
    
    const cookie = request.headers.get('Cookie') || ''
    const assignmentCookie = cookie.match(new RegExp(`${testId}=([^;]+)`))
    
    if (assignmentCookie) {
      const variantId = assignmentCookie[1]
      const test = this.tests[testId]
      const variant = test.variants.find(v => v.id === variantId)
      return { variant: variantId, testId: testId, variantData: variant }
    }
    
    // Check KV storage
    const userId = this.getUserId(request)
    const assignmentKey = `ab_test:${testId}:${userId}`
    const stored = await this.kv.get(assignmentKey)
    
    if (stored) {
      return JSON.parse(stored)
    }
    
    return null
  }

  /**
   * Store variant assignment
   */
  async storeAssignment(testId, variant, request) {
    // Store in KV
    if (this.kv) {
      const userId = this.getUserId(request)
      const assignmentKey = `ab_test:${testId}:${userId}`
      const assignment = {
        variant: variant.id,
        testId: testId,
        assignedAt: new Date().toISOString(),
        variantData: variant
      }
      await this.kv.put(assignmentKey, JSON.stringify(assignment), {
        expirationTtl: 90 * 24 * 60 * 60 // 90 days
      })
    }
    
    // Return cookie header to set
    return this.getCookieHeader(testId, variant.id)
  }

  /**
   * Get cookie header for setting variant
   */
  getCookieHeader(testId, variantId) {
    const expires = new Date()
    expires.setDate(expires.getDate() + 90) // 90 days
    
    return {
      'Set-Cookie': `${testId}=${variantId}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`
    }
  }

  /**
   * Apply variant to HTML
   */
  applyVariant(html, variant, testId) {
    if (!variant) return html
    
    // Apply test-specific modifications
    switch (testId) {
      case 'hero_layout':
        html = this.applyHeroLayoutTest(html, variant)
        break
      case 'cta_button_color':
        html = this.applyCtaButtonTest(html, variant)
        break
      case 'pricing_layout':
        html = this.applyPricingLayoutTest(html, variant)
        break
      case 'newsletter_placement':
        html = this.applyNewsletterTest(html, variant)
        break
      case 'content_layout':
        html = this.applyContentLayoutTest(html, variant)
        break
      default:
        break
    }
    
    // Add tracking script
    html = this.addTrackingScript(html, testId, variant.id)
    
    return html
  }

  /**
   * Apply hero layout test
   */
  applyHeroLayoutTest(html, variant) {
    if (variant.id === 'variant_a') {
      // Replace hero with video version
      html = html.replace(
        /<div class="hero-content">[\s\S]*?<\/div>/,
        '<div class="hero-content video-hero">[VIDEO_HERO_CONTENT]</div>'
      )
    } else if (variant.id === 'variant_b') {
      // Replace hero with interactive version
      html = html.replace(
        /<div class="hero-content">[\s\S]*?<\/div>/,
        '<div class="hero-content interactive-hero">[INTERACTIVE_HERO_CONTENT]</div>'
      )
    }
    return html
  }

  /**
   * Apply CTA button test
   */
  applyCtaButtonTest(html, variant) {
    if (variant.id !== 'control') {
      const color = variant.value.color
      html = html.replace(
        /<button class="cta-button">/g,
        `<button class="cta-button" style="background: ${color};">`
      )
    }
    return html
  }

  /**
   * Apply pricing layout test
   */
  applyPricingLayoutTest(html, variant) {
    if (variant.id === 'variant_a') {
      // Replace with two column layout
      html = html.replace(
        /<div class="pricing-grid">[\s\S]*?<\/div>/,
        '<div class="pricing-grid two-column">[TWO_COLUMN_PRICING]</div>'
      )
    }
    return html
  }

  /**
   * Apply newsletter placement test
   */
  applyNewsletterTest(html, variant) {
    if (variant.id === 'variant_a') {
      // Add popup newsletter
      html = html.replace(
        '</body>',
        '<div class="newsletter-popup">[NEWSLETTER_POPUP]</div></body>'
      )
    }
    return html
  }

  /**
   * Apply content layout test
   */
  applyContentLayoutTest(html, variant) {
    if (variant.id === 'variant_a') {
      // Add sticky sidebar
      html = html.replace(
        /<div class="post-content">/g,
        '<div class="post-content sticky-sidebar">'
      )
    }
    return html
  }

  /**
   * Add tracking script to HTML
   */
  addTrackingScript(html, testId, variantId) {
    const trackingScript = `
      <script>
        // Track A/B test exposure
        if (typeof gtag !== 'undefined') {
          gtag('event', 'experiment_impression', {
            'experiment_id': '${testId}',
            'variant_id': '${variantId}',
            'experiment_name': '${this.tests[testId]?.name || testId}'
          });
        }
        
        // Store in localStorage for tracking
        localStorage.setItem('ab_test_${testId}', '${variantId}');
      </script>
    `
    
    return html.replace('</body>', `${trackingScript}</body>`)
  }

  /**
   * Track conversion for A/B test
   */
  async trackConversion(testId, variantId, conversionType, value = null) {
    if (!this.kv) return
    
    const today = new Date().toISOString().split('T')[0]
    const key = `ab_test:results:${testId}:${today}`
    
    let results = await this.kv.get(key, 'json') || {}
    
    if (!results[variantId]) {
      results[variantId] = {
        views: 0,
        conversions: {},
        revenue: 0
      }
    }
    
    results[variantId].conversions[conversionType] = 
      (results[variantId].conversions[conversionType] || 0) + 1
    
    if (value) {
      results[variantId].revenue += value
    }
    
    await this.kv.put(key, JSON.stringify(results))
  }

  /**
   * Get test results
   */
  async getTestResults(testId) {
    if (!this.kv) return null
    
    const test = this.tests[testId]
    if (!test) return null
    
    const results = []
    const startDate = new Date(test.startDate)
    const endDate = new Date(test.endDate)
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const key = `ab_test:results:${testId}:${dateStr}`
      const dayResults = await this.kv.get(key, 'json')
      
      if (dayResults) {
        results.push(dayResults)
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Aggregate results
    const aggregated = this.aggregateResults(results, test)
    
    // Calculate statistical significance
    aggregated.significance = this.calculateSignificance(aggregated)
    
    return aggregated
  }

  /**
   * Aggregate test results
   */
  aggregateResults(resultsArray, test) {
    const aggregated = {}
    
    for (const variant of test.variants) {
      aggregated[variant.id] = {
        name: variant.name,
        views: 0,
        conversions: {},
        revenue: 0,
        conversionRate: 0
      }
    }
    
    for (const dayResults of resultsArray) {
      for (const [variantId, data] of Object.entries(dayResults)) {
        if (aggregated[variantId]) {
          aggregated[variantId].views += data.views || 0
          aggregated[variantId].revenue += data.revenue || 0
          
          for (const [convType, count] of Object.entries(data.conversions || {})) {
            aggregated[variantId].conversions[convType] = 
              (aggregated[variantId].conversions[convType] || 0) + count
          }
        }
      }
    }
    
    // Calculate conversion rates
    for (const variantId in aggregated) {
      const totalConversions = Object.values(aggregated[variantId].conversions).reduce((a, b) => a + b, 0)
      aggregated[variantId].conversionRate = aggregated[variantId].views > 0 
        ? (totalConversions / aggregated[variantId].views) * 100 
        : 0
    }
    
    return aggregated
  }

  /**
   * Calculate statistical significance
   */
  calculateSignificance(aggregated) {
    // Simple significance calculation
    // Returns uplift and confidence for each variant compared to control
    const control = aggregated.control
    if (!control) return {}
    
    const significance = {}
    
    for (const [variantId, variant] of Object.entries(aggregated)) {
      if (variantId === 'control') continue
      
      const uplift = variant.conversionRate - control.conversionRate
      const percentUplift = control.conversionRate > 0 
        ? (uplift / control.conversionRate) * 100 
        : 0
      
      significance[variantId] = {
        uplift: uplift,
        percentUplift: percentUplift,
        isWinner: percentUplift > 10 && variant.views > 1000 // Simplified
      }
    }
    
    return significance
  }

  /**
   * Get active tests list
   */
  getActiveTests() {
    const activeTests = []
    
    for (const [testId, test] of Object.entries(this.tests)) {
      if (this.isTestActive(test)) {
        activeTests.push({
          id: testId,
          name: test.name,
          description: test.description,
          variants: test.variants.map(v => ({ id: v.id, name: v.name, weight: v.weight }))
        })
      }
    }
    
    return activeTests
  }
}

// ============================================
// EXPORT MODULE
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ABTestingHandler,
    AB_TESTS
  }
}