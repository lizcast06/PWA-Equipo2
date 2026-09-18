import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const swSource = await readFile(resolve(root, "public/sw.js"), "utf8");

/**
 * Ejecuta public/sw.js dentro de un scope simulado, permitiendo inyectar
 * un `fetch` de red controlado para poder provocar fallos de conexión
 * y comprobar que el fallback offline (fallback a caché) sí ocurre.
 */
function createServiceWorkerSandbox(networkFetch: (request: any) => Promise<any>) {
  const listeners: Record<string, (event: any) => void> = {};
  const store = new Map<string, unknown>();

  const cacheApi = {
    addAll: async (urls: string[]) => {
      for (const url of urls) store.set(url, { url, status: 200 });
    },
    put: async (request: unknown, response: unknown) => {
      store.set(String((request as any).url ?? request), response);
    },
  };

  const sandbox: Record<string, unknown> = {
    self: {
      addEventListener: (type: string, handler: (event: any) => void) => {
        listeners[type] = handler;
      },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      location: { origin: "https://inspecciones-utt.example" },
    },
    caches: {
      open: async () => cacheApi,
      keys: async () => [],
      delete: async () => true,
      match: async (request: unknown) => {
        const key = String((request as any).url ?? request);
        return store.get(key);
      },
    },
    fetch: networkFetch,
    console,
    URL,
  };

  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { filename: "public/sw.js" });

  return { listeners, store };
}

function makeFetchEvent(url: string, mode: "navigate" | "same-origin" = "navigate") {
  let capturedResponse: Promise<unknown> | null = null;
  const event = {
    request: { url, method: "GET", mode },
    respondWith: (p: Promise<unknown>) => {
      capturedResponse = p;
    },
  };
  return { event, getResponse: () => capturedResponse };
}

// --- Escenario offline: navegación sin red debe recuperar el shell cacheado ---
{
  const failingNetwork = async () => {
    throw new TypeError("network offline (simulado)");
  };
  const { listeners, store } = createServiceWorkerSandbox(failingNetwork);

  // Precacheamos manualmente el shell, como haría 'install' con conexión previa.
  // La clave es '/' (relativa) porque el fallback del sw.js consulta caches.match("/") literalmente.
  store.set("/", { url: "/", status: 200, cached: true });

  assert.ok(listeners.fetch, "sw.js debe registrar un listener 'fetch'");

  const { event, getResponse } = makeFetchEvent("https://inspecciones-utt.example/dashboard", "navigate");
  listeners.fetch(event);

  const response: any = await getResponse();
  assert.ok(response, "sin red, la navegación debe resolver con una respuesta de caché en vez de rechazar");
  assert.equal(response.cached, true, "el fallback offline debe devolver el shell precacheado ('/'), no un error");
}

// --- Escenario con red: navegación exitosa no debe depender de la caché ---
{
  const workingNetwork = async (request: any) => ({ url: request.url, status: 200, fromNetwork: true, clone: () => ({ url: request.url, status: 200 }) });
  const { listeners } = createServiceWorkerSandbox(workingNetwork);

  const { event, getResponse } = makeFetchEvent("https://inspecciones-utt.example/inspecciones", "navigate");
  listeners.fetch(event);

  const response: any = await getResponse();
  assert.equal(response.fromNetwork, true, "con red disponible, la navegación debe usar la respuesta fresca (network-first)");
}

// --- Peticiones de otro origen no deben ser interceptadas por el shell ---
{
  let interceptedExternally = false;
  const { listeners } = createServiceWorkerSandbox(async () => ({ status: 200 }));
  const event = {
    request: { url: "https://cdn-externo.example/lib.js", method: "GET", mode: "same-origin" },
    respondWith: () => {
      interceptedExternally = true;
    },
  };
  listeners.fetch(event);
  assert.equal(interceptedExternally, false, "las peticiones de origen externo no deben ser respondidas por el service worker del shell");
}

console.log("offline.spec.ts: PASS");
