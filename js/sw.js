/* =========================================================
   CAMPUS GUIDE — sw.js
   Caches the app shell only. Bump CACHE_NAME on every deploy
   that changes any cached file, or returning visitors will
   keep seeing the old version (same bug the betting site had).
   ========================================================= */

var CACHE_NAME = "campus-guide-shell-v1";
var APP_SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "js/app.js?v=1",
  "js/data.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  // Only handle GET requests for same-origin app-shell files.
  // Everything else (future API/data calls) goes straight to network.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () { return cached; });

      // Network-first for the app shell so a fresh deploy shows up
      // on the very next load, with cache as the offline fallback.
      return networkFetch;
    })
  );
});
