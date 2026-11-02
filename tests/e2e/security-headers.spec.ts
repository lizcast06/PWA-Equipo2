
import { test, expect } from "@playwright/test";

test.describe("Seguridad · Encabezados HTTP y CSP (Semana 09)", () => {
  test("debe incluir encabezados de seguridad y CSP en la ruta raíz", async ({ page }) => {
    const response = await page.goto("/");

    // Comprobar que existe una respuesta HTTP
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // Validar Content-Security-Policy
    const csp = headers["content-security-policy"] || "";
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");

    // Validar X-Content-Type-Options
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // Validar que la página renderiza correctamente
    await expect(page).toHaveTitle(/PWA/i);
  });

  test("debe aplicar encabezados en /inspecciones/nueva y permitir el uso del formulario", async ({ page }) => {
    const response = await page.goto("/inspecciones/nueva");

    // Comprobar que existe una respuesta HTTP
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // Validar encabezados
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // Comprobar que el formulario es visible bajo la CSP
    await expect(page.locator("form")).toBeVisible();
  });
});
