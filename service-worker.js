const CACHE_NAME = "medina-bazaar-v41";
const FONT_CACHE = "medina-bazaar-fonts-v3";
const CACHE_PREFIX = "medina-bazaar-";

const SCOPE_URL = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", SCOPE_URL).href;

const APP_SHELL = [
  new URL("manifest.webmanifest", SCOPE_URL).href,
  new URL("apple-touch-icon.png", SCOPE_URL).href,
  new URL("icon-192.png", SCOPE_URL).href,
  new URL("icon-512.png", SCOPE_URL).href,
  new URL("icon-maskable-512.png", SCOPE_URL).href
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        APP_SHELL.map(async (fileUrl) => {
          const response = await fetch(fileUrl, { cache: "reload" });

          if (response && response.ok) {
            await cache.put(fileUrl, response.clone());
          }
        })
      );

      try {
        const response = await fetch(INDEX_URL, { cache: "no-store" });

        if (response && response.ok) {
          await cache.put(INDEX_URL, response.clone());
        }
      } catch (error) {
        // نكمل التثبيت حتى إذا لم يتوفر الإنترنت مؤقتاً.
      }
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== CACHE_NAME &&
              key !== FONT_CACHE
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(request);

          if (response && response.ok) {
            await cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          return new Response("", {
            status: 504,
            statusText: "Offline"
          });
        }
      })()
    );

    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        const cachedIndex =
          (await cache.match(INDEX_URL)) ||
          (await cache.match(SCOPE_URL.href));

        const networkUpdate = fetch(request, { cache: "no-store" })
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              await cache.put(INDEX_URL, networkResponse.clone());
            }

            return networkResponse;
          });

        if (cachedIndex) {
          event.waitUntil(networkUpdate.catch(() => undefined));
          return cachedIndex;
        }

        try {
          return await networkUpdate;
        } catch (error) {
          return new Response(
            `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f8fafc">
  <title>سوق المدينة</title>
  <style>
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      text-align:center;
      font-family:Arial,sans-serif;
      background:#f8fafc;
      color:#111827;
      padding:24px;
      box-sizing:border-box;
    }

    div{
      width:min(100%,420px);
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:24px;
      padding:24px;
      box-sizing:border-box;
    }
  </style>
</head>
<body>
  <div>
    <h2>لا يوجد اتصال بالإنترنت</h2>
    <p>اتصل بالإنترنت ثم أعد فتح الموقع.</p>
  </div>
</body>
</html>`,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=UTF-8",
                "Cache-Control": "no-store"
              }
            }
          );
        }
      })()
    );

    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const networkResponse = await fetch(request, {
          cache: "no-store"
        });

        if (networkResponse && networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        const cached = await cache.match(request);

        if (cached) {
          return cached;
        }

        return new Response("Offline", {
          status: 503,
          statusText: "Offline"
        });
      }
    })()
  );
});
