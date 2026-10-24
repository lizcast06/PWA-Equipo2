import { expect, test, type Page } from "@playwright/test";

// Flujo crítico de la semana 8 desde la interfaz:
// crear → guardar sin conexión → recargar → reconectar → sincronizar sin duplicar.

const REMOTE_KEY = "utt_pwa_inspections_db:remote";
const SUMMARY = "E2E sintético: revisión de extintores sin conexión.";

async function waitForServiceWorkerControl(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // La primera carga no queda controlada hasta clients.claim(); se recarga una vez.
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
  }
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test("crear sin conexión, recargar y sincronizar al reconectar sin duplicados", async ({ page, context }) => {
  await waitForServiceWorkerControl(page);
  await expect(page.getByText("Listo sin conexión")).toBeVisible();

  await page.getByRole("link", { name: "+ Nueva inspección" }).click();
  await expect(page.getByRole("heading", { name: "Nueva inspección" })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("Sin conexión", { exact: true })).toBeVisible();

  await page.getByLabel("Responsable").fill("Técnica E2E");
  await page.getByLabel("Hallazgos").fill("1");
  await page.getByLabel("Descripción").fill(SUMMARY);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  // Al guardar, la app redirige al detalle; se espera para no competir con esa navegación.
  await page.waitForURL(/\/inspecciones\/local-/);
  await page.waitForLoadState("load");

  await page.goto("/pendientes");
  await expect(page.getByText("Pendiente de envío")).toBeVisible();
  await expect(page.getByText(SUMMARY)).toBeVisible();

  // Recargar sin red: la inspección no se pierde.
  await page.reload();
  await expect(page.getByText(SUMMARY)).toBeVisible();
  await expect(page.getByText("Pendiente de envío")).toBeVisible();

  // Reconectar: se sincroniza sola y queda una sola.
  await context.setOffline(false);
  await expect(page.getByText("Todo está al día ✓")).toBeVisible({ timeout: 15_000 });

  const remote = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), REMOTE_KEY);
  const synced = Object.values(remote as Record<string, { payload?: { summary?: string } }>).filter(
    (item) => item.payload?.summary === SUMMARY
  );
  expect(synced).toHaveLength(1);
});
