// Filist SW v7 — with push notifications
const V = 'filist-v7';
const BASE = '/Filist-/';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V).then(c => c.addAll([
      BASE, BASE+'index.html', BASE+'manifest.json',
      BASE+'icons/icon-192.png', BASE+'icons/icon-512.png'
    ]).catch(()=>{})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k=>k!==V && k!=='filist-notify').map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const skip = ['firestore.googleapis.com','firebase.googleapis.com','identitytoolkit',
    'securetoken','cloudinary.com','fonts.googleapis.com','fonts.gstatic.com',
    'gstatic.com/firebasejs','youtube.com','youtu.be','ytimg.com'];
  if(skip.some(s => url.href.includes(s))) return;
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(BASE+'index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    const net=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>{});
    return cached||net;
  }));
});

// ── PERIODIC SYNC ─────────────────────────────────────
self.addEventListener('periodicsync', e => {
  if(e.tag === 'filist-daily') e.waitUntil(checkAndNotify());
});

// ── SCHEDULED CHECK via setTimeout trick ──────────────
self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if(e.data?.type === 'SCHEDULE_NOTIF') {
    const {ms, entries} = e.data;
    // Store data in cache for later use
    caches.open('filist-notify').then(c =>
      c.put('/filist-notify-data', new Response(JSON.stringify({entries, ts: Date.now()})))
    );
    // Schedule via setTimeout (works while SW is alive)
    if(ms > 0 && ms < 24*60*60*1000) {
      setTimeout(() => checkAndNotify(), ms);
    }
  }
  if(e.data?.type === 'UPDATE_NOTIFY_DATA') {
    caches.open('filist-notify').then(c =>
      c.put('/filist-notify-data', new Response(JSON.stringify({entries: e.data.entries, ts: Date.now()})))
    );
  }
});

async function checkAndNotify() {
  try {
    const cache = await caches.open('filist-notify');
    const resp = await cache.match('/filist-notify-data');
    if(!resp) return;
    const data = await resp.json();
    const entries = data.entries || [];
    if(!entries.length) return;

    const today = entries.filter(e => e._df === 0);
    const tomorrow = entries.filter(e => e._df === 1);
    const soon = entries.filter(e => e._df > 1 && e._df <= 5);

    let title = 'Filist — Hatırlatıcı';
    let body = '';
    if(today.length) body += `📌 Bugün: ${today.map(e=>e.title).slice(0,2).join(', ')}${today.length>2?' +'+( today.length-2):''}. `;
    if(tomorrow.length) body += `⏰ Yarın: ${tomorrow.length} kayıt. `;
    if(soon.length && !body) body += `📅 ${soon.length} yaklaşan kayıt. `;
    if(!body) body = `${entries.length} yaklaşan kayıt var.`;

    const opts = {
      body: body.trim(),
      icon: BASE+'icons/icon-192.png',
      badge: BASE+'icons/icon-96.png',
      tag: 'filist-reminder',
      renotify: true,
      vibrate: [200,100,200],
      data: {url: BASE}
    };
    await self.registration.showNotification(title, opts);
  } catch(err) { console.error('Notify error:', err); }
}

// ── NOTIFICATION CLICK ────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(cls => {
      const match = cls.find(c => c.url.includes('/Filist-/'));
      if(match) return match.focus();
      return clients.openWindow(BASE);
    })
  );
});
