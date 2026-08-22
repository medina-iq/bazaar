/* LINKO MEDINA V75 - CLEAN NETWORK FIRST - 20260822
   Production Service Worker
   Compatible with the cleaned index.
   No legacy 1 MB size gate.
   No backup-index resurrection.
   No Firestore / Firebase access.
*/

const CACHE_NAME = 'medina-bazaar-v75';
const CACHE_PREFIX = 'medina-bazaar-';
const INDEX_URL = './index.html';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(
            name =>
              name.startsWith(CACHE_PREFIX) &&
              name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, {
      cache: 'no-store'
    });

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === 'navigate') {
      const fallback = await cache.match(INDEX_URL);

      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response && response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // لا نتدخل بطلبات Firebase أو أي مصدر خارجي
  if (url.origin !== self.location.origin) {
    return;
  }

  // صفحات الموقع دائماً Network First
  // حتى تظهر آخر نسخة مباشرة بعد أي تحديث
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/admin.html') ||
    url.pathname.endsWith('/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // الصور والملفات الثابتة Cache First لسرعة التحميل
  event.respondWith(cacheFirst(request));
});
