// Archie Vault - Service Worker
// Handles offline caching and PWA functionality

const CACHE_NAME = 'archie-vault-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/app.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/crypto.js',
    '/js/github.js',
    '/js/storage.js',
    '/js/ui/components.js',
    '/js/ui/file-manager.js',
    '/js/ui/password-manager.js',
    '/js/ui/token-vault.js',
    '/js/ui/ideas-lab.js',
    '/js/ui/media-vault.js',
    '/js/ui/clipboard.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip GitHub API requests (always need fresh data)
    if (url.hostname === 'api.github.com') {
        return;
    }
    
    // Cache-first strategy for static assets
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((response) => {
                        if (response.ok) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    });
                })
        );
        return;
    }
    
    // Network-first strategy for external assets (CDN, fonts)
    if (request.url.includes('cdn.') || request.url.includes('unpkg.') || request.url.includes('fonts.')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    
    // Default: network first, fallback to cache
    event.respondWith(
        fetch(request)
            .catch(() => caches.match(request))
    );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
