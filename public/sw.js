/*
 * PearlSkino BD - service worker (kept deliberately small and safe)
 *
 *   - page HTML ........ network first (always the newest site), the saved copy is
 *                        only used when the phone is offline
 *   - /assets/* ........ cache first (file names change whenever the code changes)
 *   - logo / icons ..... stale-while-revalidate
 *   - everything else .. NOT touched: the shop data (Apps Script), pictures from
 *                        Google, the /admin panel and /api all go straight to the network
 *
 * To switch it off completely: replace the contents of this file with the
 * "kill switch" snippet from SETUP.md and deploy - every visitor's phone then
 * removes the worker and its caches by itself on the next visit.
 * (Do NOT just delete the file: the site's catch-all rewrite would answer with
 * index.html and browsers would keep the old worker.)
 */
const VERSION = "v4";
const SHELL = "ps-shell-" + VERSION;
const STATIC = "ps-static-" + VERSION;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== STATIC).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(SHELL).then((cache) => cache.put("/index.html", copy)).catch(() => {});
      }
      return response;
    })
    .catch(() =>
      caches.match("/index.html").then(
        (cached) =>
          cached ||
          new Response("<h1>You are offline</h1><p>Please check your connection and try again.</p>", {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
      )
    );
}

function cacheFirst(request) {
  return caches.open(STATIC).then((cache) =>
    cache.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
    )
  );
}

function staleWhileRevalidate(request) {
  return caches.open(STATIC).then((cache) =>
    cache.match(request).then((hit) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* other websites (Apps Script, Google pictures, YouTube ...) are never touched */
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  if (path.startsWith("/api/") || path.startsWith("/admin") || path === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (path.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (path === "/logo.png" || path.startsWith("/icons/") || path === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request));
  }
});
