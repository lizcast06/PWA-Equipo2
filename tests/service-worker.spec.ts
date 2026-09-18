import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const swSource = await readFile(resolve(root, "public/sw.js"), "utf8");

/**
 * Simula el scope global de un Service Worker (self, caches, clients)
 * para poder EJECUTAR public/sw.js de verdad y observar su comportamiento,
 * en vez de solo revisar el texto del archivo con expresiones regulares.
 */
function createServiceWorkerSandbox() {
  const listeners: Record<string, (event: any) => void> = {};
  const stores: Record<string, Map<string, unknown>> = {};
  const calls = {
    skipWaiting: 0,
    clientsClaim: 0,
    deletedCaches: [] as string[],
  };

  const cacheApi = (name: string) => {
    stores[name] ??= new Map();
    return {
      addAll: async (urls: string[]) => {
        for (const url of urls) stores[name].set(url, { url });
      },
      put: async (request: unknown, response: unknown) => {
        stores[name].set(String((request as any).url ?? request), response);
      },
      match: async (request: unknown) => {
        const key = String((request as any).url ?? request);
        for (const store of Object.values(stores)) {
          if (store.has(key)) return store.get(key);
        }
        return undefined;
      },
    };
  };

  const sandbox: Record<string, unknown> = {
    self: {
      addEventListener: (type: string, handler: (event: any) => void) => {
        listeners[type] = handler;
      },
      skipWaiting: async () => {
        calls.skipWaiting += 1;
      },
      clients: {
        claim: async () => {
          calls.clientsClaim += 1;
        },
      },
      location: { origin: "https://inspecciones-utt.example" },
    },
    caches: {
      open: async (name: string) => cacheApi(name),
      keys: async () => Object.keys(stores),
      delete: async (name: string) => {
        calls.deletedCaches.push(name);
        delete stores[name];
        return true;
      },
      match: async (request: unknown) => {
        const key = String((request as any).url ?? request);
        for (const store of Object.values(stores)) {
          if (store.has(key)) return store.get(key);
        }
        return undefined;
      },
    },
    fetch: async () => {
      throw new Error("Sin red disponible en el entorno de prueba");
    },
    console,
    URL,
  };

  vm.createContext(sandbox);
  vm.runInContext(swSource, sandbox, { filename: "public/sw.js" });

  return { listeners, stores, calls };
}

function makeLifecycleEvent() {
  const pending: Promise<unknown>[] = [];
  return { event: { waitUntil: (p: Promise<unknown>) => pending.push(p) }, pending };
}

// --- Prueba 1: install precachea el shell y fuerza skipWaiting ---
{
  const { listeners, stores, calls } = createServiceWorkerSandbox();
  assert.ok(listeners.install, "sw.js debe registrar un listener 'install'");

  const { event, pending } = makeLifecycleEvent();
  listeners.install(event);
  await Promise.all(pending);

  assert.ok(stores["pwa-inspecciones-static-v1"], "debe existir la caché estática pwa-inspecciones-static-v1");
  assert.ok(
    stores["pwa-inspecciones-static-v1"].has("/") && stores["pwa-inspecciones-static-v1"].has("/manifest.webmanifest"),
    "el precache debe incluir '/' y '/manifest.webmanifest'"
  );
  assert.equal(calls.skipWaiting, 1, "install debe llamar self.skipWaiting() para activar sin bloquear");
}

// --- Prueba 2: activate elimina cachés obsoletas y reclama clientes ---
{
  const { listeners, stores, calls } = createServiceWorkerSandbox();
  stores["cache-obsoleta-v0"] = new Map([["/viejo", {}]]);
  stores["pwa-inspecciones-static-v1"] = new Map();
  stores["pwa-inspecciones-runtime-v1"] = new Map();

  assert.ok(listeners.activate, "sw.js debe registrar un listener 'activate'");
  const { event, pending } = makeLifecycleEvent();
  listeners.activate(event);
  await Promise.all(pending);

  assert.ok(calls.deletedCaches.includes("cache-obsoleta-v0"), "activate debe borrar cachés que no están en la lista vigente");
  assert.ok(!calls.deletedCaches.includes("pwa-inspecciones-static-v1"), "activate no debe borrar la caché estática vigente");
  assert.equal(calls.clientsClaim, 1, "activate debe llamar self.clients.claim() para tomar control inmediato");
}

console.log("service-worker.spec.ts: PASS");
