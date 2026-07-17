const CACHE_NAME = "medina-bazaar-v17";
const FONT_CACHE = "medina-bazaar-fonts-v2";

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

  // خطوط Google: الكاش أولاً.
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(event.request);

          if (response && response.ok) {
            await cache.put(event.request, response.clone());
          }

          return response;
        } catch (error) {
          return Response.error();
        }
      })
    );

    return;
  }

  // لا نتدخل بطلبات Firebase أو المواقع الخارجية.
  if (url.origin !== self.location.origin) {
    return;
  }

  // صفحة الموقع: نفتح النسخة المحفوظة فوراً
  // ونحدّثها من الإنترنت بالخلفية.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached =
          (await cache.match("./index.html")) ||
          (await cache.match(event.request));

        const update = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              cache.put("./index.html", response.clone());
              cache.put(event.request, response.clone());
            }

            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(update);
          return cached;
        }

        const networkResponse = await update;

        if (networkResponse) {
          return networkResponse;
        }

        return new Response("Offline", {
          status: 503,
          statusText: "Offline"
        });
      })
    );

    return;
  }

  // بقية ملفات الموقع: الكاش أولاً.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);

        if (response && response.ok) {
          await cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        return new Response("Offline", {
          status: 503,
          statusText: "Offline"
        });
      }
    })
  );
});
