const CACHE_NAME = 'schichtplaner-v1';
const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap'
];

// Install: cache alle Assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching assets...');
        // Cache local assets, ignore font failures (offline fonts not critical)
        return cache.addAll(['./', './index.html']).then(() => {
          return cache.add('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap')
            .catch(() => console.log('Fonts nicht gecacht (kein Internet) – App läuft trotzdem'));
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: alte Caches löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache First für lokale Dateien, Network First für Fonts
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Lokale Dateien: Cache First
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Fonts: Network First mit Cache Fallback
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
});

// Beim Update der App: neuen Cache anlegen
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
