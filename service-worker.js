const CACHE_NAME = "medina-bazaar-v38";
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

      // نخزن كل ملف بشكل مستقل حتى لا يفشل التثبيت
      // إذا كان ملف واحد مفقوداً أو تعذر تحميله مؤقتاً.
      await Promise.allSettled(
        APP_SHELL.map(async (fileUrl) => {
          try {
            const response = await fetch(fileUrl, {
              cache: "reload"
            });

            if (response && response.ok) {
              await cache.put(fileUrl, response.clone());
            }
          } catch (error) {
            // نتجاهل فشل الملف ونكمل تثبيت بقية الملفات.
          }
        })
      );

      // نخزن أحدث نسخة من الصفحة الرئيسية
      // لاستخدامها فقط عند انقطاع الإنترنت.
      try {
        const response = await fetch(INDEX_URL, {
          cache: "no-store"
        });

        if (response && response.ok) {
          await cache.put(INDEX_URL, response.clone());
        }
      } catch (error) {
        // نكمل التثبيت إذا لم يتوفر الإنترنت مؤقتاً.
      }
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      // نحذف فقط كاشات مشروع سوق المدينة القديمة.
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

  // خطوط Google: نستخدم الكاش أولاً.
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

  // لا نتدخل بطلبات Firebase أو أي موقع خارجي.
  if (url.origin !== self.location.origin) {
    return;
  }

  // صفحات الموقع:
  // الإنترنت أولاً دائماً.
  // الكاش يُستخدم فقط إذا انقطع الإنترنت.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request, {
            cache: "no-store"
          });

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);

            await cache.put(
              INDEX_URL,
              networkResponse.clone()
            );
          }

          return networkResponse;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);

          const cachedIndex =
            (await cache.match(INDEX_URL)) ||
            (await cache.match(SCOPE_URL.href));

          if (cachedIndex) {
            return cachedIndex;
          }

          return new Response(
            `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <meta name="theme-color" content="#f8fafc">
  <title>سوق المدينة</title>

  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      text-align: center;
      font-family: Arial, sans-serif;
      background: #f8fafc;
      color: #111827;
      padding: 24px;
      box-sizing: border-box;
    }

    div {
      width: min(100%, 420px);
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      padding: 24px;
      box-sizing: border-box;
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

  // ملفات الموقع المحلية:
  // الإنترنت أولاً حتى تظهر التحديثات الجديدة فوراً.
  // نرجع للكاش فقط عند انقطاع الإنترنت.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const networkResponse = await fetch(request, {
          cache: "no-store"
        });

        if (networkResponse && networkResponse.ok) {
          await cache.put(
            request,
            networkResponse.clone()
          );
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
