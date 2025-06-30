// @ts-check
/* eslint-env serviceworker */
/**
 * Basic service worker used to cache fetched resources.
 *
 * @module serviceWorker
 */
/**
 * @typedef {Event & {waitUntil: (p: Promise<any>) => void}} SWExtendableEvent
 */
/**
 * @typedef {SWExtendableEvent & {request: Request, respondWith: (r: Promise<Response>|Response) => void}} SWFetchEvent
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

self.addEventListener('install', function (/** @type {SWExtendableEvent} */ event) {
  console.log('[Service Worker] Installed')
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log('[Service Worker] Caching pre-defined assets')
      return cache.addAll([
        // Pre-cache assets here
        // Example: 'styles.css', '/scripts/main.js', etc.
      ])
    })
  )
})

self.addEventListener('fetch', function (/** @type {SWFetchEvent} */ event) {
  console.log('[Service Worker] Fetching: ', event.request.url)
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        console.log('[Service Worker] Cache hit for: ', event.request.url)
        return response
      }
      console.log('[Service Worker] Cache miss, fetching from network: ', event.request.url)
      return fetch(event.request).then(function (networkResponse) {
        // Cache the new asset if it's fetched from the network
        return caches.open(CACHE_NAME).then(function (cache) {
          console.log('[Service Worker] Caching new resource: ', event.request.url)
          cache.put(event.request, networkResponse.clone())
          return networkResponse
        })
      })
    })
  )
})

self.addEventListener('activate', function (/** @type {SWExtendableEvent} */ event) {
  console.log('[Service Worker] Activating and cleaning up old caches')
  const cacheWhitelist = [CACHE_NAME] // Only keep the current cache
  event.waitUntil(
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
