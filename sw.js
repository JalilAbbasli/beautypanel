// Beauty Panel service worker
// HTML: əvvəlcə şəbəkə (yeniləmələr dərhal gəlsin), internet yoxdursa keş.
// İkon, şrift, Supabase kitabxanası: keşdən verilir, arxada yenilənir.
// Supabase API sorğularına toxunmur — məlumat həmişə birbaşa serverdən gəlir.
const VERSION = 'bp-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon-32.png'];
const STATIC_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Səhifələr: şəbəkə → keş
  if (req.mode === 'navigate' || (sameOrigin && url.pathname.endsWith('.html'))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Statik fayllar: keş → arxada yenilə
  if ((sameOrigin && !url.pathname.endsWith('sw.js')) || STATIC_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((cached) => {
          const fresh = fetch(req)
            .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
            .catch(() => cached);
          return cached || fresh;
        })
      )
    );
  }
  // Qalan bütün sorğular (Supabase və s.) adi qaydada şəbəkəyə gedir.
});
