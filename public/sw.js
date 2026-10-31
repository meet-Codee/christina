// sw.js: F9 offline-ready shell. The app shell, fonts and KaTeX are cached; AI calls always go to the network.
// Spoken lines live in their own cache ('christina-voice-v1', managed by voice.js), so cached voice replays offline.
const VERSION = 'christina-shell-v2.1.1';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/motion.js', '/fx.js', '/i18n.js', '/orb.js', '/aurora.js', '/voice.js', '/mic.js', '/call.js', '/scratchpad.js', '/sky.js', '/visual.js', '/explain.js', '/share.js', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('christina-shell-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__voice/'))) return;

  // Fonts and KaTeX: cache first, refresh in the background.
  if (CDN.test(req.url)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || new Response('', { status: 504 });
    })());
    return;
  }

  // The app itself: network first (so updates show at once), cache when offline.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      } catch {
        return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('/') : null) || new Response('Offline', { status: 503 });
      }
    })());
  }
});
