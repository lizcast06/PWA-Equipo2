import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function runServiceWorkerTests() {
  const root = process.cwd();
  const swPath = resolve(root, "public/sw.js");
  const registerPath = resolve(root, "src/lib/pwa/register-service-worker.ts");

  const swContent = await readFile(swPath, "utf8");
  const registerContent = await readFile(registerPath, "utf8");

  // Ciclo de vida obligatorio del Service Worker
  assert.match(swContent, /addEventListener\(["']install["']/, "sw.js debe escuchar el evento 'install'");
  assert.match(swContent, /addEventListener\(["']activate["']/, "sw.js debe escuchar el evento 'activate'");
  assert.match(swContent, /addEventListener\(["']fetch["']/, "sw.js debe escuchar el evento 'fetch'");

  // Control de cache y actualizacion controlada
  assert.match(swContent, /skipWaiting\(\)/, "sw.js debe invocar skipWaiting()");
  assert.match(swContent, /clients\.claim\(\)/, "sw.js debe reclamar clientes con clients.claim()");
  assert.match(swContent, /caches\.delete/, "sw.js debe depurar caches viejas en activate");

  // Verificacion del helper de registro
  assert.match(registerContent, /navigator\.serviceWorker\.register/, "El cliente debe registrar /sw.js");

  console.log("service-worker.spec.ts: PASS");
}

runServiceWorkerTests();