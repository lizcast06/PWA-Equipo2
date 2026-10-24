import { expect, test } from "@playwright/test";

// Flujo crítico: el inspector abre la app, consulta el catálogo y revisa un detalle.

test("la página inicial muestra inspecciones sintéticas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Inspecciones de laboratorio" })).toBeVisible();
  await expect(page.getByText("Laboratorio de Redes").first()).toBeVisible();
});

test("del catálogo SSR se navega al detalle CSR", async ({ page }) => {
  await page.goto("/inspecciones");
  await expect(page.getByRole("heading", { name: "Catálogo de inspecciones" })).toBeVisible();

  await page.locator('a[href="/inspecciones/inspection-002"]').click();

  await expect(page).toHaveURL(/\/inspecciones\/inspection-002$/);
  await expect(page.getByText("Laboratorio de Electrónica")).toBeVisible();
});

test("un identificador inexistente muestra un error anunciable", async ({ page }) => {
  await page.goto("/inspecciones/no-existe");
  // Next.js agrega su propio role="alert" vacío (route announcer); se filtra por contenido.
  await expect(page.getByRole("alert").filter({ hasText: "no-existe" })).toBeVisible();
});

test("el manifest es accesible para instalar la PWA", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect((await response.json()).display).toBe("standalone");
});

// El escenario sin conexión vive en offline-flow.spec.ts y las capacidades denegadas en device-denied.spec.ts.
