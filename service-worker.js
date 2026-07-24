const CACHE_NAME = "medina-bazaar-v45";
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

/* تثبيت النسخة الجديدة */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /*
        نخزن الأيقونات والـ manifest فقط.
        ممنوع تخزين index.html هنا.
      */
      await Promise.allSettled(
        STATIC_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, {
              cache: "reload"
            });

            if (response && response.ok) {
              await cache.put(assetUrl, response.clone());
            }
          } catch (error) {
            // عدم وجود أحد ملفات الأيقونات لا يوقف تثبيت التطبيق.
          }
        })
      );
    })()
  );

  self.skipWaiting();
});

/* تفعيل النسخة ومسح جميع كاشات سوق المدينة القديمة */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter(
            (cacheKey) =>
              cacheKey.startsWith(CACHE_PREFIX) &&
              cacheKey !== CACHE_NAME &&
              cacheKey !== FONT_CACHE
          )
          .map((cacheKey) => caches.delete(cacheKey))
      );

      /*
        نوقف Navigation Preload نهائياً.
        هذا يمنع Safari والتطبيق من إعادة index.html قديم.
      */
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch (error) {
          // بعض الأجهزة لا تدعم Navigation Preload.
        }
      }

      /*
        نتأكد أن الكاش الجديد لا يحتوي index.html قديماً.
      */
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(INDEX_URL);

      await self.clients.claim();
    })()
  );
});

/* تفعيل النسخة الجديدة مباشرة */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* استقبال طلبات الموقع */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /* خطوط Google فقط تستخدم كاش مستقل */
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  /* لا نتدخل بطلبات Firebase أو أي موقع خارجي */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    الصفحة الرئيسية:
    طلب شبكة صريح بدون Navigation Preload وبدون كاش Safari.
  */
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  /* لا نخزن ملف Service Worker داخل نفسه */
  if (url.pathname.endsWith("/service-worker.js")) {
    event.respondWith(
      fetch(request, {
        cache: "no-store"
      })
    );
    return;
  }

  /* بقية ملفات الموقع: الإنترنت أولاً */
  event.respondWith(handleSameOriginAsset(request));
});

/* فتح الصفحة الرئيسية */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    /*
      cache: reload يجبر Safari والتطبيق على مراجعة الخادم،
      ولا يسمح لهما بإعادة HTML قديم من كاش المتصفح.
    */
    const networkResponse = await fetch(request, {
      cache: "reload",
      redirect: "follow"
    });

    if (!networkResponse || !networkResponse.ok) {
      throw new Error("Navigation network response failed");
    }

    /*
      نحفظ آخر نسخة ناجحة للاستخدام فقط عند انقطاع الإنترنت.
    */
    await cache.put(INDEX_URL, networkResponse.clone());

    return networkResponse;
  } catch (error) {
    const cachedIndex = await cache.match(INDEX_URL);

    if (cachedIndex) {
      return cachedIndex;
    }

    return createOfflinePage();
  }
}

/* تحميل ملفات الموقع */
async function handleSameOriginAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request, {
      cache: "reload"
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

/* تحميل خطوط Google */
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

/* صفحة تظهر فقط إذا كان أول تشغيل بدون إنترنت */
function createOfflinePage() {
  return new Response(
    `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f8fafc">
  <title>سوق المدينة</title>

  <style>
    html,
    body {
      margin: 0;
      width: 100%;
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
