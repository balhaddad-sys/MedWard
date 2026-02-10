// Cache name includes a timestamp that changes on each deployment.
// The build pipeline or deploy script should update this value.
// Alternatively, use 'vite-plugin-pwa' for automatic precache manifests.
const CACHE_VERSION = '20260210';
const CACHE_NAME = `medward-pro-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
];

// Install: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback for navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase and external API calls
  if (
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('firebase') ||
    request.url.includes('googleapis.com/identitytoolkit') ||
    request.url.includes('securetoken.googleapis.com') ||
    request.url.includes('anthropic')
  ) {
    return;
  }

  // Navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  if (
    request.url.includes('/assets/') ||
    request.url.endsWith('.svg') ||
    request.url.endsWith('.woff2') ||
    request.url.endsWith('.css') ||
    request.url.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});
