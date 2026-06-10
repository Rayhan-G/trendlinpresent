/**
 * AFFILIATE TRENDING SHOP - Loads from /affiliate-shop/data/products.json
 */

(function() {
    'use strict';
    
    let products = [];
    let currentFilter = 'all';
    let currentSort = 'trending';
    
    const categoryIcons = {
        all: '📦',
        technology: '💻',
        lifestyle: '✨',
        health: '💪',
        home: '🏠'
    };
    
    const categoryNames = {
        all: 'All Products',
        technology: 'Technology',
        lifestyle: 'Lifestyle',
        health: 'Health & Wellness',
        home: 'Home & Office'
    };
    
    async function init() {
        const container = document.getElementById('shop-container');
        if (!container) {
            console.error('Shop container not found!');
            return;
        }
        
        // Show loading state
        container.innerHTML = `
            <div class="loading-shop">
                <div class="loading-spinner"></div>
                <p>Loading amazing products...</p>
            </div>
        `;
        
        await loadProducts();
        renderShop();
    }
    
    async function loadProducts() {
        try {
            // CORRECTED PATH - using your actual file location
            const response = await fetch('/affiliate-shop/data/products.json?t=' + Date.now());
            
            console.log('Fetching from:', '/affiliate-shop/data/products.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            products = data.products || [];
            console.log(`✅ Loaded ${products.length} products`);
            
        } catch (error) {
            console.error('Failed to load products:', error);
            products = [];
            
            // Show error in container
            const container = document.getElementById('shop-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-shop">
                        <div class="error-icon">⚠️</div>
                        <h3>Failed to load products</h3>
                        <p>Error: ${error.message}</p>
                        <button onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }
    
    function getFilteredProducts() {
        let filtered = [...products];
        
        if (currentFilter !== 'all') {
            filtered = filtered.filter(p => p.category === currentFilter);
        }
        
        if (currentSort === 'trending') {
            filtered = filtered.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
        } else if (currentSort === 'price-low') {
            filtered = filtered.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'price-high') {
            filtered = filtered.sort((a, b) => b.price - a.price);
        } else if (currentSort === 'rating') {
            filtered = filtered.sort((a, b) => b.rating - a.rating);
        } else if (currentSort === 'discount') {
            filtered = filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        }
        
        return filtered;
    }
    
    function renderShop() {
        const container = document.getElementById('shop-container');
        if (!container) return;
        
        const filteredProducts = getFilteredProducts();
        
        const productCountEl = document.getElementById('productCount');
        if (productCountEl) productCountEl.innerText = products.length;
        
        if (filteredProducts.length === 0 && products.length === 0) {
            container.innerHTML = `
                <div class="shop-main">
                    <div class="container">
                        <div class="empty-shop">
                            <div class="empty-icon">🛒</div>
                            <h3>No products found</h3>
                            <p>Check back later for amazing deals!</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        if (filteredProducts.length === 0 && products.length > 0) {
            container.innerHTML = `
                <div class="shop-main">
                    <div class="container">
                        <div class="filters-bar">
                            <div class="category-filters">
                                ${Object.entries(categoryNames).map(([key, name]) => `
                                    <button class="filter-chip ${currentFilter === key ? 'active' : ''}" data-filter="${key}">
                                        ${categoryIcons[key]} ${name}
                                    </button>
                                `).join('')}
                            </div>
                            <div class="sort-filters">
                                <select id="sort-select" class="sort-select">
                                    <option value="trending" ${currentSort === 'trending' ? 'selected' : ''}>🔥 Trending First</option>
                                    <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>💰 Price: Low to High</option>
                                    <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>💰 Price: High to Low</option>
                                    <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>⭐ Best Rated</option>
                                    <option value="discount" ${currentSort === 'discount' ? 'selected' : ''}>🎯 Biggest Discount</option>
                                </select>
                            </div>
                        </div>
                        <div class="empty-filter">
                            <div class="empty-icon">🔍</div>
                            <h3>No products in this category</h3>
                            <p>Try a different filter</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Re-attach event listeners
            document.querySelectorAll('.filter-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentFilter = btn.dataset.filter;
                    renderShop();
                });
            });
            
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    currentSort = e.target.value;
                    renderShop();
                });
            }
            return;
        }
        
        const html = `
            <div class="shop-main">
                <div class="container">
                    <div class="filters-bar">
                        <div class="category-filters">
                            ${Object.entries(categoryNames).map(([key, name]) => `
                                <button class="filter-chip ${currentFilter === key ? 'active' : ''}" data-filter="${key}">
                                    ${categoryIcons[key]} ${name}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="sort-filters">
                            <select id="sort-select" class="sort-select">
                                <option value="trending" ${currentSort === 'trending' ? 'selected' : ''}>🔥 Trending First</option>
                                <option value="price-low" ${currentSort === 'price-low' ? 'selected' : ''}>💰 Price: Low to High</option>
                                <option value="price-high" ${currentSort === 'price-high' ? 'selected' : ''}>💰 Price: High to Low</option>
                                <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>⭐ Best Rated</option>
                                <option value="discount" ${currentSort === 'discount' ? 'selected' : ''}>🎯 Biggest Discount</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="products-grid">
                        ${filteredProducts.map(product => renderProductCard(product)).join('')}
                    </div>
                    
                    <div class="affiliate-disclosure">
                        <p>🔗 As an Amazon Associate, we earn from qualifying purchases. Prices may vary.</p>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                renderShop();
            });
        });
        
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderShop();
            });
        }
        
        document.querySelectorAll('.view-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = btn.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
    }
    
    function renderProductCard(product) {
        const discountPercent = product.discount ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 0;
        
        return `
            <div class="product-card">
                ${product.bestSeller ? '<div class="product-badge bestseller">🏆 Best Seller</div>' : ''}
                ${product.trending ? '<div class="product-badge trending">🔥 Trending</div>' : ''}
                ${discountPercent > 0 ? `<div class="product-badge discount">-${discountPercent}%</div>` : ''}
                
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/600x400?text=Product+Image'">
                </div>
                
                <div class="product-info">
                    <div class="product-category">${categoryNames[product.category] || product.category}</div>
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(product.description)}</p>
                    
                    <div class="product-rating">
                        <div class="stars">
                            ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                        </div>
                        <span class="rating-count">(${product.reviews.toLocaleString()})</span>
                    </div>
                    
                    <div class="product-price">
                        <span class="current-price">$${product.price}</span>
                        ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                    </div>
                    
                    <button class="view-product-btn" data-url="${product.affiliateLink}">
                        View on Amazon →
                    </button>
                </div>
            </div>
        `;
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();