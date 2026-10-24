import path from "node:path";
import { expect, test } from "@playwright/test";

// Capacidades de la semana 6 denegadas o ausentes: la captura debe completarse igual.
// No se usan sensores reales: se simula la falta de permisos y de API.

const SAMPLE_PHOTO = path.join(process.cwd(), "public", "icon-192.png");

test.use({ permissions: [] }); // ningún permiso concedido (geolocalización denegada)

test("sin cámara ni permiso de ubicación se guarda la inspección con respaldo", async ({ page }) => {
  // Navegador sin API de cámara: fuerza el respaldo por selector de archivos.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
  });

  await page.goto("/inspecciones/nueva");
  await page.getByLabel("Responsable").fill("Técnico Permisos");
  await page.getByLabel("Descripción").fill("E2E sintético: captura con permisos denegados.");

  // Cámara ausente → aviso y selector de archivos con una imagen sintética.
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Tomar foto/ }).click();
  await expect(page.getByText(/No se pudo abrir la cámara/)).toBeVisible();
  const chooser = await chooserPromise;
  await chooser.setFiles(SAMPLE_PHOTO);
  await expect(page.getByAltText("Vista previa de la evidencia")).toBeVisible();

  // Ubicación denegada → coordenadas sintéticas del campus, avisando al usuario.
  await page.getByRole("button", { name: /Agregar mi ubicación/ }).click();
  await expect(page.getByText(/ubicación aproximada del campus/)).toBeVisible();

  await page.getByRole("button", { name: "Guardar inspección" }).click();

  // La captura se completa: el detalle muestra la evidencia y la ubicación aproximada.
  await expect(page.getByRole("heading", { name: "Detalle de la inspección" })).toBeVisible();
  await expect(page.getByAltText(/Evidencia fotográfica/)).toBeVisible();
  await expect(page.getByText("(aproximada del campus)")).toBeVisible();
});

test("una captura inválida no se guarda y explica qué corregir", async ({ page }) => {
  await page.goto("/inspecciones/nueva");
  await page.getByLabel("Hallazgos").fill("-3");
  await page.getByRole("button", { name: "Guardar inspección" }).click();

  await expect(page).toHaveURL(/\/inspecciones\/nueva$/);
  await expect(page.getByText("Escribe el nombre de quien inspecciona.")).toBeVisible();
  await expect(page.getByText("Describe la inspección (mínimo 10 caracteres).")).toBeVisible();
  await expect(page.getByText("Usa un número entero entre 0 y 99.")).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem("utt_pwa_inspections_db:inspections"));
  expect(stored).toBeNull();
});
