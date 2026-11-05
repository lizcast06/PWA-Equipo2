import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La imagen construida sin --build-arg debe reportar la misma versión en sus etiquetas y en /api/health.
describe("versión de la imagen Docker", () => {
  it("el valor por defecto del Dockerfile coincide con package.json", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const { version } = JSON.parse(readFileSync("package.json", "utf8"));

    expect(dockerfile.match(/^ARG APP_VERSION=(.+)$/m)?.[1]?.trim()).toBe(version);
  });
});
