import { expect, test, type Page } from "@playwright/test";
import { openWithServiceWorker, signInAs } from "./helpers";

// Cada pantalla debe abrir y ser usable sin conexión, aunque el usuario solo haya
// visitado el inicio con red. Se comprueba el título propio de cada pantalla para no
// confundirla con el inicio (que también lista inspecciones).

const SCREENS: Array<[string, string]> = [
  ["/", "Inspecciones de laboratorio"],
  ["/inspecciones", "Catálogo de inspecciones"],
  ["/inspecciones/nueva", "Nueva inspección"],
  ["/pendientes", "Pendientes de envío"],
  ["/ajustes", "Ajustes"],
  ["/inspecciones/inspection-002", "Detalle de la inspección"],
];

const pageTitle = (page: Page) => page.locator("main h2").first();

test("sin conexión, cada pantalla abre con su propio contenido", async ({ page, context }) => {
  await openWithServiceWorker(page);
  await context.setOffline(true);

  for (const [route, title] of SCREENS) {
    await page.goto(route);
    await expect(pageTitle(page), `pantalla ${route} sin conexión`).toHaveText(title);
  }
  await expect(page.locator("main")).toContainText("Laboratorio de Electrónica");

  // La pantalla es interactiva sin red: el formulario valida (requiere JavaScript cargado).
  await page.goto("/inspecciones/nueva");
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await expect(page.getByText("Escribe el nombre de quien inspecciona.")).toBeVisible();
});

test("sin conexión, el detalle de una inspección nueva abre desde Pendientes y tras recargar", async ({ page, context }) => {
  const summary = "E2E sintético: detalle sin conexión.";
  await signInAs(page, "inspector-a");
  await openWithServiceWorker(page);
  await context.setOffline(true);

  await page.goto("/inspecciones/nueva");
  await page.getByLabel("Responsable").fill("Técnico Offline");
  await page.getByLabel("Descripción").fill(summary);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await page.waitForURL(/\/inspecciones\/ver\?id=local-/);
  await expect(pageTitle(page)).toHaveText("Detalle de la inspección");
  await expect(page.getByText(summary)).toBeVisible();

  await page.goto("/pendientes");
  await page.getByRole("link", { name: "Laboratorio de Redes" }).first().click();
  await expect(pageTitle(page)).toHaveText("Detalle de la inspección");
  await expect(page.getByText(summary)).toBeVisible();

  await page.reload();
  await expect(pageTitle(page)).toHaveText("Detalle de la inspección");
  await expect(page.getByText(summary)).toBeVisible();
});
