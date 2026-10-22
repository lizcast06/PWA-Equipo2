import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

// 1. Los íconos declarados en el manifest existen y tienen el tamaño declarado
const manifest = JSON.parse(await readFile(resolve(root, "public/manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons) {
  const file = resolve(root, "public", icon.src.replace(/^\//, ""));
  assert.ok(existsSync(file), `el ícono ${icon.src} declarado en el manifest debe existir en public/`);
  const png = await readFile(file);
  assert.equal(png.toString("ascii", 1, 4), "PNG", `${icon.src} debe ser un PNG válido`);
  const [w, h] = icon.sizes.split("x").map(Number);
  assert.equal(png.readUInt32BE(16), w, `${icon.src} debe medir ${w}px de ancho`);
  assert.equal(png.readUInt32BE(20), h, `${icon.src} debe medir ${h}px de alto`);
}

const notif = await readFile(resolve(root, "src/lib/notifications/client.ts"), "utf8");
for (const [, path] of notif.matchAll(/"(\/[^"]+\.png)"/g)) {
  assert.ok(existsSync(resolve(root, "public", path.slice(1))), `el ícono de notificación ${path} debe existir`);
}

// 2. Cada enlace de navegación del shell apunta a una página real
const shell = await readFile(resolve(root, "src/components/app-shell.tsx"), "utf8");
const navHrefs = [...shell.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
assert.ok(navHrefs.length >= 3, "el shell debe declarar sus rutas de navegación");
for (const href of navHrefs) {
  assert.ok(!href.startsWith("#"), `la navegación no debe usar anclas vacías (${href})`);
  const page = resolve(root, "src/app", href.replace(/^\//, ""), "page.tsx");
  assert.ok(existsSync(page), `la ruta ${href} debe tener su página (${page})`);
}

// 3. El indicador offline refleja el estado real, no un texto fijo
assert.doesNotMatch(shell, /Offline Ready/, "el shell no debe mostrar 'Offline Ready' fijo");
assert.match(shell, /useAppStatus/, "el shell debe leer el estado real de conexión y Service Worker");

// 4. Las capacidades nativas están conectadas a la interfaz
const form = await readFile(resolve(root, "src/app/inspecciones/nueva/page.tsx"), "utf8");
assert.match(form, /requestCameraStream/, "el formulario debe usar la cámara");
assert.match(form, /createFileInputFallback/, "el formulario debe ofrecer el selector de archivos como respaldo");
assert.match(form, /obtainLocation/, "el formulario debe usar la geolocalización");
assert.match(form, /saveNewInspection/, "el formulario debe guardar en el almacenamiento local");

const store = await readFile(resolve(root, "src/lib/storage/local-store.ts"), "utf8");
assert.match(store, /new SyncQueue\(\)/, "la sincronización debe usar la cola SyncQueue");
assert.match(store, /processQueue/, "la sincronización debe despachar la cola");

const ajustes = await readFile(resolve(root, "src/app/ajustes/page.tsx"), "utf8");
assert.match(ajustes, /requestNotificationPermission/, "Ajustes debe permitir activar notificaciones");

// 5. El Service Worker precachea las pantallas principales
const sw = await readFile(resolve(root, "public/sw.js"), "utf8");
for (const route of ["/inspecciones/nueva", "/pendientes", "/ajustes", "/icon-192.png"]) {
  assert.ok(sw.includes(`"${route}"`), `sw.js debe precachear ${route}`);
}

console.log("ux.spec.ts: PASS");
