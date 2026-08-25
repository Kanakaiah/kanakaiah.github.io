// Offline support for Remora.
//
// This file used to cache `verses_100.json` and a lucide bundle from unpkg — assets
// from an earlier incarnation of the app, neither of which exists any more — and
// index.html actively unregistered every service worker on boot, so none of it ran.
// A daily-habit memorization app that cannot open a chapter on a plane, on a train, or
// in a dead zone is unusable in exactly the moments it is meant for.
//
// Two caches, two strategies, because the two kinds of content fail differently:
//
//   SHELL   the built app itself. Cache-first: the bundle is content-hashed, so a
//           cached hit is never stale, and this is what makes a cold offline launch
//           work at all.
//   CONTENT chapter text, cross-references and Strong's entries fetched from the
//           network. Stale-while-revalidate: serve what we have immediately, refresh
//           in the background. Scripture does not change, so a stale hit is correct.
//
// Chapter art (/chapters/**) and book covers (/books/**) are cached on first use
// rather than pre-cached: there are well over a thousand plates and pre-caching them
// would mean a very large download for images most readers will never open.

const VERSION = 'v3';
const SHELL_CACHE = `remora-shell-${VERSION}`;
const CONTENT_CACHE = `remora-content-${VERSION}`;

// Only the entry point is pre-cached. Hashed bundles are picked up on first visit by
// the fetch handler below — listing them here would mean editing this file on every
// build, which is exactly the kind of thing that silently rots.
const SHELL_PRECACHE = ['./', './index.html', './manifest.json', './icon.png', './favicon.svg'];

const CONTENT_HOSTS = ['bolls.life', 'bible-api.com'];

// index.html and the hashed bundle it points at must be cached together or not at all.
//
// Caching the page alone is not enough and fails in a way that looks like the app is
// simply broken: a rebuild changes the bundle's content hash, the next install writes
// the *new* index.html into the cache, and offline the page then asks for a script
// that was never fetched — a white screen with no error. So the installer reads the
// markup it just cached and pulls in every asset it references.
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  // Individually, so one 404 can't reject the whole install and leave the app with no
  // service worker at all.
  await Promise.allSettled(SHELL_PRECACHE.map(url => cache.add(url)));

  try {
    const html = await cache.match('./index.html').then(r => r && r.text());
    if (!html) return;
    const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
    await Promise.allSettled(refs.map(url => cache.add(url)));
  } catch {
    // A shell without its assets is still better than no offline support at all;
    // the navigation handler falls back to the network when it can reach it.
  }
}

self.addEventListener('install', event => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

// Caches left behind by earlier versions of this worker, under names that don't match
// the current prefix. Without naming them explicitly they survive forever as orphaned
// storage — the v2 cache still held ~28 entries of a build that no longer exists.
const LEGACY_CACHES = ['bible-mem-cache-v1', 'bible-mem-cache-v2'];

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(n =>
            LEGACY_CACHES.includes(n) ||
            (n.startsWith('remora-') && n !== SHELL_CACHE && n !== CONTENT_CACHE))
          .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

function isAsset(url) {
  return url.origin === self.location.origin && (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/chapters/') ||
    url.pathname.startsWith('/books/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json')
  );
}

// `ignoreVary` is load-bearing, not defensive tidying.
//
// The dev/preview server sends `Vary: Origin` on assets. A cached entry stored from
// one request shape is then considered a miss for a request whose Origin header
// differs — and a module script's request does differ from a plain fetch(). Offline
// that miss falls through to a dead network, so the page loads its cached HTML,
// silently fails to load its own bundle, and renders a white screen. Matching on the
// URL is what we actually want here: these files are content-hashed.
const MATCH_OPTS = { ignoreVary: true };

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTS);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const byUrl = await cache.match(request.url, MATCH_OPTS);
    if (byUrl) return byUrl;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, MATCH_OPTS);
  const network = fetch(request)
    .then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  // A cached copy wins the race outright; without one we have to wait for the network,
  // and if that fails too the caller gets a real rejection rather than a hang.
  if (cached) return cached;
  const response = await network;
  if (response) return response;
  throw new Error('offline and uncached');
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Scripture and lexicon data from the APIs the reader depends on.
  if (CONTENT_HOSTS.some(h => url.hostname.endsWith(h))) {
    event.respondWith(staleWhileRevalidate(request, CONTENT_CACHE));
    return;
  }

  // Navigations: try the network so a deploy is picked up, fall back to the cached
  // shell so a cold offline launch still boots. The app is a hash router, so any
  // in-app route resolves from index.html once it is running.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('./index.html', MATCH_OPTS))
            || (await cache.match('./', MATCH_OPTS))
            || Response.error();
      })
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
