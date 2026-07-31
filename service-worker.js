const CACHE_NAME = "medina-bazaar-v57";
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

/*
  حالة تحديث الصفحة الرئيسية.
  تُستخدم فقط لإظهار رسالة ضعف الإنترنت داخل index.html.
*/
let navigationNetworkState = "idle";

async function broadcastNetworkState(state) {
  navigationNetworkState = state;

  try {
    const clientList = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    clientList.forEach((client) => {
      client.postMessage({
        type: "LINKO_NETWORK_STATE",
        state
      });
    });
  } catch (error) {
    // فشل إرسال الحالة لا يؤثر في فتح الموقع أو تحديث الكاش.
  }
}

/*
  تثبيت النسخة الجديدة:
  نخزن index.html حتى يكون جاهزاً للفتح المباشر،
  ونخزن الأيقونات بدون أن يفشل التثبيت إذا كان ملف مفقوداً.
*/
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const indexResponse = await fetch(INDEX_URL, {
          cache: "reload"
        });

        if (indexResponse && indexResponse.ok) {
          await cache.put(INDEX_URL, indexResponse.clone());
        }
      } catch (error) {
        // فشل الإنترنت وقت التثبيت لا يوقف التثبيت.
      }

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
            // الملف المفقود لا يوقف تثبيت التطبيق.
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

/*
  تفعيل النسخة الجديدة ومسح كاشات سوق المدينة القديمة فقط.
*/
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

/*
  تفعيل النسخة الجديدة مباشرة، وإرجاع حالة التحميل للصفحة.
*/
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === "LINKO_GET_NETWORK_STATE") {
    const reply = {
      type: "LINKO_NETWORK_STATE",
      state: navigationNetworkState
    };

    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(reply);
      return;
    }

    if (event.source && typeof event.source.postMessage === "function") {
      event.source.postMessage(reply);
    }
  }
});

/*
  استقبال طلبات الموقع.
*/
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
    خطوط Google فقط تستخدم كاشاً منفصلاً.
  */
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  /*
    لا نتدخل نهائياً بطلبات Firebase أو أي طلب خارجي.
  */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
    لا نخزن Service Worker داخل نفسه.
  */
  if (url.pathname.endsWith("/service-worker.js")) {
    event.respondWith(
      fetch(request, {
        cache: "no-store"
      })
    );
    return;
  }

  /*
    فتح الصفحة:
    نعرض النسخة الجاهزة فوراً،
    ونطلب أحدث نسخة من الموقع بالخلفية.
  */
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  /*
    بقية ملفات الموقع:
    الإنترنت أولاً، والكاش عند انقطاع الإنترنت.
  */
  event.respondWith(handleSameOriginAsset(request));
});

/*
  فتح index.html مباشرة من النسخة الجاهزة،
  مع تحديثها من الإنترنت بالخلفية.
*/
function handleNavigation(event) {
  navigationNetworkState = "loading";
  broadcastNetworkState("loading");

  const networkPromise = fetch(event.request, {
    cache: "no-store",
    redirect: "follow"
  }).then((response) => {
    return {
      response,
      cacheCopy:
        response && response.ok
          ? response.clone()
          : null
    };
  });

  /*
    تحديث النسخة المحفوظة بالخلفية.
    هذا لا يؤخر ظهور الصفحة للمستخدم.
  */
  const updatePromise = networkPromise
    .then(async ({ cacheCopy }) => {
      if (!cacheCopy) {
        await broadcastNetworkState("failed");
        return;
      }

      const cache = await caches.open(CACHE_NAME);
      await cache.put(INDEX_URL, cacheCopy);
      await broadcastNetworkState("ready");
    })
    .catch(async () => {
      await broadcastNetworkState("failed");
    });

  event.waitUntil(updatePromise);

  return (async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedIndex = await cache.match(INDEX_URL);

    /*
      إذا كانت النسخة الجاهزة موجودة،
      نعرضها مباشرة بدون انتظار الإنترنت.
    */
    if (cachedIndex) {
      return cachedIndex;
    }

    /*
      إذا لم توجد نسخة محفوظة، نستخدم الإنترنت.
    */
    try {
      const { response } = await networkPromise;

      if (!response || !response.ok) {
        throw new Error("Navigation request failed");
      }

      return response;
    } catch (error) {
      return createOfflinePage();
    }
  })();
}

/*
  تحميل بقية ملفات الموقع.
*/
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

/*
  تحميل خطوط Google.
*/
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

/*
  تظهر فقط إذا لم توجد نسخة محفوظة
  وكان الجهاز بدون إنترنت.
*/
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
