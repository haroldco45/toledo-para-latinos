/* Toledo para Latinos — Service Worker (Vibras Positivas HM) */
const VERSION = 'tol-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Datos en vivo (clima, cambio, festivos, Wikipedia, OpenStreetMap): red primero, caché como respaldo
  const live = /open-meteo\.com|er-api\.com|date\.nager\.at|wikipedia\.org|overpass-api\.de/.test(url.host) || /ciudades\.json$/.test(url.pathname);
  if (live || req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Fotos de Wikimedia: directo a la red (nunca guardar respuestas fallidas)
  if (/wikimedia\.org$/.test(url.host)) return;
  // Resto (app, fuentes, mapas): caché primero; solo se guardan respuestas buenas
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const tile = /basemaps\.cartocdn\.com$/.test(url.host);
    if (r.ok || (tile && r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => hit)));
});
