const CACHE_NAME = 'pulse-shell-v2';
const APP_SHELL = ['./', './index.html', './style.css', './script.js', './manifest.json', './logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('api.github.com')) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (event.request.method === 'GET' && response.ok) {
      const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});
