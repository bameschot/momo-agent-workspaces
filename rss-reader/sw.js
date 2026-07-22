// Minimal service worker whose only real job is to exist and control the page:
// Chrome's WebAPK minting (a real "Install app" that lands a standalone icon on
// the home screen, not just a browser-shortcut bookmark) requires an active
// service worker with a fetch handler as part of its installability criteria.
// Without one, "Install" can still appear to succeed but silently falls back to
// a plain home-screen shortcut that just opens the site in the browser.
//
// Caching strategy is deliberately network-first for the app shell (this file's
// own HTML/manifest/icon), never touching cross-origin requests at all — feed
// fetches and CORS-proxy requests must always go straight to the network, since
// the app already does its own cache-busting for those. The cache is only a
// fallback for when the shell can't be reached at all (offline), and is always
// refreshed from the network first when online, so there's no manual "bump the
// cache version" step required to avoid serving a stale app shell.

const CACHE_NAME = 'rss-reader-shell-v1';
const SHELL_ASSETS = ['./rss-reader.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept feed/proxy requests

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
