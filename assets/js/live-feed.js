/**
 * TRENDLIN LIVE FEED - Single Horizontal Carousel
 * UPDATED LAYOUT: Heading → Text → Source Link (Figmaland style)
 * ALL posts in ONE horizontal scrollable carousel
 * Desktop: 60% text (left) + 40% media (right)
 * FILTERED BY CATEGORY - Shows only posts from current category
 */

(function() {
    'use strict';
    
    const CONFIG = {
        postLifespanHours: 24,
        refreshInterval: 300000
    };
    
    let allPosts = [];
    let filteredPosts = [];
    let container = null;
    let currentCategory = null;
    
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
    
    async function init() {
        container = document.getElementById('live-feed-container');
        if (!container) return;
        
        currentCategory = detectCurrentCategory();
        console.log(`Current category filter: ${currentCategory}`);
        
        await loadPosts();
        filterPostsByCategory();
        render();
        
        setInterval(async () => {
            await loadPosts();
            filterPostsByCategory();
            render();
        }, CONFIG.refreshInterval);
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
        } catch (error) {
            console.error('Failed to load posts:', error);
            allPosts = [];
        }
    }
    
    function filterPostsByCategory() {
        const now = new Date();
        
        let dateFiltered = allPosts.filter(post => {
            if (!post.date) return false;
            const postDate = new Date(post.date);
            if (isNaN(postDate.getTime())) return false;
            const diffHours = (now - postDate) / (1000 * 60 * 60);
            return diffHours <= CONFIG.postLifespanHours && diffHours >= 0;
        });
        
        if (currentCategory === 'all') {
            filteredPosts = dateFiltered;
            console.log(`Home page: showing ${filteredPosts.length} posts from all categories`);
        } else if (currentCategory === 'shop') {
            filteredPosts = dateFiltered.filter(post => 
                post.category === 'shop' || post.tags?.includes('product')
            );
            console.log(`Shop page: ${filteredPosts.length} posts`);
        } else {
            filteredPosts = dateFiltered.filter(post => 
                post.category && post.category.toLowerCase() === currentCategory
            );
            console.log(`Category "${currentCategory}": ${filteredPosts.length} posts`);
        }
        
        filteredPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    
    // Helper to get source link - prioritizes post.source, then post.sourceUrl, then fallback
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
    
    function renderPost(post, index) {
        const postId = `${post.id}-${index}`;
        const mediaItems = post.media || (post.image ? [{ type: 'image', url: post.image }] : []);
        // Extract clean text content (removes HTML tags)
        let fullText = post.text || post.content || post.excerpt || '';
        if (fullText && fullText.includes('<')) {
            fullText = fullText.replace(/<[^>]*>/g, '');
        }
        const excerptText = fullText.substring(0, 280) + (fullText.length > 280 ? '...' : '');
        const icon = getCategoryIcon(post.category);
        const displayCategory = getCategoryDisplayName(post.category);
        const sourceLink = getSourceLink(post);
        const sourceLabel = getSourceLabel(post);
        
        // NEW LAYOUT ORDER:
        // 1. HEADING (post title)
        // 2. TEXT (description / excerpt)
        // 3. SOURCE LINK (call-to-action link)
        return `
            <div class="feed-post" data-post-id="${post.id}">
                <div class="post-inner">
                    <!-- 60% TEXT (LEFT) - FIGMALAND STYLE: Heading → Text → Source Link -->
                    <div class="post-content">
                        <div class="post-meta">
                            <div class="post-category">
                                <span class="category-icon">${icon}</span>
                                <span class="category-name">${displayCategory}</span>
                            </div>
                            <span class="post-date">${post.date || 'Recent'}</span>
                        </div>
                        <!-- 1️⃣ HEADING (Title) - FIRST -->
                        <h2 class="post-title">
                            <a href="${escapeHtml(sourceLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title)}</a>
                        </h2>
                        <!-- 2️⃣ TEXT (Excerpt/Content) - SECOND -->
                        <div class="post-excerpt">${escapeHtml(excerptText)}</div>
                        <!-- 3️⃣ SOURCE LINK - THIRD (distinct CTA) -->
                        <div class="post-source-wrapper">
                            <a href="${escapeHtml(sourceLink)}" target="_blank" rel="noopener noreferrer" class="post-source-link">
                                <span class="source-arrow">↗</span>
                                <span>${escapeHtml(sourceLabel)}</span>
                            </a>
                        </div>
                        <!-- Optional footer (author, read time) kept minimal -->
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
                    <!-- 40% MEDIA (RIGHT) -->
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
        
        if (currentCategory === 'all') {
            message = 'No recent posts';
            icon = '📭';
        } else if (currentCategory === 'shop') {
            message = 'No shop items available';
            icon = '🛍️';
        } else {
            const categoryName = getCategoryDisplayName(currentCategory);
            message = `No ${categoryName} posts yet`;
            icon = '📖';
        }
        
        return `
            <div class="feed-empty">
                <div class="empty-icon">${icon}</div>
                <h3>${message}</h3>
                <p>No posts in the last 24 hours for this category.</p>
                <p class="empty-hint">Check back soon for fresh content!</p>
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
    
    showSkeleton();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();