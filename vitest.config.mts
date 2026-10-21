import { defineConfig } from "vitest/config";

// Unit e integración con Vitest. Las pruebas E2E viven en tests/e2e y las corre Playwright.
// Las suites heredadas (tests/*.spec.ts) se ejecutan con node desde "test:legacy".
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    reporters: ["default"],
    restoreMocks: true,
  },
});
