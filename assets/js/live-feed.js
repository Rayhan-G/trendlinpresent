/**
 * TRENDLIN LIVE FEED - Single Horizontal Carousel
 * UPDATED LAYOUT: Heading → Text → Source Link (Figmaland style)
 * ALL posts in ONE horizontal scrollable carousel
 * Desktop: 60% text (left) + 40% media (right)
 * FILTERED BY CATEGORY - Shows only posts from current category
 * 
 * ⏰ POST LIFESPAN: 24 HOURS - Posts automatically expire and are no longer available after 24 hours
 */

(function() {
    'use strict';
    
    const CONFIG = {
        postLifespanHours: 24,        // ⏰ Posts expire after 24 hours
        refreshInterval: 300000,       // Refresh every 5 minutes (300,000 ms)
        storageKey: 'trendlin_expired_posts'  // Track expired posts in session
    };
    
    let allPosts = [];
    let filteredPosts = [];
    let container = null;
    let currentCategory = null;
    let expiredPostIds = new Set();     // Track already expired post IDs to avoid re-processing
    
    // Detect current category from URL path
    function detectCurrentCategory() {
        const path = window.location.pathname;
        const categoryMatch = path.match(/\/categories\/([^\/]+)/);
        
        if (categoryMatch && categoryMatch[1]) {
            let category = categoryMatch[1];
            category = category.replace(/\/$/, '').toLowerCase();
            return category;
        }
        
        if (path === '/' || path === '/index.html') {
            return 'all';
        }
        
        if (path.includes('/affiliate-shop/')) {
            return 'shop';
        }
        
        return 'all';
    }
    
    // Get expiration timestamp for a post (post date + 24 hours)
    function getExpirationTimestamp(postDate) {
        const date = new Date(postDate);
        return date.getTime() + (CONFIG.postLifespanHours * 60 * 60 * 1000);
    }
    
    // Check if a post is expired
    function isPostExpired(post) {
        if (!post.date) return true;
        
        const postDate = new Date(post.date);
        if (isNaN(postDate.getTime())) return true;
        
        const now = new Date();
        const expirationTime = getExpirationTimestamp(post.date);
        const isExpired = now.getTime() > expirationTime;
        
        // Log expiration for debugging (only once per expired post)
        if (isExpired && !expiredPostIds.has(post.id)) {
            expiredPostIds.add(post.id);
            const hoursRemaining = Math.floor((expirationTime - now.getTime()) / (1000 * 60 * 60));
            console.log(`⏰ Post "${post.title}" expired ${Math.abs(hoursRemaining)} hours ago and is no longer available`);
        }
        
        return isExpired;
    }
    
    // Get remaining hours until expiration for a post (for debugging/display)
    function getRemainingHours(post) {
        if (!post.date) return 0;
        const postDate = new Date(post.date);
        if (isNaN(postDate.getTime())) return 0;
        
        const expirationTime = getExpirationTimestamp(post.date);
        const now = new Date();
        const remainingMs = expirationTime - now.getTime();
        
        if (remainingMs <= 0) return 0;
        return Math.floor(remainingMs / (1000 * 60 * 60));
    }
    
    // Get remaining minutes (for display when less than 1 hour)
    function getRemainingMinutes(post) {
        if (!post.date) return 0;
        const postDate = new Date(post.date);
        if (isNaN(postDate.getTime())) return 0;
        
        const expirationTime = getExpirationTimestamp(post.date);
        const now = new Date();
        const remainingMs = expirationTime - now.getTime();
        
        if (remainingMs <= 0) return 0;
        if (remainingMs < 3600000) {
            return Math.floor(remainingMs / (1000 * 60));
        }
        return 0;
    }
    
    // Load expired posts from session storage (optional persistence)
    function loadExpiredTracking() {
        try {
            const stored = sessionStorage.getItem(CONFIG.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                expiredPostIds = new Set(parsed);
            }
        } catch (e) {
            console.warn('Could not load expired tracking:', e);
        }
    }
    
    // Save expired tracking to session storage
    function saveExpiredTracking() {
        try {
            const toStore = Array.from(expiredPostIds);
            sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(toStore));
        } catch (e) {
            console.warn('Could not save expired tracking:', e);
        }
    }
    
    async function init() {
        container = document.getElementById('live-feed-container');
        if (!container) return;
        
        loadExpiredTracking();
        currentCategory = detectCurrentCategory();
        
        // Display category-specific lifespan message
        console.log(`Current category filter: ${currentCategory} | Posts expire after ${CONFIG.postLifespanHours} hours`);
        
        await loadPosts();
        filterPostsByCategory();
        render();
        
        // Set up automatic refresh to remove expired posts
        setInterval(async () => {
            await loadPosts();
            filterPostsByCategory();
            render();
            saveExpiredTracking();
        }, CONFIG.refreshInterval);
        
        // Also set a more frequent check for expiration (every minute) to update UI without full reload
        setInterval(() => {
            if (allPosts.length > 0) {
                const hadExpired = checkAndRemoveExpiredPosts();
                if (hadExpired) {
                    filterPostsByCategory();
                    render();
                    saveExpiredTracking();
                }
            }
        }, 60000); // Check every minute
    }
    
    // Check for newly expired posts without reloading from server
    function checkAndRemoveExpiredPosts() {
        let hasChanges = false;
        const newExpiredIds = [];
        
        for (const post of allPosts) {
            if (isPostExpired(post) && !expiredPostIds.has(post.id)) {
                expiredPostIds.add(post.id);
                newExpiredIds.push(post.id);
                hasChanges = true;
                console.log(`⏰ Post "${post.title}" just expired and has been removed from feed`);
            }
        }
        
        if (newExpiredIds.length > 0) {
            // Trigger a UI update
            return true;
        }
        
        return hasChanges;
    }
    
    async function showSkeleton() {
        if (!container) return;
        container.innerHTML = `
            <div class="feed-skeleton">
                <div class="skeleton-track">
                    <div class="skeleton-post">
                        <div class="skeleton-text">
                            <div class="skeleton-line title"></div>
                            <div class="skeleton-line meta"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line footer"></div>
                        </div>
                        <div class="skeleton-media"></div>
                    </div>
                    <div class="skeleton-post">
                        <div class="skeleton-text">
                            <div class="skeleton-line title"></div>
                            <div class="skeleton-line meta"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line footer"></div>
                        </div>
                        <div class="skeleton-media"></div>
                    </div>
                    <div class="skeleton-post">
                        <div class="skeleton-text">
                            <div class="skeleton-line title"></div>
                            <div class="skeleton-line meta"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line excerpt"></div>
                            <div class="skeleton-line footer"></div>
                        </div>
                        <div class="skeleton-media"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async function loadPosts() {
        try {
            const response = await fetch('/data/posts.json?t=' + Date.now());
            const data = await response.json();
            allPosts = data.posts || [];
            console.log(`Loaded ${allPosts.length} posts total`);
            
            // Log expiration info for debugging
            let activeCount = 0;
            let expiredCount = 0;
            for (const post of allPosts) {
                if (isPostExpired(post)) {
                    expiredCount++;
                } else {
                    activeCount++;
                }
            }
            console.log(`⏰ Posts status: ${activeCount} active, ${expiredCount} expired (${CONFIG.postLifespanHours}h lifespan)`);
            
        } catch (error) {
            console.error('Failed to load posts:', error);
            allPosts = [];
        }
    }
    
    function filterPostsByCategory() {
        const now = new Date();
        
        // Apply 24-hour expiration filter - ONLY include posts that are NOT expired
        let dateFiltered = allPosts.filter(post => {
            if (!post.date) return false;
            const postDate = new Date(post.date);
            if (isNaN(postDate.getTime())) return false;
            
            // CRITICAL: Post is only available if NOT expired
            const isExpired = isPostExpired(post);
            return !isExpired;
        });
        
        console.log(`After 24h expiration filter: ${dateFiltered.length} posts remain (out of ${allPosts.length})`);
        
        if (currentCategory === 'all') {
            filteredPosts = dateFiltered;
            console.log(`Home page: showing ${filteredPosts.length} posts from all categories (24h window)`);
        } else if (currentCategory === 'shop') {
            filteredPosts = dateFiltered.filter(post => 
                post.category === 'shop' || post.tags?.includes('product')
            );
            console.log(`Shop page: ${filteredPosts.length} posts (24h window)`);
        } else {
            filteredPosts = dateFiltered.filter(post => 
                post.category && post.category.toLowerCase() === currentCategory
            );
            console.log(`Category "${currentCategory}": ${filteredPosts.length} posts (24h window)`);
        }
        
        // Sort by date (newest first)
        filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Log remaining time for the oldest active post (to show when next expiration happens)
        if (filteredPosts.length > 0) {
            const oldestPost = filteredPosts[filteredPosts.length - 1];
            const remainingHours = getRemainingHours(oldestPost);
            const remainingMinutes = getRemainingMinutes(oldestPost);
            if (remainingHours > 0) {
                console.log(`⏳ Oldest active post expires in ~${remainingHours}h`);
            } else if (remainingMinutes > 0) {
                console.log(`⏳ Oldest active post expires in ~${remainingMinutes}m`);
            }
        }
    }
    
    function renderMediaCarousel(mediaItems, postId) {
        if (!mediaItems || mediaItems.length === 0) {
            return `<div class="post-media-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18"/><circle cx="8.5" cy="8.5" r="2.5"/><path d="M21 15l-5-4-3 3-4-4-5 5"/></svg>
                        <span>No media</span>
                    </div>`;
        }
        
        const hasMultiple = mediaItems.length > 1;
        const carouselId = `media-${postId}`;
        
        let html = `
            <div class="post-media" data-carousel-id="${carouselId}">
                <div class="media-slides" id="${carouselId}">
        `;
        
        mediaItems.forEach((media, idx) => {
            let mediaHtml = '';
            if (media.type === 'image' || (!media.type && media.url)) {
                mediaHtml = `<img src="${media.url}" alt="Post media" loading="lazy" onerror="this.src='https://placehold.co/800x450?text=No+Image'">`;
            } else if (media.type === 'video') {
                mediaHtml = `<video controls preload="metadata"><source src="${media.url}" type="video/mp4"></video>`;
            } else if (media.type === 'audio') {
                mediaHtml = `<audio controls src="${media.url}"></audio>`;
            } else {
                mediaHtml = `<img src="${media.url}" alt="Media" loading="lazy">`;
            }
            
            html += `<div class="media-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}">${mediaHtml}</div>`;
        });
        
        html += `</div>`;
        
        if (hasMultiple) {
            html += `
                <button class="media-prev" data-carousel="${carouselId}">‹</button>
                <button class="media-next" data-carousel="${carouselId}">›</button>
                <div class="media-dots">
                    ${mediaItems.map((_, idx) => `<span class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>`).join('')}
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }
    
    function getCategoryIcon(category) {
        const icons = {
            technology: '💻',
            tech: '💻',
            wealth: '💰',
            finance: '💰',
            health: '💊',
            wellness: '💊',
            growth: '🌱',
            personal: '🌱',
            entertainment: '🎬',
            media: '🎬',
            world: '🌍',
            global: '🌍',
            lifestyle: '✨',
            living: '✨',
            shop: '🛍️',
            product: '🛍️'
        };
        return icons[category?.toLowerCase()] || '📄';
    }
    
    function getCategoryDisplayName(category) {
        const names = {
            technology: 'Technology',
            tech: 'Technology',
            wealth: 'Wealth',
            finance: 'Wealth',
            health: 'Health',
            wellness: 'Health',
            growth: 'Growth',
            personal: 'Growth',
            entertainment: 'Entertainment',
            media: 'Entertainment',
            world: 'World',
            global: 'World',
            lifestyle: 'Lifestyle',
            living: 'Lifestyle',
            shop: 'Shop',
            product: 'Shop'
        };
        return names[category?.toLowerCase()] || category || 'Story';
    }
    
    function getSourceLink(post) {
        if (post.sourceLink) return post.sourceLink;
        if (post.sourceUrl) return post.sourceUrl;
        if (post.source) return post.source;
        if (post.url) return post.url;
        return `/posts/index.html?id=${post.id}`;
    }
    
    function getSourceLabel(post) {
        if (post.sourceLabel) return post.sourceLabel;
        if (post.ctaText) return post.ctaText;
        return 'Read full story →';
    }
    
    // Helper to format relative time (how long ago the post was published)
    function getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    }
    
    function renderPost(post, index) {
        const postId = `${post.id}-${index}`;
        const mediaItems = post.media || (post.image ? [{ type: 'image', url: post.image }] : []);
        let fullText = post.text || post.content || post.excerpt || '';
        if (fullText && fullText.includes('<')) {
            fullText = fullText.replace(/<[^>]*>/g, '');
        }
        const excerptText = fullText.substring(0, 280) + (fullText.length > 280 ? '...' : '');
        const icon = getCategoryIcon(post.category);
        const displayCategory = getCategoryDisplayName(post.category);
        const sourceLink = getSourceLink(post);
        const sourceLabel = getSourceLabel(post);
        const relativeTime = getRelativeTime(post.date);
        const remainingHours = getRemainingHours(post);
        const remainingMinutes = getRemainingMinutes(post);
        
        // Build expiry badge (optional, for transparency)
        let expiryBadge = '';
        if (remainingHours > 0 && remainingHours < 6) {
            expiryBadge = `<span class="expiry-badge" title="Expires in ${remainingHours}h">⏳ ${remainingHours}h left</span>`;
        } else if (remainingHours === 0 && remainingMinutes > 0 && remainingMinutes <= 60) {
            expiryBadge = `<span class="expiry-badge" title="Expires in ${remainingMinutes}m">⏳ ${remainingMinutes}m left</span>`;
        }
        
        return `
            <div class="feed-post" data-post-id="${post.id}" data-post-date="${post.date}">
                <div class="post-inner">
                    <div class="post-content">
                        <div class="post-meta">
                            <div class="post-category">
                                <span class="category-icon">${icon}</span>
                                <span class="category-name">${displayCategory}</span>
                            </div>
                            <span class="post-date" title="Posted ${relativeTime}">${relativeTime}</span>
                            ${expiryBadge}
                        </div>
                        <h2 class="post-title">
                            <a href="${escapeHtml(sourceLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title)}</a>
                        </h2>
                        <div class="post-excerpt">${escapeHtml(excerptText)}</div>
                        <div class="post-source-wrapper">
                            <a href="${escapeHtml(sourceLink)}" target="_blank" rel="noopener noreferrer" class="post-source-link">
                                <span class="source-arrow">↗</span>
                                <span>${escapeHtml(sourceLabel)}</span>
                            </a>
                        </div>
                        <div class="post-footer">
                            <div class="post-author">
                                <span class="author-avatar">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </span>
                                <span class="author-name">${escapeHtml(post.author || 'Trendlin')}</span>
                            </div>
                            <div class="post-read-time">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ${post.readTime || '5'} min read
                            </div>
                        </div>
                    </div>
                    <div class="post-visual">
                        ${renderMediaCarousel(mediaItems, postId)}
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderEmptyState() {
        let message = '';
        let icon = '📭';
        let subMessage = `No posts in the last ${CONFIG.postLifespanHours} hours for this category.`;
        
        if (currentCategory === 'all') {
            message = 'No recent posts';
            icon = '📭';
            subMessage = `No posts have been published in the last ${CONFIG.postLifespanHours} hours.`;
        } else if (currentCategory === 'shop') {
            message = 'No shop items available';
            icon = '🛍️';
            subMessage = `No shop posts in the last ${CONFIG.postLifespanHours} hours.`;
        } else {
            const categoryName = getCategoryDisplayName(currentCategory);
            message = `No ${categoryName} posts yet`;
            icon = '📖';
        }
        
        return `
            <div class="feed-empty">
                <div class="empty-icon">${icon}</div>
                <h3>${message}</h3>
                <p>${subMessage}</p>
                <p class="empty-hint">Check back soon for fresh content! ✨</p>
            </div>
        `;
    }
    
    async function render() {
        if (!container) return;
        
        if (filteredPosts.length === 0) {
            container.innerHTML = renderEmptyState();
            return;
        }
        
        const carouselId = 'main-carousel';
        
        let html = `
            <div class="carousel-container">
                <div class="carousel-track" id="${carouselId}">
                    ${filteredPosts.map((post, idx) => renderPost(post, idx)).join('')}
                </div>
                ${filteredPosts.length > 1 ? `
                    <button class="carousel-nav carousel-prev" data-carousel="${carouselId}">‹</button>
                    <button class="carousel-nav carousel-next" data-carousel="${carouselId}">›</button>
                ` : ''}
                <div class="carousel-scrollbar">
                    <div class="carousel-scrollbar-thumb"></div>
                </div>
                <div class="carousel-counter">
                    <span class="current-index">1</span> / <span class="total-count">${filteredPosts.length}</span>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        attachCarouselEvents();
        attachMediaCarouselEvents();
        updateCounter();
    }
    
    function attachCarouselEvents() {
        const track = document.querySelector('.carousel-track');
        const prevBtn = document.querySelector('.carousel-prev');
        const nextBtn = document.querySelector('.carousel-next');
        const scrollbar = document.querySelector('.carousel-scrollbar-thumb');
        
        if (!track) return;
        
        if (prevBtn && nextBtn && filteredPosts.length > 1) {
            prevBtn.addEventListener('click', () => {
                const scrollAmount = track.clientWidth;
                track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });
            
            nextBtn.addEventListener('click', () => {
                const scrollAmount = track.clientWidth;
                track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });
        }
        
        const updateScrollbar = () => {
            const scrollWidth = track.scrollWidth;
            const clientWidth = track.clientWidth;
            const scrollLeft = track.scrollLeft;
            
            if (scrollbar && scrollWidth > clientWidth) {
                const scrollPercent = scrollLeft / (scrollWidth - clientWidth);
                const thumbWidth = (clientWidth / scrollWidth) * 100;
                const thumbLeft = scrollPercent * (100 - thumbWidth);
                scrollbar.style.width = `${thumbWidth}%`;
                scrollbar.style.marginLeft = `${thumbLeft}%`;
            }
            
            updateCounter();
        };
        
        track.addEventListener('scroll', updateScrollbar);
        window.addEventListener('resize', updateScrollbar);
        setTimeout(updateScrollbar, 100);
    }
    
    function updateCounter() {
        const track = document.querySelector('.carousel-track');
        const currentSpan = document.querySelector('.current-index');
        const totalSpan = document.querySelector('.total-count');
        
        if (!track || !currentSpan) return;
        
        const scrollLeft = track.scrollLeft;
        const clientWidth = track.clientWidth;
        
        if (clientWidth === 0) return;
        
        const postWidth = clientWidth;
        let currentIndex = Math.round(scrollLeft / postWidth) + 1;
        const total = filteredPosts.length;
        
        currentIndex = Math.min(currentIndex, total);
        currentIndex = Math.max(currentIndex, 1);
        
        currentSpan.textContent = currentIndex;
        
        if (totalSpan) {
            totalSpan.textContent = total;
        }
    }
    
    function attachMediaCarouselEvents() {
        document.querySelectorAll('.media-prev, .media-next').forEach(btn => {
            btn.removeEventListener('click', handleMediaNav);
            btn.addEventListener('click', handleMediaNav);
        });
        
        document.querySelectorAll('.media-dots .dot').forEach(dot => {
            dot.removeEventListener('click', handleMediaDot);
            dot.addEventListener('click', handleMediaDot);
        });
    }
    
    function handleMediaNav(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const carouselId = btn.dataset.carousel;
        const container = document.getElementById(carouselId);
        if (!container) return;
        
        const slides = container.querySelectorAll('.media-slide');
        const mediaContainer = container.closest('.post-media');
        const dots = mediaContainer?.querySelectorAll('.media-dots .dot');
        
        if (slides.length === 0) return;
        
        let activeIndex = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
        const isPrev = btn.classList.contains('media-prev');
        
        activeIndex = isPrev 
            ? (activeIndex - 1 + slides.length) % slides.length 
            : (activeIndex + 1) % slides.length;
        
        slides.forEach((slide, idx) => {
            slide.classList.toggle('active', idx === activeIndex);
        });
        
        if (dots) {
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === activeIndex);
            });
        }
    }
    
    function handleMediaDot(e) {
        e.stopPropagation();
        const dot = e.currentTarget;
        const dotsContainer = dot.closest('.media-dots');
        const mediaContainer = dotsContainer?.closest('.post-media');
        const carouselId = mediaContainer?.dataset.carouselId;
        const container = document.getElementById(carouselId);
        if (!container) return;
        
        const slides = container.querySelectorAll('.media-slide');
        const index = parseInt(dot.dataset.index);
        
        slides.forEach((slide, idx) => {
            slide.classList.toggle('active', idx === index);
        });
        
        dotsContainer?.querySelectorAll('.dot').forEach((d, idx) => {
            d.classList.toggle('active', idx === index);
        });
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // Add CSS for expiry badge styling (inject if not present)
    function injectExpiryStyles() {
        if (document.getElementById('trendlin-expiry-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'trendlin-expiry-styles';
        styles.textContent = `
            .expiry-badge {
                display: inline-flex;
                align-items: center;
                background: rgba(245, 158, 11, 0.15);
                border: 1px solid rgba(245, 158, 11, 0.4);
                border-radius: 20px;
                padding: 2px 8px;
                font-size: 0.65rem;
                font-weight: 500;
                color: #fbbf24;
                margin-left: 10px;
                white-space: nowrap;
                animation: pulseExpiry 2s infinite;
            }
            
            @keyframes pulseExpiry {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; background: rgba(245, 158, 11, 0.25); }
            }
            
            .feed-empty .empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.7;
            }
            
            .feed-empty h3 {
                font-size: 1.3rem;
                margin-bottom: 8px;
                color: #e5e7eb;
            }
            
            .feed-empty p {
                color: #9ca3af;
                font-size: 0.85rem;
            }
            
            .feed-empty .empty-hint {
                margin-top: 16px;
                font-size: 0.8rem;
                color: #6b7280;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Inject styles
    injectExpiryStyles();
    
    showSkeleton();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();