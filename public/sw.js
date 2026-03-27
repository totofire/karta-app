// Karta PWA — Service Worker
// Estrategia: Network First para API, Cache First para assets estáticos

const CACHE_VERSION = "karta-v3";
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

  // NO interceptar APIs de admin/cocina/barra — siempre network directo
  if (
    url.pathname.startsWith("/api/admin/") ||
    url.pathname.startsWith("/api/cocina") ||
    url.pathname.startsWith("/api/barra") ||
    url.pathname.startsWith("/api/auth/")
  ) {
    return;
  }

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

// ── Mensajes desde la página (postMessage) ────────────────────────────────
// La página puede enviar { type: "NOTIFY", title, body, tag } al SW
// para mostrar una notificación nativa aunque la pestaña esté en background.
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "NOTIFY") return;
  const { title, body, tag, url } = event.data;
  if (!title) return;
  self.registration.showNotification(title, {
    body: body ?? "",
    icon: "/icons/web-app-manifest-192x192.png",
    badge: "/icons/web-app-manifest-192x192.png",
    tag: tag ?? title,
    renotify: true,
    data: { url: url ?? "/admin" },
  });
});

// ── Click en notificación del SW ───────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/admin";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Buscar una ventana que coincida con la ruta destino
        const match = clients.find((c) => c.url.includes(targetUrl));
        if (match) return match.focus();
        // Fallback: cualquier ventana abierta de la app
        const any = clients.find((c) => c.url.includes(location.origin));
        if (any) return any.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
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
