// Filist SW v3 — Network-first, auth-safe & robust fallback
const CACHE = 'filist-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png'
];

// Service Worker Kurulumu
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(err => console.warn('Cache ekleme hatası:', err)))
      .then(() => self.skipWaiting())
  );
});

// Eski Cache Temizliği
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// İstek Yönetimi (Fetch)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase Auth ve harici API'leri asla engelleme
  const skip = [
    'firebaseapp.com', 
    'googleapis.com', 
    'gstatic.com',
    'accounts.google.com', 
    'imgbb.com', 
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];
  
  if (e.request.method !== 'GET') return;
  if (skip.some(s => url.hostname.includes(s))) return;

  // Sayfa Navigasyonu (HTML) — Önce Ağ, Hata Durumunda Cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Diğer Statik Varlıklar (CSS, JS, Resimler) — Önce Ağ, Hata Durumunda Cache
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
