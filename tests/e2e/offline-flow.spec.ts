import { expect, test } from "@playwright/test";
import { openWithServiceWorker, signInAs } from "./helpers";

// Flujo crítico de la semana 8 desde la interfaz:
// crear → guardar sin conexión → recargar → reconectar → sincronizar sin duplicar.

const REMOTE_KEY = "utt_pwa_inspections_db:remote";
const SUMMARY = "E2E sintético: revisión de extintores sin conexión.";

test("crear sin conexión, recargar y sincronizar al reconectar sin duplicados", async ({ page, context }) => {
  await signInAs(page, "inspector-a");
  await openWithServiceWorker(page);
  await expect(page.getByText("Listo sin conexión")).toBeVisible();

  await page.getByRole("link", { name: "+ Nueva inspección" }).click();
  await expect(page.getByRole("heading", { name: "Nueva inspección" })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("Sin conexión", { exact: true })).toBeVisible();

  await page.getByLabel("Responsable").fill("Técnica E2E");
  await page.getByLabel("Hallazgos").fill("1");
  await page.getByLabel("Descripción").fill(SUMMARY);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  // Al guardar, la app abre el detalle (vista que funciona sin red); se espera para no competir
  // con esa navegación y se comprueba que es el detalle real y no otra pantalla.
  await page.waitForURL(/\/inspecciones\/ver\?id=local-/);
  await expect(page.getByRole("heading", { name: "Detalle de la inspección" })).toBeVisible();
  await expect(page.getByText(SUMMARY)).toBeVisible();
  await expect(page.getByText("Pendiente de envío")).toBeVisible();

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
