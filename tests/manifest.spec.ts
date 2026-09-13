import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const raw = await readFile(resolve(root, "public/manifest.webmanifest"), "utf8");
const manifest = JSON.parse(raw);

assert.ok(typeof manifest.name === "string" && manifest.name.length > 0, "manifest.name debe existir");
assert.ok(typeof manifest.short_name === "string" && manifest.short_name.length > 0, "manifest.short_name debe existir");
assert.ok(typeof manifest.start_url === "string" && manifest.start_url.length > 0, "manifest.start_url debe existir");
assert.ok(typeof manifest.scope === "string" && manifest.scope.length > 0, "manifest.scope debe existir");
assert.equal(manifest.display, "standalone", "display debe ser standalone para una PWA instalable");

// Coherencia: el start_url debe estar dentro del scope declarado.
assert.ok(
  manifest.start_url === manifest.scope || manifest.start_url.startsWith(manifest.scope),
  "start_url debe estar dentro del scope declarado (misma historia de navegación)"
);

assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "manifest.icons debe declarar al menos un icono");

const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
assert.ok(sizes.includes("192x192"), "debe declarar un icono de 192x192");
assert.ok(sizes.includes("512x512"), "debe declarar un icono de 512x512");

// El layout debe enlazar el manifest para que el navegador lo detecte como instalable.
const layout = await readFile(resolve(root, "src/app/layout.tsx"), "utf8");
assert.match(layout, /manifest\.webmanifest/, "layout.tsx debe referenciar manifest.webmanifest");

// El AppShell debe existir y usar landmarks semanticos de accesibilidad.
const appShell = await readFile(resolve(root, "src/components/app-shell.tsx"), "utf8");
assert.match(appShell, /role="banner"/, "AppShell debe declarar un landmark banner");
assert.match(appShell, /role="main"/, "AppShell debe declarar un landmark main");
assert.match(appShell, /role="contentinfo"/, "AppShell debe declarar un landmark contentinfo");

console.log("manifest.spec.ts: PASS");
