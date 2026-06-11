// components/hamburger.js - Standalone Hamburger Menu Component
// Works with your existing header.html

(function() {
    // Wait for DOM to be ready
    function initHamburger() {
        console.log('🍔 Initializing Hamburger Component...');
        
        // Find hamburger trigger button (add data-hamburger-trigger to your button)
        const trigger = document.querySelector('[data-hamburger-trigger]');
        
        if (!trigger) {
            console.warn('No [data-hamburger-trigger] found. Add this attribute to your hamburger button.');
            return;
        }
        
        // Get target menu ID
        const targetId = trigger.getAttribute('data-hamburger-target');
        const mobileMenu = document.getElementById(targetId);
        
        if (!mobileMenu) {
            console.warn(`Mobile menu with id "${targetId}" not found.`);
            return;
        }
        
        // Create overlay
        let overlay = document.getElementById('hamburger-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hamburger-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                display: none;
                cursor: pointer;
            `;
            document.body.appendChild(overlay);
        }
        
        // Style the mobile menu
        mobileMenu.style.cssText = `
            position: fixed;
            top: 0;
            left: -100%;
            width: 280px;
            height: 100%;
            background: white;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            z-index: 9999;
            transition: left 0.3s ease;
            overflow-y: auto;
            padding: 80px 20px 20px;
        `;
        
        // Add close button
        if (!mobileMenu.querySelector('.hamburger-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'hamburger-close';
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                z-index: 10000;
            `;
            mobileMenu.insertBefore(closeBtn, mobileMenu.firstChild);
            closeBtn.onclick = closeMenu;
        }
        
        // Open menu
        function openMenu() {
            mobileMenu.style.left = '0';
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            
            // Animate hamburger to X if it has spans
            const spans = trigger.querySelectorAll('span');
            if (spans.length === 3) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            }
        }
        
        // Close menu
        function closeMenu() {
            mobileMenu.style.left = '-100%';
            overlay.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            
            // Reset hamburger
            const spans = trigger.querySelectorAll('span');
            if (spans.length === 3) {
                spans[0].style.transform = '';
                spans[1].style.opacity = '';
                spans[2].style.transform = '';
            }
        }
        
        // Toggle on trigger click
        trigger.onclick = function(e) {
            e.stopPropagation();
            if (mobileMenu.style.left === '0px') {
                closeMenu();
            } else {
                openMenu();
            }
        };
        
        // Close on overlay click
        overlay.onclick = closeMenu;
        
        // Close on ESC
        document.onkeydown = function(e) {
            if (e.key === 'Escape' && mobileMenu.style.left === '0px') {
                closeMenu();
            }
        };
        
        // Close when clicking menu links
        const menuLinks = mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
        
        // Handle resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && mobileMenu.style.left === '0px') {
                closeMenu();
            }
        });
        
        console.log('✅ Hamburger component ready!');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburger);
    } else {
        initHamburger();
    }
})();