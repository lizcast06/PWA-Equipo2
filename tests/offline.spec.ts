import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function runOfflineTests() {
  const root = process.cwd();
  const swPath = resolve(root, "public/sw.js");
  const docPath = resolve(root, "docs/cache-strategy.md");

  const swContent = await readFile(swPath, "utf8");
  const docContent = await readFile(docPath, "utf8");

  // Validación de precache del App Shell y Manifest
  assert.match(swContent, /PRECACHE_ASSETS/, "sw.js debe definir la lista de precache estático");
  assert.match(swContent, /manifest\.webmanifest/, "sw.js debe incluir manifest en el precache");

  // Coherencia con la documentación de caché
  assert.ok(docContent.length > 100, "docs/cache-strategy.md debe contener especificación técnica detallada");
  assert.match(docContent, /Precache/i, "docs/cache-strategy.md debe especificar precache");
  assert.match(docContent, /Fallback/i, "docs/cache-strategy.md debe documentar fallback offline");

  console.log("offline.spec.ts: PASS");
}

runOfflineTests();