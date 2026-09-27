import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const catalog = await readFile(resolve(root, "src/app/inspecciones/page.tsx"), "utf8");
const detail = await readFile(resolve(root, "src/app/inspecciones/[id]/page.tsx"), "utf8");
const loading = await readFile(resolve(root, "src/components/loading-state.tsx"), "utf8");
const decision = await readFile(resolve(root, "docs/rendering-decision.md"), "utf8");

// El catálogo debe ser Server Component: si se marca "use client" deja de ser SSR.
assert.equal(
  /^\s*"use client"/.test(catalog),
  false,
  "src/app/inspecciones/page.tsx no debe ser Client Component"
);
assert.match(catalog, /from ["']\.\.\/\.\.\/lib\/data\/inspections["']/, "el catálogo SSR debe leer inspections en el servidor");
assert.match(catalog, /SSR/, "el catálogo debe declararse como ruta SSR");
assert.match(catalog, /role="alert"|No hay inspecciones/, "el catálogo debe modelar vacío o error");
assert.match(catalog, /\/inspecciones\/\$\{item\.id\}|\/inspecciones\/\$\{/, "el catálogo debe enlazar al detalle dinámico");

// El detalle debe ser CSR con estados de carga y error.
assert.match(detail, /["']use client["']/, "src/app/inspecciones/[id]/page.tsx debe ser Client Component");
assert.match(detail, /useState/, "el detalle CSR debe guardar estado de cliente");
assert.match(detail, /useEffect/, "el detalle CSR debe consultar después de hidratar");
assert.match(detail, /LoadingState/, "el detalle debe usar el estado de carga reutilizable");
assert.match(detail, /isLoading/, "el detalle debe exponer un estado de carga explícito");
assert.match(detail, /setError|error/, "el detalle debe modelar error de recuperación");
assert.match(detail, /role="alert"/, "el error CSR debe ser anunciable");

// El estado de carga es componente propio, no un spinner suelto en la página.
assert.match(loading, /role="status"/, "LoadingState debe anunciar el estado a tecnologías de asistencia");
assert.match(loading, /aria-live/, "LoadingState debe usar aria-live");

// La decisión no puede ser un archivo vacío (anti-gaming del kit).
assert.ok(decision.trim().length > 80, "docs/rendering-decision.md debe justificar SSR vs CSR");
assert.match(decision, /SSR/i, "la decisión debe mencionar SSR");
assert.match(decision, /CSR/i, "la decisión debe mencionar CSR");

console.log("rendering.spec.ts: PASS");
