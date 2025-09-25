const CACHE_NAME = 'fire-dept-organizer-cache-v610';
const urlsToCache = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './types.js',
  './components/icons.js',
  './services/dataService.js',
  './components/ChangeLogView.js',
  'https://ci.bomberosdelaciudad.gob.ar/img/favicon.ico',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@18.2.0',
  'https://esm.sh/react-dom@18.2.0/client',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache and caching app shell');
      // Use no-cache to ensure we get the latest files from the network during install.
      const requests = urlsToCache.map(url => new Request(url, { cache: 'no-cache' }));
      return cache.addAll(requests).catch(err => {
          console.error('Failed to cache some resources:', err);
      });
    })
  );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // For external resources (CDNs), try network first, then cache.
  if (event.request.url.startsWith('https://')) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then(response => {
            return response || new Response("Network error", { status: 408, headers: { 'Content-Type': 'text/plain' }});
        });
      })
    );
    return;
  }

  // For all other local requests, use cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise fetch from network, cache it, and return response
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
           return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});