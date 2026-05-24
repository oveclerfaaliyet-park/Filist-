const V = 'filist-v4';
const BASE = '/Filist-/';
const SHELL = [BASE, BASE+'index.html', BASE+'manifest.json', BASE+'icons/icon-192.png', BASE+'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  const u = new URL(e.request.url);
  const skip = ['firestore.googleapis.com','firebase.googleapis.com','identitytoolkit',
                 'securetoken','imgbb.com','fonts.googleapis.com','fonts.gstatic.com'];
  if(skip.some(s=>u.hostname.includes(s)||u.href.includes(s))) return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{
      caches.open(V).then(c=>c.put(e.request,r.clone())); return r;
    }).catch(()=>caches.match(BASE+'index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    const net=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>{});
    return cached||(net||new Response('offline',{status:503}));
  }));
});
