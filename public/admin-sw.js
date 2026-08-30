// Minimal service worker for the /admin PWA install prompt (Android/Chrome
// require an active registration to consider the app installable).
//
// Deliberately no caching: this is a live-data CRM, so every request must
// go straight to the network. Do NOT add cache.put/cache.match here — a
// cached response would show stale leads/bookings/payments, which is worse
// than no offline support at all.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
