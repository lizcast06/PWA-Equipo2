import { expect, test, type Page } from "@playwright/test";
import { openWithServiceWorker, signInAs } from "./helpers";

// Semana 10 · Actualización segura del Service Worker.
//
// Cómo se simula "otra versión publicada": el servidor de las pruebas es `next start` con un
// solo build, y `context.route` NO intercepta la descarga del script del worker (se comprobó:
// la versión nueva nunca llegaba). En cambio, sí intercepta las peticiones que hace el worker.
// Por eso la prueba registra el mismo worker con otra URL (`/sw.js?v=e2e-next`): para el
// navegador una URL distinta es una versión nueva y hace el ciclo real completo: instalar,
// precachear el shell, quedar en espera, activarse y tomar el control. La versión que controla
// se identifica por `scriptURL`.
// Límites: la "versión nueva" tiene el mismo código y el mismo número de caché, así que se
// prueba el flujo de actualización (espera, aviso, activación, datos, modo sin conexión), no un
// cambio real de archivos JS entre dos builds. Además, al volver a cargar con conexión, la app
// registra otra vez `/sw.js` y el navegador lo trata como otra versión; por eso las pruebas
// que recargan después de actualizar lo hacen sin conexión.

const NEXT_URL = "/sw.js?v=e2e-next";

/** Publica la "versión nueva": el navegador la descarga e instala como lo haría tras un deploy. */
async function publishNextWorker(page: Page) {
  await page.evaluate((url) => {
    void navigator.serviceWorker.register(url, { scope: "/" }).catch(() => undefined);
  }, NEXT_URL);
}

async function workerStates(page: Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const describe = (worker?: ServiceWorker | null) =>
      worker ? `${new URL(worker.scriptURL).pathname}${new URL(worker.scriptURL).search} ${worker.state}` : null;
    return {
      installing: describe(registration?.installing),
      waiting: describe(registration?.waiting),
      active: describe(registration?.active),
      controller: navigator.serviceWorker.controller ? describe(navigator.serviceWorker.controller).split(" ")[0] : null,
    };
  });
}

/** Igual que workerStates, pero devuelve null si la página está recargando (para usar en polls). */
const workerStatesOrNull = (page: Page) => workerStates(page).catch(() => null);

const OLD_ACTIVE = "/sw.js activated";
const NEXT_WAITING = `${NEXT_URL} installed`;
const NEXT_ACTIVE = `${NEXT_URL} activated`;

/** Cuenta los cambios de controlador y marca la página para detectar cualquier recarga. */
async function watchPage(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __controllerChanges: number; __sinRecarga: boolean };
    w.__controllerChanges = 0;
    w.__sinRecarga = true;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      w.__controllerChanges += 1;
    });
  });
}

const pageMarks = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __controllerChanges?: number; __sinRecarga?: boolean };
    return { controllerChanges: w.__controllerChanges ?? null, sinRecarga: w.__sinRecarga ?? false };
  });

/** Publica la versión nueva y espera a que quede instalada y en espera, con el aviso visible. */
async function installNextVersion(page: Page) {
  await publishNextWorker(page);
  await expect
    .poll(async () => (await workerStates(page)).waiting, { timeout: 45_000, message: "la versión nueva debe quedar en espera" })
    .toBe(NEXT_WAITING);
  await expect(page.getByRole("button", { name: "Actualizar" })).toBeVisible();
}

const pageTitle = (page: Page) => page.locator("main h2").first();

test("con una versión instalada, al aparecer otra sigue controlando la anterior y se ve el aviso", async ({ page }) => {
  await openWithServiceWorker(page);
  await expect(page.getByTestId("update-banner")).toHaveCount(0);
  await watchPage(page);

  await installNextVersion(page);

  await expect(page.getByTestId("update-banner")).toContainText("Hay una versión nueva");
  // La nueva ya terminó su precache y espera; la anterior sigue activa y controlando.
  expect(await workerStates(page)).toEqual({ installing: null, waiting: NEXT_WAITING, active: OLD_ACTIVE, controller: "/sw.js" });
  expect((await pageMarks(page)).controllerChanges).toBe(0);
});

test("sin pulsar Actualizar no cambia de versión ni recarga, y lo escrito en el formulario sigue ahí", async ({ page }) => {
  await signInAs(page, "inspector-a");
  await openWithServiceWorker(page, "/inspecciones/nueva");
  await page.getByLabel("Responsable").fill("Técnica sin recarga");
  await page.getByLabel("Descripción").fill("E2E sintético: texto escrito mientras llega una versión nueva.");
  await watchPage(page);

  await installNextVersion(page);
  // Margen para que una activación automática (el defecto controlado) alcance a ocurrir.
  await page.waitForTimeout(2_000);

  expect(await pageMarks(page)).toEqual({ controllerChanges: 0, sinRecarga: true });
  expect(await workerStates(page)).toEqual({ installing: null, waiting: NEXT_WAITING, active: OLD_ACTIVE, controller: "/sw.js" });
  await expect(page.getByLabel("Responsable")).toHaveValue("Técnica sin recarga");
  await expect(page.getByLabel("Descripción")).toHaveValue("E2E sintético: texto escrito mientras llega una versión nueva.");
});

test("al pulsar Actualizar se activa la nueva, recarga una vez y la inspección guardada sigue disponible", async ({ page, context }) => {
  const summary = "E2E sintético: inspección guardada antes de actualizar.";
  await signInAs(page, "inspector-a");
  await page.addInitScript(() => {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (entry?.type === "reload") {
      sessionStorage.setItem("e2e:reloads", String(Number(sessionStorage.getItem("e2e:reloads") ?? 0) + 1));
    }
  });
  await openWithServiceWorker(page, "/inspecciones/nueva");
  await installNextVersion(page);

  // Se guarda sin conexión para que quede pendiente en localStorage durante la actualización.
  await context.setOffline(true);
  await page.getByLabel("Responsable").fill("Técnica actualización");
  await page.getByLabel("Descripción").fill(summary);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await expect(page.getByText(summary)).toBeVisible();

  await page.getByRole("button", { name: "Actualizar" }).click();

  await expect
    .poll(() => workerStatesOrNull(page), { timeout: 15_000, message: "la versión nueva debe tomar el control" })
    .toEqual({ installing: null, waiting: null, active: NEXT_ACTIVE, controller: NEXT_URL });
  await expect(page.getByText(summary)).toBeVisible();
  await expect(page.getByTestId("update-banner")).toHaveCount(0);
  // Se cuentan solo las recargas (tipo "reload" de la Navigation Timing API): sin conexión,
  // Next.js a veces repite una navegación normal al hidratar y eso no es una recarga de la app.
  await page.waitForTimeout(1_000);
  expect(await page.evaluate(() => Number(sessionStorage.getItem("e2e:reloads") ?? 0)), "debe recargar exactamente una vez").toBe(1);

  // La recarga reabre sin conexión el detalle local (/inspecciones/ver?id=…, ruta obligatoria
  // del precache) servido por la versión nueva; muestra la inspección porque su JS lee localStorage.
  await expect(page).toHaveURL(/\/inspecciones\/ver\?id=local-/);
  await expect(page.getByRole("heading", { name: "Detalle de la inspección" })).toBeVisible();
  await expect(page.locator("main")).toContainText(summary);

  // Y en Pendientes sigue como pendiente de envío.
  await page.goto("/pendientes");
  await expect(page.getByText(summary)).toBeVisible();
  await expect(page.getByText("Pendiente de envío")).toBeVisible();
});

test("la app sigue abriendo sin conexión después de actualizar", async ({ page, context }) => {
  await openWithServiceWorker(page);
  await installNextVersion(page);

  await context.setOffline(true);
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Actualizar" }).click()]);
  await expect
    .poll(() => workerStatesOrNull(page), { timeout: 15_000 })
    .toEqual({ installing: null, waiting: null, active: NEXT_ACTIVE, controller: NEXT_URL });

  for (const [route, title] of [
    ["/", "Inspecciones de laboratorio"],
    ["/inspecciones", "Catálogo de inspecciones"],
    ["/inspecciones/nueva", "Nueva inspección"],
    ["/pendientes", "Pendientes de envío"],
    ["/ajustes", "Ajustes"],
  ]) {
    await page.goto(route);
    await expect(pageTitle(page), `pantalla ${route} sin conexión tras actualizar`).toHaveText(title);
  }
  // Interactiva: la validación del formulario necesita el JavaScript precacheado.
  await page.goto("/inspecciones/nueva");
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await expect(page.getByText("Escribe el nombre de quien inspecciona.")).toBeVisible();
  expect((await workerStates(page)).controller).toBe(NEXT_URL);
});

test("si falla el precache de una pantalla obligatoria, la versión nueva no se instala y sigue la anterior", async ({ page, context }) => {
  await openWithServiceWorker(page);
  await watchPage(page);

  // Se publica la versión nueva, pero /pendientes (obligatoria) responde 500 al precachearla.
  const failed: string[] = [];
  await context.route("**/pendientes", (route) => {
    failed.push(route.request().url());
    return route.fulfill({ status: 500, body: "fallo simulado" });
  });
  await publishNextWorker(page);

  // La versión nueva sí se intentó instalar (pidió /pendientes) y terminó descartada.
  await expect.poll(() => failed.length, { timeout: 45_000, message: "el worker nuevo debe intentar precachear" }).toBeGreaterThan(0);
  await expect
    .poll(() => workerStates(page), { timeout: 45_000, message: "la versión nueva debe descartarse" })
    .toEqual({ installing: null, waiting: null, active: OLD_ACTIVE, controller: "/sw.js" });
  await expect(page.getByTestId("update-banner")).toHaveCount(0);
  expect((await pageMarks(page)).controllerChanges).toBe(0);

  // La versión anterior sigue completa: Pendientes abre sin conexión desde su caché.
  await context.unroute("**/pendientes");
  await context.setOffline(true);
  await page.goto("/pendientes");
  await expect(pageTitle(page)).toHaveText("Pendientes de envío");
});

test("con dos pestañas abiertas, Actualizar en la segunda también recarga con la versión nueva", async ({ page, context }) => {
  await openWithServiceWorker(page);
  const second = await context.newPage();
  await second.goto("/inspecciones");
  await expect.poll(() => second.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await installNextVersion(page);
  await expect(second.getByRole("button", { name: "Actualizar" })).toBeVisible();

  // Sin conexión, para que al recargar la app no registre otra vez /sw.js (ver límites arriba).
  await context.setOffline(true);
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Actualizar" }).click()]);
  await expect
    .poll(() => workerStatesOrNull(page), { timeout: 15_000 })
    .toEqual({ installing: null, waiting: null, active: NEXT_ACTIVE, controller: NEXT_URL });

  // La segunda pestaña ya está controlada por la versión nueva, pero su página es la anterior.
  await second.evaluate(() => {
    (window as unknown as { __paginaAnterior: boolean }).__paginaAnterior = true;
  });
  await Promise.all([
    second.waitForEvent("load", { timeout: 10_000 }),
    second.getByRole("button", { name: "Actualizar" }).click(),
  ]);
  expect(await second.evaluate(() => (window as unknown as { __paginaAnterior?: boolean }).__paginaAnterior ?? false)).toBe(false);
  await expect(pageTitle(second)).toHaveText("Catálogo de inspecciones");
  await expect(second.getByTestId("update-banner")).toHaveCount(0);
  expect((await workerStates(second)).controller).toBe(NEXT_URL);
});
