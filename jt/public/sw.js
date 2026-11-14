// JATAYU Emergency Response — Service Worker
// Network-first for API, Cache-first for static assets, offline fallback
const CACHE_NAME = 'jatayu-v1';
const STATIC_CACHE = 'jatayu-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// API routes — always network-first
const API_PATHS = ['/api/'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently ignore missing static assets during install
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  const isAPI = API_PATHS.some((p) => url.pathname.startsWith(p));

  if (isAPI) {
    // Network-first for all API calls
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for static assets, fallback to network then index.html
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
              return res;
            })
            .catch(() => caches.match('/index.html'))
      )
    );
  }
});

// ─── Push Notifications (future) ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'JATAYU Alert', {
      body: data.body || 'Emergency notification received.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: 'jatayu-alert',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
