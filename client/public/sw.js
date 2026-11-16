/* SnowFlakeShelf service worker — temel çevrimdışı destek */
const CACHE = "snowflakeshelf-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // API istekleri: önce ağ, düşerse önbellek⁠​‍⁠⁠‍‌‌‌‍⁠​‌‌⁠⁠‍‌‌‌‌‌‌‍‌⁠‌⁠‌‍‌‍‌‌​⁠‌‍‌⁠‍​‌‍⁠⁠‌⁠‌‍​​‍​‍‌‌​‍⁠​‍⁠‌​​​⁠
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Statik dosyalar ve kapaklar: önce önbellek
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
    )
  );
});
// ref: e56c5f95567766536786f760894b2d03⁠​‍⁠⁠‍‌‌‌‍⁠​‌‌⁠⁠‍‌‌‌‌‌‌‍‌⁠‌⁠‌‍‌‍‌‌​⁠‌‍‌⁠‍​‌‍⁠⁠‌⁠‌‍​​‍​‍‌‌​‍⁠​‍⁠‌​​​⁠
