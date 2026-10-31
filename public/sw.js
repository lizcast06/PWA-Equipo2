const CACHE_NAME = "pwa-inspecciones-static-v4";
const RUNTIME_CACHE = "pwa-inspecciones-runtime-v4";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png"
];

// Pantallas de la app que deben abrir sin conexión aunque no se hayan visitado.
// Son públicas y sin datos de la sesión: los registros del usuario viven en localStorage y
// se borran al cerrar sesión (src/lib/security/logout.ts).
// "/inspecciones/ver" es la vista de detalle de las inspecciones creadas en el dispositivo
// (el id va en ?id=), y las tres inspecciones sembradas tienen su propio detalle.
const PRECACHE_ROUTES = [
  "/inspecciones",
  "/inspecciones/nueva",
  "/inspecciones/ver",
  "/inspecciones/inspection-001",
  "/inspecciones/inspection-002",
  "/inspecciones/inspection-003",
  "/pendientes",
  "/ajustes"
];

// Archivos de Next.js (JS/CSS) que necesita una página para ser interactiva.
const STATIC_ASSET_PATTERN = /\/_next\/static\/[^"'\s)\\]+/g;

// Guarda el HTML de la ruta y los archivos JS/CSS que referencia, para que la pantalla
// funcione sin conexión aunque el usuario nunca la haya abierto con red.
async function precacheRoute(cache, route) {
  const response = await fetch(route, { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(route, response);
  const assets = Array.from(new Set(html.match(STATIC_ASSET_PATTERN) || []));
  await Promise.all(assets.map((asset) => cache.add(asset).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_ASSETS);
      // Las rutas se agregan una por una: si alguna falla, la instalación no se cae.
      await Promise.all(
        ["/", ...PRECACHE_ROUTES].map((route) => precacheRoute(cache, route).catch(() => undefined))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Semana 9 (riesgo R4): NO se guarda "cualquier GET". Solo entra a la caché dinámica lo que
// está en esta lista permitida: pantallas públicas sin parámetros, archivos de Next.js,
// íconos y manifest. Nunca respuestas de /api/, con Cache-Control no-store/private, ni URLs
// con consulta (?id=..., ?_rsc=...), que pueden llevar datos de una persona.
const CACHEABLE_PATHS = new Set(["/", ...PRECACHE_ROUTES, ...PRECACHE_ASSETS]);

function isCacheable(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return false;
  const cacheControl = (response.headers.get("Cache-Control") || "").toLowerCase();
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return url.search === "" && CACHEABLE_PATHS.has(url.pathname);
}

function putInRuntimeCache(request, response) {
  if (!isCacheable(request, response)) return response;
  const cloned = response.clone();
  caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, cloned));
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-First para navegación con fallback a caché (y a "/" como último recurso)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => putInRuntimeCache(event.request, response))
        .catch(() =>
          caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Íconos y manifest: Cache-First (no cambian entre versiones)
  if (PRECACHE_ASSETS.includes(url.pathname) && url.pathname !== "/") {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Resto (JS, CSS, datos de navegación): Network-First con fallback a caché.
  // Así nunca se sirve código viejo con conexión y la app sigue funcionando sin ella.
  event.respondWith(
    fetch(event.request)
      .then((response) => putInRuntimeCache(event.request, response))
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
