// Simple service worker: caches the app shell so it opens instantly and works
// offline. Network requests to api.github.com always go straight through so
// sync is never served from cache.

const CACHE_NAME = "gymsch-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./storage.js",
  "./data-exercises.js",
  "./data-foods.js",
  "./library.js",
  "./muscle-map.js",
  "./tracker.js",
  "./calendar.js",
  "./nutrition.js",
  "./dashboard.js",
  "./library-view.js",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache what we can; ignore individual failures so a missing icon doesn't
      // block install.
      Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept GitHub API or Google Fonts requests — always live.
  if (url.hostname === "api.github.com" ||
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com") {
    return;
  }

  // Cache-first for same-origin, with network fallback that also updates cache.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
