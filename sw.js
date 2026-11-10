/*
 * Service worker of app.lugano.in: keeps the installed app's own few files (the frame page, icons, scripts) so it
 * opens even on a bad connection. Network first, so a site update shows at once; the cache is only the fallback.
 * The app itself comes from Google (script.google.com) and never passes through here.
 */
var LUGANO_CACHE = 'lugano-v1';
var LUGANO_FILES = ['/app/', '/app/shell.js', '/go.js', '/install.js', '/share/share.js', '/style.css', '/logo.png', '/wordmark.png', '/icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(LUGANO_CACHE).then(function (c) { return c.addAll(LUGANO_FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== LUGANO_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok && LUGANO_FILES.indexOf(url.pathname) >= 0) { var copy = res.clone(); caches.open(LUGANO_CACHE).then(function (c) { c.put(url.pathname, copy); }); }
    return res;
  }, function () {
    return caches.match(url.pathname).then(function (hit) { return hit || (req.mode === 'navigate' ? caches.match('/app/') : Response.error()); });
  }));
});
