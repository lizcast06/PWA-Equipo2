import { expect, type Page } from "@playwright/test";

export const SESSION_KEY = "utt_pwa_inspections_db:session";
export const APP_PREFIX = "utt_pwa_inspections_db:";

/** Inicia sesión con un usuario sintético antes de que cargue la app (semana 9: las capturas tienen dueño). */
export async function signInAs(page: Page, userId: string) {
  await page.addInitScript(
    ([key, id]) => {
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, id);
    },
    [SESSION_KEY, userId] as const
  );
}

/** Abre la app y espera a que el Service Worker controle la página (necesario para probar sin red). */
export async function openWithServiceWorker(page: Page, path = "/") {
  await page.goto(path);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
  }
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}
