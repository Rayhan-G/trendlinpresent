// components/hamburger.js - Premium Hamburger Menu Component
// Fully accessible, touch-optimized, with smooth animations

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        menuWidth: 'min(320px, 85%)',
        transitionDuration: 300,
        closeOnLinkClick: true,
        closeOnResize: true,
        resizeBreakpoint: 768,
        overlayOpacity: 0.5
    };

    // DOM Elements
    let trigger = null;
    let mobileMenu = null;
    let overlay = null;
    let isOpen = false;

    // Initialize component
    function initHamburger() {
        console.log('🍔 Initializing Premium Hamburger Component...');

        // Find hamburger trigger button
        trigger = document.querySelector('[data-hamburger-trigger]');
        
        if (!trigger) {
            console.warn('❌ No [data-hamburger-trigger] found. Add this attribute to your hamburger button.');
            return;
        }

        // Get target menu ID
        const targetId = trigger.getAttribute('data-hamburger-target');
        if (!targetId) {
            console.warn('❌ data-hamburger-target attribute missing on trigger button.');
            return;
        }

        mobileMenu = document.getElementById(targetId);
        if (!mobileMenu) {
            console.warn(`❌ Mobile menu with id "${targetId}" not found.`);
            return;
        }

        // Setup overlay
        setupOverlay();
        
        // Style and enhance mobile menu
        enhanceMobileMenu();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup accessibility
        setupAccessibility();
        
        console.log('✅ Hamburger component ready!');
    }

    // Create and setup overlay
    function setupOverlay() {
        overlay = document.getElementById('hamburger-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hamburger-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                backdrop-filter: blur(0px);
                z-index: 9998;
                display: none;
                cursor: pointer;
                transition: background 0.3s ease, backdrop-filter 0.3s ease;
            `;
            document.body.appendChild(overlay);
        }
    }

    // Enhance mobile menu styling
    function enhanceMobileMenu() {
        // Store original classes
        const originalClasses = mobileMenu.className;
        
        // Apply premium styles
        mobileMenu.style.cssText = `
            position: fixed;
            top: 0;
            left: -${CONFIG.menuWidth};
            width: ${CONFIG.menuWidth};
            height: 100%;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            box-shadow: 8px 0 32px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            transition: left ${CONFIG.transitionDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1);
            overflow-y: auto;
            padding: 80px 24px 32px;
        `;
        
        // Restore classes
        mobileMenu.className = originalClasses;
        
        // Add close button if not exists
        if (!mobileMenu.querySelector('.hamburger-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'hamburger-close';
            closeBtn.innerHTML = '✕';
            closeBtn.setAttribute('aria-label', 'Close menu');
            closeBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 44px;
                height: 44px;
                background: rgba(0, 0, 0, 0.05);
                border: none;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                color: #1a1a1a;
                z-index: 10000;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
                closeBtn.style.transform = 'rotate(90deg)';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.background = 'rgba(0, 0, 0, 0.05)';
                closeBtn.style.transform = 'rotate(0deg)';
            });
            
            mobileMenu.insertBefore(closeBtn, mobileMenu.firstChild);
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeMenu();
            };
        }
    }

    // Open menu with animation
    function openMenu() {
        if (isOpen) return;
        
        isOpen = true;
        mobileMenu.style.left = '0';
        overlay.style.display = 'block';
        
        // Animate overlay
        setTimeout(() => {
            overlay.style.background = 'rgba(0, 0, 0, 0.5)';
            overlay.style.backdropFilter = 'blur(4px)';
        }, 10);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${window.scrollY}px`;
        
        // Animate hamburger to X
        animateHamburger(true);
        
        // Update ARIA
        trigger.setAttribute('aria-expanded', 'true');
        
        // Trigger custom event
        document.dispatchEvent(new CustomEvent('hamburger:open'));
    }

    // Close menu with animation
    function closeMenu() {
        if (!isOpen) return;
        
        isOpen = false;
        mobileMenu.style.left = `-${CONFIG.menuWidth}`;
        overlay.style.background = 'rgba(0, 0, 0, 0)';
        overlay.style.backdropFilter = 'blur(0px)';
        
        setTimeout(() => {
            overlay.style.display = 'none';
        }, CONFIG.transitionDuration);
        
        // Restore body scroll
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        
        // Reset hamburger
        animateHamburger(false);
        
        // Update ARIA
        trigger.setAttribute('aria-expanded', 'false');
        
        // Trigger custom event
        document.dispatchEvent(new CustomEvent('hamburger:close'));
    }

    // Animate hamburger icon (3 lines to X)
    function animateHamburger(toX) {
        const spans = trigger.querySelectorAll('span');
        if (spans.length !== 3) return;
        
        if (toX) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    }

    // Toggle menu
    function toggleMenu(e) {
        e.stopPropagation();
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Toggle on trigger click
        trigger.addEventListener('click', toggleMenu);
        
        // Close on overlay click
        overlay.addEventListener('click', closeMenu);
        
        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeMenu();
            }
        });
        
        // Close when clicking menu links (optional)
        if (CONFIG.closeOnLinkClick) {
            const menuLinks = mobileMenu.querySelectorAll('a');
            menuLinks.forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        }
        
        // Handle window resize
        if (CONFIG.closeOnResize) {
            window.addEventListener('resize', () => {
                if (window.innerWidth > CONFIG.resizeBreakpoint && isOpen) {
                    closeMenu();
                }
            });
        }
    }

    // Setup accessibility attributes
    function setupAccessibility() {
        // Add ARIA attributes to trigger
        if (!trigger.hasAttribute('aria-label')) {
            trigger.setAttribute('aria-label', 'Menu');
        }
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-haspopup', 'true');
        
        // Add ARIA to mobile menu
        mobileMenu.setAttribute('aria-label', 'Mobile navigation menu');
        mobileMenu.setAttribute('role', 'dialog');
        
        // Trap focus when menu is open
        document.addEventListener('hamburger:open', () => {
            const focusableElements = mobileMenu.querySelectorAll(
                'a, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];
            
            mobileMenu.addEventListener('keydown', function trapFocus(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            });
        });
        
        // Remove focus trap on close
        document.addEventListener('hamburger:close', () => {
            mobileMenu.removeEventListener('keydown', () => {});
        });
    }

    // Public API
    const HamburgerAPI = {
        open: openMenu,
        close: closeMenu,
        toggle: toggleMenu,
        isOpen: () => isOpen
    };

    // Expose globally
    window.TrendlinHamburger = HamburgerAPI;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburger);
    } else {
        initHamburger();
    }
})();