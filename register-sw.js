// register-sw.js - Add this to your index.html
(function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('[Page] ✅ Service Worker registered:', registration.scope);
                
                // Check for updates every hour
                setInterval(() => {
                    registration.update();
                    console.log('[Page] 🔄 Checking for SW updates...');
                }, 60 * 60 * 1000);
                
                // Listen for controller changes
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[Page] 🔄 SW updated, reloading...');
                    window.location.reload();
                });
                
                // Check SW version
                if (registration.active) {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = (e) => {
                        console.log('[Page] SW Version:', e.data);
                    };
                    registration.active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
                }
                
            } catch (error) {
                console.error('[Page] ❌ SW registration failed:', error);
            }
        });
    } else {
        console.warn('[Page] ⚠️ Service Worker not supported');
    }
})();