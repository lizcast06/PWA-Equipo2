import path from "node:path";
import { expect, test } from "@playwright/test";
import { APP_PREFIX, openWithServiceWorker } from "./helpers";

// Semana 9 · riesgo R3 (diapositivas 3 y 13): tableta extraviada o compartida.
// Prueba negativa: después de cerrar sesión, sin conexión, NO debe quedar ni verse nada
// de lo que capturó la persona (inspección, foto, ubicación, cola, sesión ni caché de datos).

const SUMMARY = "E2E sintético: inspección privada antes de cerrar sesión.";
const SAMPLE_PHOTO = path.join(process.cwd(), "public", "icon-192.png");

test.use({ permissions: ["geolocation"], geolocation: { latitude: 18.463312, longitude: -97.391645 } });

test("cerrar sesión borra lo capturado y sin conexión no queda nada visible ni guardado", async ({ page, context }) => {
  await openWithServiceWorker(page, "/ajustes");

  // 1. Iniciar sesión con un usuario sintético.
  await page.getByLabel("Usuario de la sesión").selectOption("inspector-a");
  await expect(page.getByText("Sesión iniciada como Técnica A")).toBeVisible();

  // 2. Capturar una inspección con foto y ubicación.
  await page.goto("/inspecciones/nueva");
  await page.getByLabel("Responsable").fill("Técnica A");
  await page.getByLabel("Descripción").fill(SUMMARY);
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Elegir de la galería" }).click();
  await (await chooserPromise).setFiles(SAMPLE_PHOTO);
  await expect(page.getByAltText("Vista previa de la evidencia")).toBeVisible();
  await page.getByRole("button", { name: /Agregar mi ubicación/ }).click();
  await expect(page.getByRole("button", { name: "Quitar ubicación" })).toBeVisible();
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await page.waitForURL(/\/inspecciones\/ver\?id=local-/);
  const detailUrl = page.url();
  await expect(page.getByText(SUMMARY)).toBeVisible();

  // Control: ANTES de cerrar sesión la inspección sí está en el dispositivo.
  const before = await page.evaluate((prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)), APP_PREFIX);
  expect(before.length).toBeGreaterThan(0);

  // 3. Cerrar sesión (acepta la confirmación).
  await page.goto("/ajustes");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByText(/Sesión cerrada\. Se borraron 1 inspección/)).toBeVisible();

  // 4. Nada de la app queda en localStorage (inspecciones, cola, remoto simulado, sesión).
  const after = await page.evaluate((prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)), APP_PREFIX);
  expect(after).toEqual([]);

  // 5. Ninguna caché contiene la inspección ni URLs con el id de la sesión cerrada.
  const leaked = await page.evaluate(async (summary) => {
    const hits: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (request.url.includes("?id=")) hits.push(`${name}: ${request.url}`);
        const response = await cache.match(request);
        const type = response?.headers.get("content-type") ?? "";
        if (response && (type.includes("text") || type.includes("json"))) {
          if ((await response.text()).includes(summary)) hits.push(`${name}: ${request.url}`);
        }
      }
    }
    return hits;
  }, SUMMARY);
  expect(leaked).toEqual([]);

  // 6. Sin conexión, ninguna pantalla muestra la inspección.
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.locator("main h2").first()).toHaveText("Inspecciones de laboratorio");
  await expect(page.getByText(SUMMARY)).toHaveCount(0);

  await page.goto("/pendientes");
  await expect(page.getByText("Todo está al día ✓")).toBeVisible();
  await expect(page.getByText(SUMMARY)).toHaveCount(0);

  await page.goto(detailUrl);
  await expect(page.getByRole("alert").filter({ hasText: "No se encontró registro" })).toBeVisible();
  await expect(page.getByText(SUMMARY)).toHaveCount(0);
});

// Semana 9 · riesgo R4 (diapositiva 13): el Service Worker no debe guardar "cualquier GET".
// Prueba negativa: al abrir el detalle de una inspección propia (URL con ?id=) y navegar,
// la caché dinámica no conserva esas pantallas ni las respuestas de navegación del cliente.
test("el Service Worker no guarda pantallas con datos de la sesión", async ({ page }) => {
  await page.addInitScript((key) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, "inspector-b");
  }, `${APP_PREFIX}session`);
  await openWithServiceWorker(page, "/inspecciones/nueva");

  await page.getByLabel("Responsable").fill("Técnico B");
  await page.getByLabel("Descripción").fill("E2E sintético: detalle que no debe quedar en caché.");
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await page.waitForURL(/\/inspecciones\/ver\?id=local-/);
  await page.reload(); // navegación completa controlada por el Service Worker
  await expect(page.getByRole("heading", { name: "Detalle de la inspección" })).toBeVisible();
  await page.getByRole("link", { name: "Pendientes" }).first().click();
  await expect(page.locator("main h2").first()).toHaveText("Pendientes de envío");

  const stored = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });
  expect(stored.length).toBeGreaterThan(0); // el shell sí está en caché
  expect(stored.filter((url) => url.includes("?id=") || url.includes("_rsc="))).toEqual([]);
});
