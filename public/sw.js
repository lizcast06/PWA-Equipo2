const CACHE_NAME = "pwa-inspecciones-static-v2";
const RUNTIME_CACHE = "pwa-inspecciones-runtime-v2";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png"
];

// Pantallas de la app que deben abrir sin conexión aunque no se hayan visitado.
const PRECACHE_ROUTES = [
  "/inspecciones",
  "/inspecciones/nueva",
  "/pendientes",
  "/ajustes"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_ASSETS);
      // Las rutas se agregan una por una: si alguna falla, la instalación no se cae.
      await Promise.all(PRECACHE_ROUTES.map((route) => cache.add(route).catch(() => undefined)));
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

function putInRuntimeCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return response;
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
