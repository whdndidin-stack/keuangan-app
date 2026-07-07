var CN = "keuangan-v8";
var urls = [
    "/",
    "index.html",
    "app.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png"
];

/* Install - cache semua file */
self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(CN).then(function (c) {
            return c.addAll(urls);
        })
    );
    /* Langsung aktifkan tanpa tunggu */
    self.skipWaiting();
});

/* Activate - hapus cache lama */
self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.map(function (n) {
                    if (n !== CN) {
                        console.log("Hapus cache lama:", n);
                        return caches.delete(n);
                    }
                })
            );
        })
    );
    /* Ambil alih semua tab */
    self.clients.claim();
});

/* Fetch - Network First, fallback ke cache */
self.addEventListener("fetch", function (e) {
    e.respondWith(
        fetch(e.request)
            .then(function (response) {
                /* Simpan response baru ke cache */
                var responseClone = response.clone();
                caches.open(CN).then(function (cache) {
                    cache.put(e.request, responseClone);
                });
                return response;
            })
            .catch(function () {
                /* Kalau offline, ambil dari cache */
                return caches.match(e.request);
            })
    );
});

/* Listen untuk pesan update dari app */
self.addEventListener("message", function (e) {
    if (e.data === "skipWaiting") {
        self.skipWaiting();
    }
});
