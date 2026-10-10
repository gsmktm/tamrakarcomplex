// Tamrakar Complex — lightweight service worker for installability + offline shell.
//
// Strategy:
//  · Navigations   → network-first, fall back to cached app shell (fresh HTML
//                    always wins, so auth/redirects/settings stay correct).
//  · Static assets → cache-first with background refresh. Vite emits
//                    content-hashed filenames, so cached copies are immutable
//                    and safe to serve instantly.
//  · Cross-origin  → never intercepted (Supabase buckets, CDNs, fonts).
//  · Only `GET` requests pass through; admin sessions and POST flows are
//    never cached.

const CACHE_NAME = "tamrakar-static-v1";
const SHELL_URL = "/index.html";
const CACHEABLE_DESTINATIONS = new Set([
  "script",
  "style",
  "image",
  "font",
  "manifest",
  "worker",
]);

self.addEventListener("install", () => {
  // Take over immediately so the new SW applies on first load, even if an
  // older version had (incorrectly) claimed clients.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: always try the network for fresh HTML, fall back to shell
  // only when the user is offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL_URL)),
    );
    return;
  }

  // Static assets: cache-first, refresh in the background.
  if (CACHEABLE_DESTINATIONS.has(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || network;
      }),
    );
  }
});