var CN="keuangan-v1";
var urls=["/","index.html","app.js","manifest.json","icon-192.png","icon-512.png"];

self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CN).then(function(c){return c.addAll(urls);}));
});

self.addEventListener("fetch",function(e){
  e.respondWith(caches.match(e.request).then(function(r){return r||fetch(e.request);}));
});

self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.map(function(n){if(n!==CN)return caches.delete(n);}));
  }));
});