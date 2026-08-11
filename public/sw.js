/* YomuLog — app-level service worker (P-1 web bundle caching).
 *
 * Why this exists: the hosting edge (Blaxel) forces `no-store` on every
 * resource, so HTTP cache headers can never be set from origin — this SW is
 * the ONLY cache layer for the web app. server.js / serve.ts are NOT in the
 * serving path; editing them is a dead end.
 *
 * Strategy (per perf-fix-locations.md §4):
 *  - Content-hashed static assets (/_expo/static/* — AppEntry-<hash>.js,
 *    hashed CSS/images) → CACHE-FIRST. Hash = immutable; a rebuild produces
 *    a new URL, which naturally busts the cache.
 *  - Navigation (index.html) → NETWORK-FIRST with cache fallback (gives real
 *    offline web without ever serving a stale shell online).
 *  - Everything else (MangaDex API/proxy, Supabase, Stripe checkout,
 *    cross-origin images) → PASS-THROUGH untouched (network-only).
 *
 * Version the cache name to force a full shell refresh on deploy.
 */
const CACHE_NAME = 'yomulog-shell-v1';
const HASHED_STATIC_PREFIX = '/_expo/static/';

self.addEventListener('install', () => {
  // Take control of already-open pages as soon as activation completes.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop caches from previous versions (new bundle hash → new shell).
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST (Stripe/Supabase/etc.) passes through.

  const url = new URL(req.url);
  // Cross-origin requests (MangaDex, proxy, Supabase, Stripe) are never ours
  // to cache — default network behavior.
  if (url.origin !== self.location.origin) return;

  // Content-hashed static bundle/assets → cache-first.
  if (url.pathname.startsWith(HASHED_STATIC_PREFIX)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
      }
      return res;
    })());
    return;
  }

  // Navigation (the app shell / index.html) → network-first, cache fallback
  // so a warm reload stays fast and offline still opens the app.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // Any other same-origin GET: default network behavior.
});
