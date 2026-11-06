import { expect, test } from "@playwright/test";
import { openWithServiceWorker, signInAs } from "./e2e/helpers";

// Smoke test del release (semana 10): pocas pruebas rápidas que responden "¿esta versión
// publicada sirve?" antes de darla por buena. Se ejecuta contra SMOKE_URL (el contenedor).
// EXPECTED_COMMIT, si se define, comprueba que responde justo la versión que se quiso publicar.

test("health check: responde ok e identifica la versión publicada", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");

  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  expect(body.commit).toBeTruthy();
  if (process.env.EXPECTED_COMMIT) expect(body.commit).toBe(process.env.EXPECTED_COMMIT);
});

test("pantallas clave cargan y la versión se ve en Ajustes", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const [route, title] of [
    ["/", "Inspecciones de laboratorio"],
    ["/inspecciones", "Catálogo de inspecciones"],
    ["/inspecciones/nueva", "Nueva inspección"],
    ["/pendientes", "Pendientes de envío"],
    ["/ajustes", "Ajustes"],
  ]) {
    await page.goto(route);
    await expect(page.locator("main h2").first(), `pantalla ${route}`).toHaveText(title);
  }

  const { version } = await (await request.get("/api/health")).json();
  await expect(page.getByText(`Versión ${version}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("archivos de la PWA y encabezados de seguridad se publican", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");
  for (const path of ["/sw.js", "/icon-192.png", "/icon-512.png", "/robots.txt"]) {
    expect((await request.get(path)).ok(), path).toBe(true);
  }

  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("flujo crítico: capturar sin conexión, reconectar y queda una sola inspección", async ({ page, context }) => {
  const summary = "Smoke sintético: la versión publicada captura y sincroniza.";
  await signInAs(page, "inspector-a");
  await openWithServiceWorker(page, "/inspecciones/nueva");

  await context.setOffline(true);
  await page.getByLabel("Responsable").fill("Técnica Smoke");
  await page.getByLabel("Descripción").fill(summary);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
  await expect(page.getByRole("heading", { name: "Detalle de la inspección" })).toBeVisible();

  await context.setOffline(false);
  await page.goto("/pendientes");
  await expect(page.getByText("Todo está al día ✓")).toBeVisible({ timeout: 15_000 });

  const remote = await page.evaluate(() => JSON.parse(localStorage.getItem("utt_pwa_inspections_db:remote") ?? "{}"));
  const sent = Object.values(remote as Record<string, { payload?: { summary?: string } }>).filter(
    (item) => item.payload?.summary === summary
  );
  expect(sent).toHaveLength(1);
});
