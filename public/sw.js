/*
 * Solace service worker (PRD 14: screening and results keep working
 * offline after the first visit).
 *
 * - Pages: network first, then the cached copy. Pages are static and carry
 *   no personal data; answers and results live only in the browser.
 * - /_next/static: cache first (file names change with every build).
 * - /api: never cached, never touched.
 * - A router data request (RSC) that fails offline answers with an error,
 *   so the Next router falls back to a full page load, which is then served
 *   from the cache.
 *
 * The page asks for its language's screening pages to be cached ahead of
 * time with a "precache" message.
 */

const VERSION = "solace-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isRouterRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

const STATIC_ASSET = /\/_next\/static\/[^"'\s)]+/g;

async function cachePage(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok || response.redirected) return;
  const html = await response.clone().text();
  await (await caches.open(PAGES)).put(path, response);
  const assets = [...new Set(html.match(STATIC_ASSET) ?? [])];
  const cache = await caches.open(ASSETS);
  await Promise.all(
    assets.map(async (asset) => {
      if (await cache.match(asset)) return;
      const assetResponse = await fetch(asset);
      if (assetResponse.ok) await cache.put(asset, assetResponse);
    }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "precache" || !Array.isArray(data.paths)) return;
  const paths = data.paths.filter((path) => typeof path === "string" && path.startsWith("/") && !path.startsWith("//"));
  event.waitUntil(
    (async () => {
      for (const path of paths) {
        if (await (await caches.open(PAGES)).match(path)) continue;
        try {
          await cachePage(path);
        } catch {
          // Offline or a server error: try again on the next visit.
        }
      }
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!sameOrigin(url) || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  if (isRouterRequest(request, url)) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const response = await fetch(request);
          if (response.ok && !response.redirected) cache.put(url.pathname, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(url.pathname)) ??
            (await cache.match(url.pathname.startsWith("/en") ? "/en" : "/")) ??
            Response.error()
          );
        }
      })(),
    );
  }
});
