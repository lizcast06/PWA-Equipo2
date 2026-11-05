const CACHE_NAME = "pwa-inspecciones-static-v5";
const RUNTIME_CACHE = "pwa-inspecciones-runtime-v5";

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
// (el id va en ?id=).
//
// Semana 10: el shell se divide en dos grupos.
// - OBLIGATORIAS: sin ellas no se puede trabajar sin conexión (capturar, ver lo capturado,
//   revisar pendientes, cambiar de usuario). Si una falla, `install` falla y el navegador
//   mantiene la versión anterior del Service Worker, que sí está completa.
// - OPCIONALES: el detalle de las tres inspecciones sembradas de demostración. Si fallan, la
//   versión nueva se instala igual; esas pantallas se guardan después al visitarlas con red.
const REQUIRED_ROUTES = [
  "/",
  "/inspecciones",
  "/inspecciones/nueva",
  "/inspecciones/ver",
  "/pendientes",
  "/ajustes"
];

const OPTIONAL_ROUTES = [
  "/inspecciones/inspection-001",
  "/inspecciones/inspection-002",
  "/inspecciones/inspection-003"
];

const PRECACHE_ROUTES = [...REQUIRED_ROUTES, ...OPTIONAL_ROUTES];

// Archivos de Next.js (JS/CSS) que necesita una página para ser interactiva.
const STATIC_ASSET_PATTERN = /\/_next\/static\/[^"'\s)\\]+/g;

// Guarda el HTML de la ruta y los archivos JS/CSS que referencia, para que la pantalla
// funcione sin conexión aunque el usuario nunca la haya abierto con red.
// Lanza un error si la pantalla o alguno de sus archivos no se pudo guardar: una pantalla sin
// su JavaScript se ve pero no funciona (el formulario no guardaría nada).
async function precacheRoute(cache, route) {
  const response = await fetch(route, { cache: "no-store" });
  if (!response.ok) throw new Error(`precache ${route}: HTTP ${response.status}`);
  const html = await response.clone().text();
  const assets = Array.from(new Set(html.match(STATIC_ASSET_PATTERN) || []));
  await Promise.all(assets.map((asset) => cache.add(asset)));
  await cache.put(route, response);
}

self.addEventListener("install", (event) => {
  // Semana 10: ya NO se llama skipWaiting() aquí. Si hay una versión anterior controlando
  // la app, esta queda "en espera" hasta que la persona pulse "Actualizar" (mensaje
  // SKIP_WAITING). La primera instalación se activa sola porque no hay versión anterior.
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_ASSETS);
      // Obligatorias: si una falla, la promesa se rechaza y la instalación falla.
      await Promise.all(REQUIRED_ROUTES.map((route) => precacheRoute(cache, route)));
      // Opcionales: un fallo no detiene la instalación.
      await Promise.all(OPTIONAL_ROUTES.map((route) => precacheRoute(cache, route).catch(() => undefined)));
    })
    // Sin .catch(): si se rechaza, el navegador descarta este worker ("redundant") y la
    // versión anterior sigue controlando. No se borra CACHE_NAME aquí porque, si alguien
    // publica sin subir el número de caché, sería la caché de la versión que sigue activa.
  );
});

// La interfaz (src/lib/pwa/register-service-worker.ts) envía este mensaje solo cuando la
// persona pulsa "Actualizar". Entonces la versión en espera se activa y toma el control.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
