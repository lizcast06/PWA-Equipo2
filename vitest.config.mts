import { defineConfig } from "vitest/config";

// Unit, integración y seguridad (tests/security.spec.ts, semana 9) con Vitest. Las pruebas E2E viven en tests/e2e y las corre Playwright.
// Las suites heredadas (tests/*.spec.ts) se ejecutan con node desde "test:legacy".
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/security.spec.ts"],
    environment: "node",
    reporters: ["default", "junit"],
    outputFile: { junit: "test-results/vitest-junit.xml" },
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      reporter: ["text", "html", "json-summary", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
