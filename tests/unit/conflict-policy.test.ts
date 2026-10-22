import { describe, expect, it } from "vitest";
import { resolveConflict } from "../../src/lib/sync/conflict-policy";
import { makeInspection } from "../fixtures/inspections";

describe("resolveConflict (política LWW con versión)", () => {
  it("gana la versión local cuando es mayor y marca conflicto", () => {
    const local = makeInspection({ version: 3, updatedAt: 100 });
    const remote = makeInspection({ version: 2, updatedAt: 999 });

    const result = resolveConflict(local, remote);

    expect(result.source).toBe("LOCAL");
    expect(result.hasConflict).toBe(true);
    expect(result.resolvedRecord).toBe(local);
  });

  it("gana la versión remota cuando es mayor aunque su fecha sea anterior", () => {
    const local = makeInspection({ version: 1, updatedAt: 999 });
    const remote = makeInspection({ version: 2, updatedAt: 100 });

    expect(resolveConflict(local, remote).source).toBe("REMOTE");
  });

  it("con la misma versión desempata por updatedAt (Last-Write-Wins) sin conflicto", () => {
    const local = makeInspection({ version: 2, updatedAt: 500 });
    const remote = makeInspection({ version: 2, updatedAt: 800 });

    const result = resolveConflict(local, remote);

    expect(result.source).toBe("REMOTE");
    expect(result.hasConflict).toBe(false);
  });

  it("en empate total conserva el registro local", () => {
    const local = makeInspection({ version: 2, updatedAt: 500 });
    const remote = makeInspection({ version: 2, updatedAt: 500 });

    expect(resolveConflict(local, remote).source).toBe("LOCAL");
  });
});
