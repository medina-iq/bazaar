// V71 NAV FIX REFRESH 20260808
const CACHE_NAME = "medina-bazaar-v72";
const BACKUP_CACHE = "medina-bazaar-v72-backup";
const FONT_CACHE = "medina-bazaar-fonts-v4";
const CACHE_PREFIX = "medina-bazaar-";
const BUILD_ID = "v72";
const BUILD_MARKER = "MEDINA_BUILD_V71_STARTUP_GUARD_20260804";
const MIN_INDEX_LENGTH = 1000000;

const ROOT_URL = new URL("./", self.registration.scope);
const INDEX_URL = new URL("index.html", ROOT_URL).href;
const BACKUP_INDEX_URL = new URL(
  "__backup__/index-v71.html",
  ROOT_URL
).href;

const STATIC_ASSETS = [
  new URL("manifest.webmanifest", ROOT_URL).href,
  new URL("apple-touch-icon.png", ROOT_URL).href,
  new URL("icon-192.png", ROOT_URL).href,
  new URL("icon-512.png", ROOT_URL).href,
  new URL("icon-maskable-512.png", ROOT_URL).href
];

const STARTUP_SHELL_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"
  >

  <meta
    name="theme-color"
    content="#eaf5ef"
  >

  <title>سوق المدينة الكبير</title>

  <style>
    :root {
      --ink: #101828;
      --muted: #667085;
      --line: #e5e7eb;
      --green: #0f8a55;
      --green2: #16c784;
      --gold: #f5b544;
      --shadow: 0 24px 70px rgba(16, 24, 40, .12);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    html,
    body {
      min-height: 100%;

      background:
        radial-gradient(
          circle at 12% 8%,
          rgba(245, 181, 68, .22),
          transparent 34%
        ),
        radial-gradient(
          circle at 88% 18%,
          rgba(22, 199, 132, .18),
          transparent 38%
        ),
        linear-gradient(
          145deg,
          #f8fbf9,
          #eaf5ef
        );

      color: var(--ink);

      font-family:
        Cairo,
        Arial,
        sans-serif;
    }

    body {
      min-height: 100vh;
      min-height: 100dvh;

      display: grid;
      place-items: center;

      padding: 18px;
    }

    button,
    input {
      font: inherit;
      font-size: 16px;
    }

    button {
      border: 0;
    }

    #linkoStartupLoadingNotice {
      position: fixed;

      top:
        calc(
          env(safe-area-inset-top, 0px)
          + 10px
        );

      left: 12px;
      right: 12px;

      z-index: 20;

      max-width: 560px;

      margin: auto;

      display: flex;
      align-items: center;

      gap: 11px;

      padding: 12px 14px;

      border-radius: 18px;

      background:
        rgba(17, 24, 39, .96);

      color: #ffffff;

      box-shadow:
        0 16px 42px
        rgba(15, 23, 42, .28);

      border:
        1px solid
        rgba(255, 255, 255, .18);

      pointer-events: none;
    }

    #linkoStartupLoadingNotice .spinner {
      width: 22px;
      height: 22px;

      flex: 0 0 22px;

      border:
        3px solid
        rgba(255, 255, 255, .28);

      border-top-color:
        var(--gold);

      border-radius: 50%;

      animation:
        spin .75s linear infinite;
    }

    #linkoStartupLoadingNotice b {
      display: block;

      font-size: 14px;
      line-height: 1.35;
    }

    #linkoStartupLoadingNotice small {
      display: block;

      margin-top: 2px;

      font-size: 12px;
      line-height: 1.45;

      color:
        rgba(255, 255, 255, .82);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .auth-card {
      width: min(520px, 100%);

      padding: 24px;

      border:
        1px solid
        rgba(255, 255, 255, .85);

      border-radius: 34px;

      background:
        rgba(255, 255, 255, .82);

      box-shadow:
        var(--shadow);

      text-align: center;

      -webkit-backdrop-filter:
        blur(18px);

      backdrop-filter:
        blur(18px);
    }

    .logo-row {
      display: grid;

      grid-template-columns:
        64px 142px 64px;

      align-items: center;
      justify-content: center;

      gap: 10px;

      margin:
        0 auto 16px;
    }

    .star {
      font-size: 46px;
      line-height: 1;

      color: #6d5dfc;

      text-shadow:
        0 0 14px
        rgba(37, 99, 235, .5);
    }

    .brand-logo {
      width: 142px;
      height: 142px;

      border-radius: 34px;

      overflow: hidden;

      background: #111827;

      box-shadow:
        0 24px 50px
        rgba(17, 24, 39, .2);
    }

    .brand-logo img {
      width: 100%;
      height: 100%;

      object-fit: contain;

      display: block;
    }

    h1 {
      font-size: 34px;
      font-weight: 900;
      line-height: 1.15;
    }

    .auth-tabs {
      display: grid;

      grid-template-columns:
        1fr 1fr;

      gap: 8px;

      background: #f2f4f7;

      border-radius: 20px;

      padding: 6px;

      margin:
        18px 0;
    }

    .auth-tabs button {
      min-height: 44px;

      border-radius: 16px;

      background: transparent;

      font-weight: 900;

      color: #667085;
    }

    .auth-tabs button.active {
      background: #ffffff;

      color: #111827;

      box-shadow:
        0 8px 20px
        rgba(16, 24, 40, .08);
    }

    .form {
      display: none;

      text-align: right;
    }

    .form.active {
      display: block;
    }

    .field {
      display: grid;

      gap: 8px;

      margin-bottom: 12px;
    }

    label {
      font-weight: 900;

      color: #344054;
    }

    input {
      width: 100%;
      min-height: 54px;

      border:
        1px solid
        var(--line);

      border-radius: 18px;

      background: #ffffff;

      padding:
        0 14px;

      outline: 0;

      font-weight: 800;

      color: var(--ink);
    }

    input:focus {
      border-color: #10b981;

      box-shadow:
        0 0 0 4px
        rgba(16, 185, 129, .12);
    }

    .btn {
      width: 100%;
      min-height: 52px;

      border-radius: 18px;

      padding:
        11px 16px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 8px;

      background:
        linear-gradient(
          135deg,
          var(--green),
          var(--green2)
        );

      color: #ffffff;

      font-weight: 900;

      box-shadow:
        0 14px 28px
        rgba(16, 185, 129, .2);
    }

    @media (max-width: 430px) {
      .logo-row {
        grid-template-columns:
          52px 124px 52px;
      }

      .brand-logo {
        width: 124px;
        height: 124px;
      }

      .star {
        font-size: 38px;
      }

      h1 {
        font-size: 30px;
      }
    }
  </style>
</head>

<body>
  <div
    id="linkoStartupLoadingNotice"
    role="status"
    aria-live="polite"
    aria-label="جاري تحميل الموقع"
  >
    <span
      class="spinner"
      aria-hidden="true"
    ></span>

    <span>
      <b>جاري تحميل الموقع</b>

      <small>
        الاتصال بالإنترنت قد يكون ضعيفًا،
        يرجى الانتظار لثوانٍ…
      </small>
    </span>
  </div>

  <main class="auth-card">
    <div class="logo-row">
      <span
        class="star"
        aria-hidden="true"
      >
        ✦
      </span>

      <div class="brand-logo">
        <img
          src="./apple-touch-icon.png"
          alt="شعار سوق المدينة الكبير"
        >
      </div>

      <span
        class="star"
        aria-hidden="true"
      >
        ✦
      </span>
    </div>

    <h1>
      سوق المدينة الكبير
    </h1>

    <div class="auth-tabs">
      <button
        id="loginTab"
        class="active"
        type="button"
      >
        دخول
      </button>

      <button
        id="registerTab"
        type="button"
      >
        اشتراك جديد
      </button>
    </div>

    <form
      id="loginForm"
      class="form active"
    >
      <div class="field">
        <label for="loginName">
          الاسم الكامل
        </label>

        <input
          id="loginName"
          autocomplete="name"
          placeholder="اكتب الاسم الكامل"
        >
      </div>

      <div class="field">
        <label for="loginCode">
          الرمز
        </label>

        <input
          id="loginCode"
          type="password"
          autocomplete="current-password"
          placeholder="اكتب الرمز"
        >
      </div>

      <button
        class="btn"
        type="submit"
      >
        دخول الأعضاء
      </button>
    </form>

    <form
      id="registerForm"
      class="form"
    >
      <div class="field">
        <label for="regName">
          الاسم الكامل
        </label>

        <input
          id="regName"
          placeholder="الاسم الكامل"
        >
      </div>

      <div class="field">
        <label for="regPhone">
          رقم الهاتف
        </label>

        <input
          id="regPhone"
          inputmode="tel"
          placeholder="07xxxxxxxxx"
        >
      </div>

      <div class="field">
        <label for="regAddress">
          العنوان
        </label>

        <input
          id="regAddress"
          placeholder="المنطقة / أقرب نقطة دالة"
        >
      </div>

      <div class="field">
        <label for="regCode">
          الرمز
        </label>

        <input
          id="regCode"
          type="password"
          placeholder="رمز خاص بالحساب"
        >
      </div>

      <button
        class="btn"
        type="submit"
      >
        إرسال طلب الاشتراك
      </button>
    </form>
  </main>

  <script>
    (function () {
      "use strict";

      var loginTab =
        document.getElementById(
          "loginTab"
        );

      var registerTab =
        document.getElementById(
          "registerTab"
        );

      var loginForm =
        document.getElementById(
          "loginForm"
        );

      var registerForm =
        document.getElementById(
          "registerForm"
        );

      var recovering = false;

      function show(type) {
        var login =
          type === "login";

        loginTab.classList.toggle(
          "active",
          login
        );

        registerTab.classList.toggle(
          "active",
          !login
        );

        loginForm.classList.toggle(
          "active",
          login
        );

        registerForm.classList.toggle(
          "active",
          !login
        );
      }

      loginTab.addEventListener(
        "click",
        function () {
          show("login");
        }
      );

      registerTab.addEventListener(
        "click",
        function () {
          show("register");
        }
      );

      loginForm.addEventListener(
        "submit",
        function (event) {
          event.preventDefault();
        }
      );

      registerForm.addEventListener(
        "submit",
        function (event) {
          event.preventDefault();
        }
      );

      function recover() {
        if (
          recovering ||
          navigator.onLine === false ||
          !(
            "serviceWorker"
            in navigator
          )
        ) {
          return;
        }

        recovering = true;

        navigator.serviceWorker.ready
          .then(
            function (
              registration
            ) {
              var worker =
                navigator
                  .serviceWorker
                  .controller ||
                registration.active;

              if (!worker) {
                throw new Error(
                  "No active worker"
                );
              }

              return new Promise(
                function (
                  resolve,
                  reject
                ) {
                  var channel =
                    new MessageChannel();

                  var timer =
                    setTimeout(
                      function () {
                        reject(
                          new Error(
                            "Recovery timeout"
                          )
                        );
                      },
                      12000
                    );

                  channel.port1
                    .onmessage =
                    function (
                      event
                    ) {
                      clearTimeout(
                        timer
                      );

                      resolve(
                        event.data ||
                        {}
                      );
                    };

                  worker.postMessage(
                    {
                      type:
                        "MEDINA_V71_RECOVER_INDEX"
                    },
                    [
                      channel.port2
                    ]
                  );
                }
              );
            }
          )
          .then(
            function (
              result
            ) {
              if (
                !result ||
                !result.ok
              ) {
                throw new Error(
                  "Recovery failed"
                );
              }

              location.reload();
            }
          )
          .catch(
            function () {
              recovering = false;
            }
          );
      }

      window.addEventListener(
        "online",
        recover
      );

      setTimeout(
        recover,
        0
      );

      setTimeout(
        recover,
        5000
      );
    })();
  </script>
</body>
</html>`;

let recoveryPromise = null;

function shellResponse() {
  return new Response(
    STARTUP_SHELL_HTML,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/html; charset=UTF-8",

        "Cache-Control":
          "no-store",

        "X-Medina-Startup-Shell":
          BUILD_ID
      }
    }
  );
}

function isTrusted(
  response
) {
  return Boolean(
    response &&
    response.ok &&

    response.headers.get(
      "X-Medina-Validated"
    ) === "1" &&

    response.headers.get(
      "X-Medina-Build"
    ) === BUILD_ID
  );
}

async function fetchValidatedIndex() {
  const url =
    new URL(
      INDEX_URL
    );

  url.searchParams.set(
    "build",
    BUILD_ID
  );

  url.searchParams.set(
    "time",
    String(Date.now())
  );

  const response =
    await fetch(
      url.href,
      {
        cache: "no-store",
        redirect: "follow"
      }
    );

  if (
    !response ||
    !response.ok
  ) {
    throw new Error(
      "Index download failed"
    );
  }

  const text =
    await response.text();

  if (
    text.length <
      MIN_INDEX_LENGTH ||

    !text.includes(
      BUILD_MARKER
    ) ||

    !text.includes(
      'id="authPage"'
    ) ||

    !text.includes(
      'id="linkoStartupLoadingNotice"'
    )
  ) {
    throw new Error(
      "Invalid or incomplete index"
    );
  }

  const headers =
    new Headers(
      response.headers
    );

  headers.delete(
    "Content-Encoding"
  );

  headers.delete(
    "Content-Length"
  );

  headers.delete(
    "Transfer-Encoding"
  );

  headers.set(
    "Content-Type",
    "text/html; charset=UTF-8"
  );

  headers.set(
    "Cache-Control",
    "no-store"
  );

  headers.set(
    "X-Medina-Validated",
    "1"
  );

  headers.set(
    "X-Medina-Build",
    BUILD_ID
  );

  return new Response(
    text,
    {
      status: 200,
      headers
    }
  );
}

async function storeValidatedIndex(
  response
) {
  if (
    !isTrusted(
      response
    )
  ) {
    throw new Error(
      "Refusing unvalidated index"
    );
  }

  const primaryCache =
    await caches.open(
      CACHE_NAME
    );

  const backupCache =
    await caches.open(
      BACKUP_CACHE
    );

  await Promise.all([
    primaryCache.put(
      INDEX_URL,
      response.clone()
    ),

    backupCache.put(
      BACKUP_INDEX_URL,
      response.clone()
    )
  ]);
}

async function recoverIndex() {
  if (recoveryPromise) {
    return recoveryPromise;
  }

  recoveryPromise =
    (
      async function () {
        const response =
          await fetchValidatedIndex();

        await storeValidatedIndex(
          response.clone()
        );

        return response;
      }
    )().finally(
      function () {
        recoveryPromise = null;
      }
    );

  return recoveryPromise;
}

async function getPrimaryIndex() {
  const cache =
    await caches.open(
      CACHE_NAME
    );

  const response =
    await cache.match(
      INDEX_URL
    );

  return isTrusted(
    response
  )
    ? response
    : null;
}

async function getBackupIndex() {
  const cache =
    await caches.open(
      BACKUP_CACHE
    );

  const response =
    await cache.match(
      BACKUP_INDEX_URL
    );

  return isTrusted(
    response
  )
    ? response
    : null;
}

async function restorePrimaryFromBackup(
  response
) {
  if (
    !isTrusted(
      response
    )
  ) {
    return;
  }

  const cache =
    await caches.open(
      CACHE_NAME
    );

  await cache.put(
    INDEX_URL,
    response.clone()
  );
}

self.addEventListener(
  "install",
  function (event) {
    event.waitUntil(
      (
        async function () {
          const response =
            await fetchValidatedIndex();

          await storeValidatedIndex(
            response.clone()
          );

          const cache =
            await caches.open(
              CACHE_NAME
            );

          await Promise.allSettled(
            STATIC_ASSETS.map(
              async function (
                assetUrl
              ) {
                try {
                  const assetResponse =
                    await fetch(
                      assetUrl,
                      {
                        cache:
                          "no-store"
                      }
                    );

                  if (
                    assetResponse &&
                    assetResponse.ok
                  ) {
                    await cache.put(
                      assetUrl,
                      assetResponse.clone()
                    );
                  }
                } catch (error) {}
              }
            )
          );

          await self.skipWaiting();
        }
      )()
    );
  }
);

self.addEventListener(
  "activate",
  function (event) {
    event.waitUntil(
      (
        async function () {
          const names =
            await caches.keys();

          await Promise.all(
            names
              .filter(
                function (
                  name
                ) {
                  return (
                    name.startsWith(
                      CACHE_PREFIX
                    ) &&

                    name !==
                      CACHE_NAME &&

                    name !==
                      BACKUP_CACHE &&

                    name !==
                      FONT_CACHE
                  );
                }
              )
              .map(
                function (
                  name
                ) {
                  return caches.delete(
                    name
                  );
                }
              )
          );

          if (
            self.registration
              .navigationPreload
          ) {
            try {
              await self.registration
                .navigationPreload
                .disable();
            } catch (error) {}
          }

          await self.clients.claim();
        }
      )()
    );
  }
);

self.addEventListener(
  "message",
  function (event) {
    const data =
      event.data || {};

    if (
      data ===
        "SKIP_WAITING" ||

      data.type ===
        "SKIP_WAITING"
    ) {
      self.skipWaiting();

      return;
    }

    if (
      data.type ===
        "MEDINA_V71_RECOVER_INDEX"
    ) {
      const task =
        recoverIndex()
          .then(
            function () {
              if (
                event.ports &&
                event.ports[0]
              ) {
                event.ports[0]
                  .postMessage({
                    ok: true
                  });
              }
            }
          )
          .catch(
            function () {
              if (
                event.ports &&
                event.ports[0]
              ) {
                event.ports[0]
                  .postMessage({
                    ok: false
                  });
              }
            }
          );

      event.waitUntil(
        task
      );
    }
  }
);

self.addEventListener(
  "fetch",
  function (event) {
    const request =
      event.request;

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

    if (
      url.origin !==
        self.location.origin
    ) {
      return;
    }

    if (
      url.pathname.endsWith(
        "/service-worker.js"
      )
    ) {
      event.respondWith(
        fetch(
          request,
          {
            cache:
              "no-store"
          }
        )
      );

      return;
    }

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

    event.respondWith(
      handleSameOriginAsset(
        request
      )
    );
  }
);

async function handleNavigation(
  event
) {
  const primary =
    await getPrimaryIndex();

  if (primary) {
    return primary;
  }

  const backup =
    await getBackupIndex();

  if (backup) {
    event.waitUntil(
      restorePrimaryFromBackup(
        backup.clone()
      )
    );

    return backup;
  }

  event.waitUntil(
    recoverIndex()
      .catch(
        function () {
          return null;
        }
      )
  );

  return shellResponse();
}

async function handleSameOriginAsset(
  request
) {
  const cache =
    await caches.open(
      CACHE_NAME
    );

  try {
    const response =
      await fetch(
        request,
        {
          cache:
            "no-store"
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
    const cached =
      await cache.match(
        request
      );

    if (cached) {
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

  if (cached) {
    return cached;
  }

  try {
    const response =
      await fetch(
        request
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
