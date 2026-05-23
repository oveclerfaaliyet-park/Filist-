const V = 'filist-v3';
const FILES = ['./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c=>c.addAll(FILES).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  // Skip external APIs
  if(['imgbb.com','fonts.googleapis.com','fonts.gstatic.com'].some(h=>u.hostname.includes(h))) return;
  // Network first for HTML
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{caches.open(V).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match('./index.html')));
    return;
  }
  // Cache first for assets
  e.respondWith(caches.match(e.request).then(c=>{
    const n=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(cc=>cc.put(e.request,r.clone()));return r;});
    return c||n;
  }));
});
