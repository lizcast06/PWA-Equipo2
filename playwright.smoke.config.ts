import { defineConfig, devices } from "@playwright/test";

// Smoke test del release. Con SMOKE_URL se ejecuta contra lo ya publicado (por ejemplo, el
// contenedor); sin ella levanta el build local con next start.
const PORT = 3110;
const baseURL = process.env.SMOKE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests",
  testMatch: "smoke.spec.ts",
  outputDir: "test-results/smoke",
  timeout: 90_000,
  reporter: [["list"], ["junit", { outputFile: "test-results/smoke-junit.xml" }]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.SMOKE_URL
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
