/* =========================================
   SOUQ AL MADINA - SERVICE WORKER
   Network First / Fresh Version
   ========================================= */

const CACHE_VERSION = "souq-almadina-v20";

const CACHE_NAME = `${CACHE_VERSION}-app`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

/* الصفحة الرئيسية */
const INDEX_URL = "./index.html";


/* =========================================
   INSTALL
   ========================================= */

self.addEventListener("install", function (event) {

  event.waitUntil(
    (async function () {

      const cache =
        await caches.open(
          CACHE_NAME
        );

      try {

        /* نجلب أحدث index من السيرفر */
        const response =
          await fetch(
            INDEX_URL,
            {
              cache: "no-store"
            }
          );

        if (
          response &&
          response.ok
        ) {

          await cache.put(
            INDEX_URL,
            response.clone()
          );

        }

      } catch (error) {

        console.log(
          "Initial cache skipped:",
          error
        );

      }

    })()
  );

  /*
    يخلي النسخة الجديدة من
    Service Worker تنتظر أقل وقت ممكن
  */
  self.skipWaiting();

});


/* =========================================
   ACTIVATE
   ========================================= */

self.addEventListener("activate", function (event) {

  event.waitUntil(
    (async function () {

      const cacheNames =
        await caches.keys();

      /*
        حذف جميع نسخ الكاش القديمة
        الخاصة بالموقع
      */

      await Promise.all(

        cacheNames.map(
          function (name) {

            if (
              name !== CACHE_NAME &&
              name !== FONT_CACHE
            ) {

              return caches.delete(
                name
              );

            }

          }
        )

      );

      /*
        السيطرة مباشرة على الصفحات المفتوحة
      */
      await self.clients.claim();

    })()
  );

});


/* =========================================
   FETCH
   ========================================= */

self.addEventListener(
  "fetch",
  function (event) {

    const request =
      event.request;

    /*
      نتعامل فقط ويا GET
    */
    if (
      request.method !==
      "GET"
    ) {
      return;
    }


    const url =
      new URL(
        request.url
      );


    /* =====================================
       GOOGLE FONTS
       ===================================== */

    if (
      url.hostname ===
        "fonts.googleapis.com" ||

      url.hostname ===
        "fonts.gstatic.com"
    ) {

      event.respondWith(
        handleFontRequest(
          request
        )
      );

      return;

    }


    /*
      لا نتدخل بالمواقع الخارجية
    */
    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }


    /* =====================================
       SERVICE WORKER نفسه
       ===================================== */

    if (
      url.pathname.endsWith(
        "/service-worker.js"
      ) ||
      url.pathname.endsWith(
        "/sw.js"
      )
    ) {

      event.respondWith(
        fetch(
          request,
          {
            cache: "no-store"
          }
        )
      );

      return;

    }


    /* =====================================
       التنقل والصفحة الرئيسية
       ===================================== */

    if (
      request.mode ===
        "navigate"
    ) {

      event.respondWith(
        handleNavigation(
          event
        )
      );

      return;

    }


    /* =====================================
       ملفات الموقع
       CSS / JS / Images / JSON ...
       ===================================== */

    event.respondWith(
      handleSameOriginAsset(
        request
      )
    );

  }
);


/* =========================================
   NAVIGATION
   NETWORK FIRST
   ========================================= */

async function handleNavigation(
  event
) {

  const request =
    event.request;

  try {

    /*
      أهم نقطة:
      نجيب النسخة الجديدة من الإنترنت أولاً
    */

    const freshResponse =
      await fetch(
        request,
        {
          cache: "no-store"
        }
      );


    if (
      freshResponse &&
      freshResponse.ok
    ) {

      const cache =
        await caches.open(
          CACHE_NAME
        );


      /*
        نخزن أحدث نسخة
        فقط كنسخة احتياطية
      */

      event.waitUntil(

        Promise.all([

          cache.put(
            request,
            freshResponse.clone()
          ),

          cache.put(
            INDEX_URL,
            freshResponse.clone()
          )

        ]).catch(
          function () {
            return null;
          }
        )

      );


      /*
        عرض النسخة الجديدة مباشرة
      */
      return freshResponse;

    }

  } catch (error) {

    console.log(
      "Network failed, using offline copy."
    );

  }


  /* =====================================
     فقط عند فشل الإنترنت نستخدم الكاش
     ===================================== */

  const cache =
    await caches.open(
      CACHE_NAME
    );


  /*
    أولاً نحاول نفس الرابط
  */

  const cachedRequest =
    await cache.match(
      request
    );

  if (
    cachedRequest
  ) {
    return cachedRequest;
  }


  /*
    بعدها index.html
  */

  const cachedIndex =
    await cache.match(
      INDEX_URL
    );

  if (
    cachedIndex
  ) {
    return cachedIndex;
  }


  /*
    إذا لا نت ولا كاش
  */

  return new Response(
    `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      >

      <title>
        سوق المدينة الكبير
      </title>

      <style>

        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0b0b0b;
          color: #ffffff;
          font-family: Arial, sans-serif;
          text-align: center;
        }

        .offline-box {
          padding: 30px;
        }

        h2 {
          margin-bottom: 10px;
        }

        p {
          opacity: .75;
        }

        button {
          margin-top: 20px;
          border: 0;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          cursor: pointer;
        }

      </style>
    </head>

    <body>

      <div class="offline-box">

        <h2>
          لا يوجد اتصال بالإنترنت
        </h2>

        <p>
          تحقق من الاتصال وحاول مرة أخرى.
        </p>

        <button
          onclick="location.reload()"
        >
          إعادة المحاولة
        </button>

      </div>

    </body>
    </html>
    `,
    {
      status: 503,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8"
      }
    }
  );

}


/* =========================================
   SAME ORIGIN ASSETS
   NETWORK FIRST
   ========================================= */

async function handleSameOriginAsset(
  request
) {

  const cache =
    await caches.open(
      CACHE_NAME
    );


  try {

    /*
      نجلب الملف الجديد من الإنترنت أولاً
    */

    const response =
      await fetch(
        request,
        {
          cache: "no-store"
        }
      );


    if (
      response &&
      response.ok
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;

  } catch (error) {


    /*
      إذا فشل الإنترنت
      نرجع للملف المخزن
    */

    const cached =
      await cache.match(
        request
      );


    if (
      cached
    ) {
      return cached;
    }


    return new Response(
      "Offline",
      {
        status: 503,
        statusText:
          "Offline"
      }
    );

  }

}


/* =========================================
   GOOGLE FONTS
   CACHE FIRST
   ========================================= */

async function handleFontRequest(
  request
) {

  const cache =
    await caches.open(
      FONT_CACHE
    );


  const cached =
    await cache.match(
      request
    );


  if (
    cached
  ) {
    return cached;
  }


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      (
        response.ok ||
        response.type ===
          "opaque"
      )
    ) {

      await cache.put(
        request,
        response.clone()
      );

    }


    return response;

  } catch (error) {


    return new Response(
      "",
      {
        status: 504,
        statusText:
          "Offline"
      }
    );

  }

}
