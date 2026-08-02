const CACHE = 'schichtplaner-v5';

// Beim Install: index.html sofort cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        './',
        './index.html',
      ]);
    }).then(() => self.skipWaiting())
  );
});

// Beim Activate: alte Caches löschen + sofort übernehmen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache First – wenn nichts im Cache, dann Netzwerk
self.addEventListener('fetch', e => {
  // Nur GET-Anfragen abfangen
  if(e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Externe URLs (Fonts etc.) ignorieren
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        if(cached){
          // Im Cache gefunden – sofort zurückgeben
          // Gleichzeitig im Hintergrund aktualisieren
          fetch(e.request).then(fresh => {
            if(fresh && fresh.status === 200)
              cache.put(e.request, fresh.clone());
          }).catch(()=>{});
          return cached;
        }
        // Nicht im Cache – Netzwerk versuchen und dann cachen
        return fetch(e.request).then(response => {
          if(response && response.status === 200)
            cache.put(e.request, response.clone());
          return response;
        }).catch(() => {
          // Netzwerk nicht verfügbar – index.html als Fallback
          return cache.match('./index.html');
        });
      })
    )
  );
});
