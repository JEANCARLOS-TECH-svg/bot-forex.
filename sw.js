// ForexBot v19 — Service Worker
// Versión del cache — cambia esto al actualizar el bot
const CACHE_VERSION = 'forexbot-v19';
const CACHE_NAME    = `${CACHE_VERSION}-cache`;

// Archivos a cachear para modo offline
const CACHE_FILES = [
  '/Forex-bot/',
  '/Forex-bot/index.html',
  '/Forex-bot/manifest.json',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap'
];

// ── INSTALL — cachea los archivos al instalar ──────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando ForexBot v19...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(CACHE_FILES.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => console.warn('[SW] Error cacheando:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — limpia caches antiguas ─────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activando ForexBot v19...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando cache antigua:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH — estrategia: Network first, cache fallback ─────────
self.addEventListener('fetch', event => {
  // Solo interceptar GET requests
  if(event.request.method !== 'GET') return;

  // No interceptar requests a Binance (WebSocket/API — siempre en vivo)
  const url = event.request.url;
  if(url.includes('binance') || url.includes('binancefuture')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, actualiza el cache
        if(response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin red — devuelve del cache
        return caches.match(event.request)
          .then(cached => {
            if(cached) {
              console.log('[SW] Sirviendo desde cache:', url);
              return cached;
            }
            // Si es una navegación, devuelve index.html
            if(event.request.mode === 'navigate') {
              return caches.match('/Forex-bot/index.html');
            }
          });
      })
  );
});

// ── BACKGROUND SYNC — sincroniza datos cuando vuelve la red ───
self.addEventListener('sync', event => {
  if(event.tag === 'forexbot-sync') {
    console.log('[SW] Sincronización en background...');
  }
});

// ── MESSAGE — comunicación con la app ─────────────────────────
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if(event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
