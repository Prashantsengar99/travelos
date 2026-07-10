// ============================================================
// TRAVELOS SERVICE WORKER
// ============================================================

const CACHE_NAME = 'travelos-v1';
const STATIC_CACHE = 'travelos-static-v1';
const DYNAMIC_CACHE = 'travelos-dynamic-v1';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/api.js',
  '/js/state.js',
  '/js/render.js',
  '/js/helpers.js',
  '/js/chat.js',
  '/js/split-calculator.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('🔧 Service Worker: Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Static assets cached!');
                return self.skipWaiting();
            })
            .catch(err => console.error('❌ Cache error:', err))
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('🔧 Service Worker: Activating...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                const oldKeys = keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE);
                return Promise.all(
                    oldKeys.map(key => {
                        console.log('🗑️ Deleting old cache:', key);
                        return caches.delete(key);
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated!');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache then network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip cross-origin requests
    if (url.origin !== self.location.origin && !STATIC_ASSETS.includes(event.request.url)) {
        return event.respondWith(fetch(event.request));
    }

    // API calls - network first
    if (url.pathname.includes('/api/')) {
        return event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline fallback for API
                    return new Response(JSON.stringify({
                        error: 'Offline',
                        message: 'Please check your internet connection'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
    }

    // Static assets - cache first
    if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        return event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log('📦 Serving from cache:', event.request.url);
                        return response;
                    }
                    return fetch(event.request)
                        .then(response => {
                            const clone = response.clone();
                            caches.open(STATIC_CACHE)
                                .then(cache => cache.put(event.request, clone));
                            return response;
                        });
                })
        );
    }

    // Default - network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache dynamically fetched resources
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then(response => {
                        if (response) return response;
                        // Offline fallback page
                        return caches.match('/');
                    });
            })
    );
});

// Handle push notifications
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body || 'TravelOS notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'TravelOS', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                const url = event.notification.data.url || '/';
                for (const client of clientList) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

console.log('✅ Service Worker Loaded Successfully!');