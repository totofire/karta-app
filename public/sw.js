// Karta PWA — Service Worker
// Estrategia: Network First para API, Cache First para assets estáticos

const CACHE_VERSION = "karta-mozo-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/mozo",
  "/offline",
  "/icons/web-app-manifest-192x192.png",
  "/icons/web-app-manifest-512x512.png",
  "/sounds/ding.mp3",
  "/sounds/caja.mp3",
];

// ── Instalación: precachear recursos críticos ──────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activación: limpiar caches viejos ─────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estrategia por tipo de request ─────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar mismo origen
  if (url.origin !== location.origin) return;

  // API Mozo → Network First (5s timeout, fallback a cache)
  if (url.pathname.startsWith("/api/mozo/")) {
    event.respondWith(networkFirst(request, 5000));
    return;
  }

  // Assets estáticos (_next/static, imágenes, sonidos) → Cache First
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/sounds/") ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|mp3|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Páginas navegación (GET HTML) → Network First con fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? Response.error())
      )
    );
    return;
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
async function networkFirst(request, timeoutMs) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, response.clone());
  }
  return response;
}
