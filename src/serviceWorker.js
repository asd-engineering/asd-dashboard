// @ts-check
/* eslint-env serviceworker */
/**
 * Basic service worker used to cache fetched resources.
 *
 * @module serviceWorker
 */
const CACHE_NAME = 'my-cache-v3' // Make sure this matches the cache name in the main.js file
// self.addEventListener('fetch', (event) => {
//   const testUrls = [
//     "http://localhost:8000/asd/toolbox",
//     "http://localhost:8000/asd/terminal",
//     "http://localhost:8000/asd/tunnel",
//     "http://localhost:8000/asd/containers"
//   ];

//   if (testUrls.includes(event.request.url)) {
//     event.respondWith(
//       new Response('<html><body></body></html>', {
//         headers: { 'Content-Type': 'text/html' }
//       })
//     );
//   }
// });

self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installed')
  const installEvent = /** @type {any} */(event)
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[Service Worker] Caching pre-defined assets')
      return cache.addAll([
        // Pre-cache assets here
        // Example: 'styles.css', '/scripts/main.js', etc.
      ])
    })
  )
})

self.addEventListener('fetch', function (event) {
  const fetchEvent = /** @type {any} */(event)
  console.log('[Service Worker] Fetching: ', fetchEvent.request.url)
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(function (response) {
      if (response) {
        console.log('[Service Worker] Cache hit for: ', fetchEvent.request.url)
        return response
      }
      console.log('[Service Worker] Cache miss, fetching from network: ', fetchEvent.request.url)
      return fetch(fetchEvent.request).then(function (networkResponse) {
        // Cache the new asset if it's fetched from the network
        return caches.open(CACHE_NAME).then(function (cache) {
          console.log('[Service Worker] Caching new resource: ', fetchEvent.request.url)
          cache.put(fetchEvent.request, networkResponse.clone())
          return networkResponse
        })
      })
    })
  )
})

self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating and cleaning up old caches')
  const cacheWhitelist = [CACHE_NAME] // Only keep the current cache
  const activateEvent = /** @type {any} */(event)
  activateEvent.waitUntil(
    caches.keys().then(function (cacheNames) {
      cacheNames.forEach(function (cacheName) {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          console.log('[Service Worker] Deleting old cache: ', cacheName)
          return caches.delete(cacheName)
        }
      })
    })
  )
})
