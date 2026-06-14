/**
 * TRENDLIN - Affiliate Shop Product Explorer
 * Fetches real data from /affiliate-shop/data/products.json
 */

(function() {
    'use strict';
    
    // ==================== FIXED 7 CATEGORIES ====================
    const FIXED_CATEGORIES = [
        { id: 'technology', displayName: 'Technology', icon: 'fa-microchip' },
        { id: 'health', displayName: 'Health', icon: 'fa-heartbeat' },
        { id: 'wealth', displayName: 'Wealth', icon: 'fa-chart-line' },
        { id: 'growth', displayName: 'Growth', icon: 'fa-seedling' },
        { id: 'entertainment', displayName: 'Entertainment', icon: 'fa-film' },
        { id: 'world', displayName: 'World', icon: 'fa-globe' },
        { id: 'lifestyle', displayName: 'Lifestyle', icon: 'fa-leaf' }
    ];
    
    // ==================== STATE ====================
    let PRODUCTS = [];
    let filteredProducts = [];
    let activeCategory = 'all';
    let currentSort = 'trending';
    let quickViewProduct = null;
    
    // ==================== LOAD PRODUCTS ====================
    async function loadProducts() {
        try {
            const response = await fetch('/affiliate-shop/data/products.json?t=' + Date.now());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data.products && Array.isArray(data.products)) {
                PRODUCTS = data.products.filter(p => p !== null && p.id);
            } else if (Array.isArray(data)) {
                PRODUCTS = data.filter(p => p !== null && p.id);
            } else {
                throw new Error('Invalid data format');
            }
            
            // Normalize products
            PRODUCTS = PRODUCTS.map(p => ({
                id: p.id,
                name: p.name || 'Product',
                category: (p.category || 'lifestyle').toLowerCase(),
                price: parseFloat(p.price) || 0,
                originalPrice: parseFloat(p.originalPrice) || parseFloat(p.compareAtPrice) || parseFloat(p.price) || 0,
                rating: parseFloat(p.rating) || 4.0,
                reviews: parseInt(p.reviews) || 0,
                image: p.image || 'https://placehold.co/600x400?text=Product',
                affiliateLink: p.affiliateLink || p.sourceUrl || '#',
                description: p.description || 'Amazing product!',
                trending: p.trending === true,
                bestSeller: p.bestSeller === true,
                discount: parseInt(p.discount) || 0,
                inStock: p.inStock !== false
            }));
            
            // Auto-calculate discount
            PRODUCTS.forEach(p => {
                if (!p.discount && p.originalPrice > p.price) {
                    p.discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                }
            });
            
            console.log(`✅ Loaded ${PRODUCTS.length} products from affiliate-shop/data/products.json`);
            applyFilters();
            render();
            renderTrending();
            
        } catch (error) {
            console.error('Failed to load products:', error);
            showErrorState(error.message);
        }
    }
    
    // ==================== EMPTY STATE MESSAGES ====================
    function showEmptyState() {
        const emptyMessages = {
            noProducts: {
                icon: '🛒',
                title: 'No Products Available',
                message: 'We\'re currently updating our inventory. Check back soon for amazing deals!',
                action: null
            },
            noFilterResults: {
                icon: '🔍',
                title: 'No matching products found',
                message: 'Try adjusting your filters or search for something else',
                action: 'Clear Filters'
            },
            noCategoryResults: (categoryName) => ({
                icon: '📁',
                title: `No products in ${categoryName}`,
                message: `We don't have any products in ${categoryName} at the moment. Explore other categories!`,
                action: 'Browse All Products'
            }),
            noTrending: {
                icon: '🔥',
                title: 'No trending products yet',
                message: 'Check back soon for trending items!',
                action: null
            },
            searchNoResults: (searchTerm) => ({
                icon: '🔎',
                title: `No results for "${searchTerm}"`,
                message: `We couldn't find any products matching "${searchTerm}". Try a different search term.`,
                action: 'Clear Search'
            })
        };
        return emptyMessages;
    }
    
    function showErrorState(errorMessage) {
        document.getElementById('app').innerHTML = `
            <div class="empty-state error-state">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to Load Products</h3>
                <p>${escapeHtml(errorMessage)}</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">Please make sure the products.json file exists and has valid data.</p>
                <button onclick="location.reload()" class="retry-btn" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
    
    function renderEmptyProductsState() {
        const emptyState = showEmptyState();
        const counts = getCategoryCounts();
        const activeCategoryName = activeCategory === 'all' ? 'All Categories' : getCategoryDisplayName(activeCategory);
        
        let emptyConfig;
        
        // Determine which empty state to show
        if (PRODUCTS.length === 0) {
            emptyConfig = emptyState.noProducts;
        } else if (searchQuery && searchQuery.length > 0 && filteredProducts.length === 0) {
            emptyConfig = emptyState.searchNoResults(searchQuery);
        } else if (activeCategory !== 'all' && counts[activeCategory] === 0) {
            emptyConfig = emptyState.noCategoryResults(activeCategoryName);
        } else {
            emptyConfig = emptyState.noFilterResults;
        }
        
        return `
            <div class="empty-state">
                <div class="empty-icon">${emptyConfig.icon}</div>
                <h3>${emptyConfig.title}</h3>
                <p>${emptyConfig.message}</p>
                ${emptyConfig.action ? `
                    <button class="clear-filters-btn" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        ${emptyConfig.action}
                    </button>
                ` : ''}
                ${activeCategory !== 'all' && counts[activeCategory] === 0 ? `
                    <div class="suggestion-categories" style="margin-top: 1.5rem;">
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.5rem;">Popular categories:</p>
                        <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                            ${FIXED_CATEGORIES.filter(c => counts[c.id] > 0).slice(0, 4).map(cat => `
                                <button class="suggestion-cat-chip" data-cat="${cat.id}" style="padding: 0.3rem 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 2rem; font-size: 0.7rem; cursor: pointer;">
                                    <i class="fas ${cat.icon}"></i> ${cat.displayName}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ==================== FILTERS ====================
    function applyFilters() {
        let filtered = [...PRODUCTS];
        
        if (activeCategory !== 'all') {
            filtered = filtered.filter(p => p.category === activeCategory);
        }
        
        switch (currentSort) {
            case 'trending':
                filtered.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0) || b.rating - a.rating);
                break;
            case 'price-low':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'discount':
                filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
                break;
            case 'popular':
                filtered.sort((a, b) => b.reviews - a.reviews);
                break;
            default:
                filtered.sort((a, b) => b.id - a.id);
        }
        
        filteredProducts = filtered;
    }
    
    function getCategoryCounts() {
        const counts = {};
        FIXED_CATEGORIES.forEach(c => counts[c.id] = 0);
        PRODUCTS.forEach(p => {
            if (counts[p.category] !== undefined) counts[p.category]++;
            else counts.lifestyle++;
        });
        return counts;
    }
    
    function getCategoryDisplayName(catId) {
        const cat = FIXED_CATEGORIES.find(c => c.id === catId);
        return cat ? cat.displayName : catId;
    }
    
    // ==================== RENDER HELPERS ====================
    function renderStars(rating) {
        const full = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const empty = 5 - full - (hasHalf ? 1 : 0);
        return '★'.repeat(full) + (hasHalf ? '½' : '') + '☆'.repeat(empty);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }
    
    // ==================== TRENDING CAROUSEL ====================
    function renderTrending() {
        const trending = PRODUCTS.filter(p => p.trending === true).slice(0, 12);
        const track = document.getElementById('trendingTrack');
        const emptyState = showEmptyState();
        
        if (track) {
            if (trending.length === 0) {
                track.innerHTML = `
                    <div style="padding: 2rem; text-align: center; width: 100%;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔥</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${emptyState.noTrending.message}</div>
                    </div>
                `;
            } else {
                track.innerHTML = trending.map(p => `
                    <div class="trending-card" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
                        <img class="trending-card-img" src="${p.image}" onerror="this.src='https://placehold.co/400x400?text=TRENDLIN'" alt="">
                        <div class="trending-card-info">
                            <div class="trending-card-category">${escapeHtml(p.category || 'Product')}</div>
                            <div class="trending-card-name">${escapeHtml(p.name.length > 35 ? p.name.slice(0,32)+'…' : p.name)}</div>
                            <div class="trending-card-price">$${p.price.toFixed(2)}</div>
                            ${p.discount ? `<span class="trending-badge">-${p.discount}%</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Carousel navigation
        const container = document.getElementById('trendingCarousel');
        const prev = document.getElementById('trendingPrevBtn');
        const next = document.getElementById('trendingNextBtn');
        if (prev && next && container && trending.length > 0) {
            prev.onclick = () => container.scrollBy({ left: -260, behavior: 'smooth' });
            next.onclick = () => container.scrollBy({ left: 260, behavior: 'smooth' });
        }
        
        // Click handlers
        document.querySelectorAll('.trending-card').forEach(card => {
            card.addEventListener('click', () => {
                if (card.dataset.product) {
                    quickViewProduct = JSON.parse(card.dataset.product);
                    render();
                }
            });
        });
    }
    
    // ==================== MAIN RENDER ====================
    function render() {
        const counts = getCategoryCounts();
        const totalProducts = PRODUCTS.length;
        const avgRating = PRODUCTS.length ? (PRODUCTS.reduce((s,p)=>s+p.rating,0)/PRODUCTS.length).toFixed(1) : '0';
        const onSaleTotal = PRODUCTS.filter(p => p.discount > 0).length;
        const hasProducts = PRODUCTS.length > 0;
        
        const html = `
            <div class="stats-bar">
                <div class="stat-card"><span class="stat-number">${totalProducts}</span><span class="stat-label">Products</span></div>
                <div class="stat-card"><span class="stat-number">${avgRating}</span><span class="stat-label">Avg Rating</span></div>
                <div class="stat-card"><span class="stat-number">${onSaleTotal}</span><span class="stat-label">On Sale</span></div>
            </div>
            
            <div class="category-strip">
                <button class="cat-chip ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">✨ All (${totalProducts})</button>
                ${FIXED_CATEGORIES.map(cat => `
                    <button class="cat-chip ${activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                        <i class="fas ${cat.icon}"></i> ${cat.displayName} (${counts[cat.id] || 0})
                    </button>
                `).join('')}
            </div>
            
            <div class="sort-bar">
                <select id="sortSelect" class="sort-select">
                    <option value="trending" ${currentSort === 'trending' ? 'selected' : ''}>🔥 Trending First</option>
                    <option value="popular" ${currentSort === 'popular' ? 'selected' : ''}>📊 Most Popular</option>
                    <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>⭐ Best Rated</option>
                    <option value="discount" ${currentSort === 'discount' ? 'selected' : ''}>🎯 Biggest Discount</option>
                    <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>💰 Price: Low to High</option>
                    <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>💰 Price: High to Low</option>
                </select>
            </div>
            
            <div class="products-grid">
                ${!hasProducts ? renderEmptyProductsState() : 
                  filteredProducts.length === 0 ? renderEmptyProductsState() :
                  filteredProducts.map(p => `
                    <div class="product-card" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
                        <div class="product-img-container">
                            <div class="product-badges">
                                ${p.bestSeller ? '<span class="badge badge-best">⭐ Bestseller</span>' : ''}
                                ${p.trending ? '<span class="badge badge-trend">🔥 Trending</span>' : ''}
                                ${p.discount > 0 ? `<span class="badge badge-sale">-${p.discount}%</span>` : ''}
                            </div>
                            <img class="product-img" src="${p.image}" loading="lazy" onerror="this.src='https://placehold.co/400x400?text=TRENDLIN'">
                            <button class="quick-view" data-id="${p.id}"><i class="fas fa-eye"></i> Quick</button>
                        </div>
                        <div class="product-info">
                            <div class="product-category">${escapeHtml(getCategoryDisplayName(p.category))}</div>
                            <div class="product-title">${escapeHtml(p.name.length > 40 ? p.name.slice(0,37)+'…' : p.name)}</div>
                            <div class="rating">
                                <div class="stars">${renderStars(p.rating)}</div>
                                <span>(${p.reviews.toLocaleString()})</span>
                            </div>
                            <div class="price">
                                <span class="current-price">$${p.price.toFixed(2)}</span>
                                ${p.originalPrice > p.price ? `<span class="old-price">$${p.originalPrice.toFixed(2)}</span>` : ''}
                            </div>
                            <button class="shop-btn" data-url="${escapeHtml(p.affiliateLink)}"><i class="fas fa-bag-shopping"></i> View Deal</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${quickViewProduct ? `
                <div class="modal" id="quickModal">
                    <div class="modal-content">
                        <button class="modal-close" id="closeModal"><i class="fas fa-times"></i></button>
                        <img src="${quickViewProduct.image}" style="width:100%; border-radius:0.6rem;">
                        <h3 style="margin:0.6rem 0 0.2rem;">${escapeHtml(quickViewProduct.name)}</h3>
                        <div class="rating">
                            <div class="stars">${renderStars(quickViewProduct.rating)}</div>
                            <span>(${quickViewProduct.reviews.toLocaleString()})</span>
                        </div>
                        <div class="price">
                            <span class="current-price">$${quickViewProduct.price.toFixed(2)}</span>
                        </div>
                        <button class="shop-btn" style="margin-top:0.8rem;" data-url="${escapeHtml(quickViewProduct.affiliateLink)}">Explore →</button>
                    </div>
                </div>
            ` : ''}
        `;
        
        document.getElementById('app').innerHTML = html;
        attachEvents();
        renderTrending();
    }
    
    // ==================== EVENT HANDLERS ====================
    function attachEvents() {
        // Category filters
        document.querySelectorAll('.cat-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = btn.dataset.cat;
                applyFilters();
                render();
            });
        });
        
        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                applyFilters();
                render();
            });
        }
        
        // Product cards
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('shop-btn') && !e.target.classList.contains('quick-view')) {
                    if (card.dataset.product) {
                        quickViewProduct = JSON.parse(card.dataset.product);
                        render();
                    }
                }
            });
        });
        
        // Shop buttons
        document.querySelectorAll('.shop-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                if (url && url !== '#') {
                    window.open(url, '_blank');
                }
            });
        });
        
        // Quick view buttons
        document.querySelectorAll('.quick-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                quickViewProduct = PRODUCTS.find(p => p.id === id);
                render();
            });
        });
        
        // Clear filters button in empty state
        document.querySelectorAll('.clear-filters-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = 'all';
                applyFilters();
                render();
            });
        });
        
        // Suggestion category chips
        document.querySelectorAll('.suggestion-cat-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = btn.dataset.cat;
                applyFilters();
                render();
            });
        });
        
        // Modal close
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                quickViewProduct = null;
                render();
            });
        }
        
        const modal = document.getElementById('quickModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'quickModal') {
                    quickViewProduct = null;
                    render();
                }
            });
        }
    }
    
    // ==================== INITIALIZE ====================
    function showLoading() {
        document.getElementById('app').innerHTML = `
            <div class="loader-spinner">
                <div class="spinner"></div>
                <p style="margin-top: 1rem; color: var(--text-muted);">Loading amazing products...</p>
            </div>
        `;
    }
    
    showLoading();
    loadProducts();
})();