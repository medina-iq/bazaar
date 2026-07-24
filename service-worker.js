const CACHE_NAME = "medina-bazaar-v30";
const FONT_CACHE = "medina-bazaar-fonts-v3";

const APP_SHELL = [
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);

      // نحفظ أحدث index للاستخدام بدون إنترنت فقط.
      try {
        const response = await fetch("./index.html", {
          cache: "reload"
        });

        if (response && response.ok) {
          await cache.put("./index.html", response.clone());
        }
      } catch (error) {
        // إذا تعذر الإنترنت أثناء التثبيت، نكمل بدون تعطيل التثبيت.
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) => key !== CACHE_NAME && key !== FONT_CACHE
          )
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  // صفحات الموقع: الإنترنت أولاً دائماً.
  // نستخدم الكاش فقط إذا انقطع الإنترنت.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request, {
            cache: "no-store"
          });

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);

            await cache.put(
              "./index.html",
              networkResponse.clone()
            );
          }

          return networkResponse;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);

          const cachedIndex =
            (await cache.match("./index.html")) ||
            (await cache.match("./"));

          if (cachedIndex) {
            return cachedIndex;
          }

          return new Response(
            `
              <!doctype html>
              <html lang="ar" dir="rtl">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport"
                        content="width=device-width,initial-scale=1">
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
                    }
                    div{
                      max-width:420px;
                      background:#fff;
                      border:1px solid #ddd;
                      border-radius:24px;
                      padding:24px;
                    }
                  </style>
                </head>
                <body>
                  <div>
                    <h2>لا يوجد اتصال بالإنترنت</h2>
                    <p>اتصل بالإنترنت ثم أعد فتح الموقع.</p>
                  </div>
                </body>
              </html>
            `,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=UTF-8"
              }
            }
          );
        }
      })()
    );

    return;
  }

  // ملفات الموقع الأخرى:
  // نعرض المحفوظ بسرعة، ونحدثه من الإنترنت بالخلفية.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      const networkUpdate = fetch(event.request)
        .then(async (response) => {
          if (response && response.ok) {
            await cache.put(
              event.request,
              response.clone()
            );
          }

          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkUpdate);
        return cached;
      }

      const networkResponse = await networkUpdate;

      if (networkResponse) {
        return networkResponse;
      }

      return new Response("Offline", {
        status: 503,
        statusText: "Offline"
      });
    })
  );
});
