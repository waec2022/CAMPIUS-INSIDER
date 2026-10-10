/* =========================================================
   CAMPUS GUIDE — sw.js
   Caches the app shell only. Bump CACHE_NAME on every deploy
   that changes any cached file.
   ========================================================= */

var CACHE_NAME = "campus-guide-shell-v2";
var APP_SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "css/responsive.css",
  "css/home.css",
  "js/data.js",
  "js/app.js?v=2",
  "js/home.js"
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
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
