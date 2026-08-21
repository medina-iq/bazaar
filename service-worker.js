/* TEMPORARY MAINTENANCE SERVICE WORKER
   Clears old caches and unregisters itself.
   No Firebase / No Firestore.
*/

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      try {
        // حذف جميع الكاشات القديمة للموقع
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );

        // السيطرة فوراً على الصفحات المفتوحة
        await self.clients.claim();

        // إلغاء تسجيل الـ Service Worker نفسه
        await self.registration.unregister();

        console.log('Maintenance SW: caches cleared and service worker unregistered.');
      } catch (error) {
        console.error('Maintenance SW cleanup error:', error);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  // لا Cache ولا Firebase ولا أي معالجة للطلبات أثناء الصيانة
  return;
});
