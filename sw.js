// Filist SW v2 — Network-first, auth-safe
const CACHE = 'filist-v2';
const SHELL = ['./index.html','./manifest.json','./icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept these — Firebase Auth needs them untouched
  const skip = [
    'firebaseapp.com', 'googleapis.com', 'gstatic.com',
    'accounts.google.com', 'imgbb.com', 'fonts.googleapis.com'
  ];
  if(e.request.method !== 'GET') return;
  if(skip.some(s => url.hostname.includes(s))) return;

  // Navigation (HTML) — network first, cache fallback
  if(e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { if(r.ok){caches.open(CACHE).then(c=>c.put(e.request,r.clone()))} return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(r => {
        if(r.ok) caches.open(CACHE).then(c=>c.put(e.request,r.clone()));
        return r;
      });
      return cached || net;
    })
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
