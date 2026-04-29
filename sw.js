var CACHE_NAME = 'englishlab-v3';
var ASSETS = ['/', '/index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(ASSETS);
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if(e.request.method !== 'GET') return;
  var url = e.request.url;
  if(url.includes('firebase')||url.includes('googleapis')||url.includes('script.google')) return;
  e.respondWith(
    fetch(e.request).then(function(res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, copy); });
      return res;
    }).catch(function(){ return caches.match(e.request); })
  );
});
