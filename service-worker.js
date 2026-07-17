consconst CACHE_NAME = "medina-bazaar-v10";
const FONT_CACHE = "medina-bazaar-fonts-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== FONT_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // حفظ خطوط Cairo وMaterial Symbols بعد أول فتح بالإنترنت.
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const saved = await cache.match(event.request);
        if (saved) return saved;

        try {
          const response = await fetch(event.request);
          await cache.put(event.request, response.clone());
          return response;
        } catch (error) {
          return saved || Response.error();
        }
      })
    );
    return;
  }

  // ملفات الموقع: الإنترنت أولاً، والكاش عند الانقطاع.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          const saved = await caches.match(event.request);
          if (saved) return saved;

          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response("Offline", {
            status: 503,
            statusText: "Offline"
          });
        })
    );
  }
});
