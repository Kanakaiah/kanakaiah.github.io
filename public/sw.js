const CACHE_NAME = 'bible-mem-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  
  
  './verses_100.json',
  './icon.png',
  './manifest.json',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only manage same-origin requests (the app shell). Third-party API calls
  // (Bible text, cross-references, etc.) are left to the browser's normal
  // network handling — routing them through the cache dance below added a
  // failure point where the very first request after this worker activates
  // could stall indefinitely instead of reaching the network, even though
  // the API itself was healthy. Retrying always worked because by then the
  // worker had finished activating.
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // We use a Stale-While-Revalidate strategy for faster loading and offline support
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Cache the new response if it's successful
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If fetch fails (offline), just return the cached response
        return cachedResponse;
      });
      
      // Return cached immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
