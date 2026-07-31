const CACHE_NAME = "medina-bazaar-v61";
const FONT_CACHE = "medina-bazaar-fonts-v4";
const CACHE_PREFIX = "medina-bazaar-";

const SCOPE_URL = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", SCOPE_URL).href;

const STATIC_ASSETS = [
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

      try {
        const response = await fetch(INDEX_URL, {
          cache: "no-store"
        });

        if (response && response.ok) {
          await cache.put(INDEX_URL, response.clone());
        }
      } catch (error) {
        // ضعف الإنترنت لا يوقف تثبيت النسخة الجديدة.
      }

      await Promise.allSettled(
        STATIC_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, {
              cache: "no-store"
            });

            if (response && response.ok) {
              await cache.put(assetUrl, response.clone());
            }
          } catch (error) {
            // الملف المفقود لا يوقف تثبيت التطبيق.
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              name !== CACHE_NAME &&
              name !== FONT_CACHE
          )
          .map((name) => caches.delete(name))
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (error) {
          // بعض الأجهزة لا تدعم هذه الخاصية.
        }
      }

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
    event.respondWith(handleFontRequest(request));
    return;
  }

  // لا نتدخل بطلبات Firebase أو أي طلب خارجي.
  if (url.origin !== self.location.origin) {
    return;
  }

  // ملف Service Worker يؤخذ دائماً من الإنترنت.
  if (url.pathname.endsWith("/service-worker.js")) {
    event.respondWith(
      fetch(request, {
        cache: "no-store"
      })
    );
    return;
  }

  // الصفحة الرئيسية: النسخة الجاهزة فوراً، والتحديث بالخلفية.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // بقية ملفات الموقع: الإنترنت أولاً والكاش عند الانقطاع.
  event.respondWith(handleSameOriginAsset(request));
});

async function updateIndexInBackground(request) {
  try {
    const response = await fetch(request, {
      cache: "no-store",
      redirect: "follow"
    });

    if (!response || !response.ok) {
      return;
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(INDEX_URL, response.clone());
  } catch (error) {
    // تبقى النسخة الجاهزة ظاهرة إذا كان الإنترنت ضعيفاً.
  }
}

async function handleNavigation(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedIndex = await cache.match(INDEX_URL);

  if (cachedIndex) {
    // لا ننتظر الإنترنت؛ نحدّث النسخة بالخلفية فقط.
    event.waitUntil(updateIndexInBackground(event.request));
    return cachedIndex;
  }

  // أول تشغيل فقط إذا لم تكن هناك نسخة جاهزة.
  try {
    const networkResponse = await fetch(event.request, {
      cache: "no-store",
      redirect: "follow"
    });

    if (!networkResponse || !networkResponse.ok) {
      throw new Error("Navigation failed");
    }

    await cache.put(INDEX_URL, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return createOfflinePage();
  }
}

async function handleSameOriginAsset(request) {
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
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Offline"
    });
  }
}

async function handleFontRequest(request) {
  const cache = await caches.open(FONT_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    return new Response("", {
      status: 504,
      statusText: "Offline"
    });
  }
}

function createOfflinePage() {
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
    html,
    body {
      margin: 0;
      min-height: 100%;
      background: #f8fafc;
      color: #111827;
      font-family: Arial, sans-serif;
    }

    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      box-sizing: border-box;
      text-align: center;
    }

    .offline-box {
      width: min(100%, 420px);
      padding: 24px;
      box-sizing: border-box;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
    }
  </style>
</head>

<body>
  <div class="offline-box">
    <h2>لا يوجد اتصال بالإنترنت</h2>
    <p>اتصل بالإنترنت ثم افتح التطبيق مرة ثانية.</p>
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
