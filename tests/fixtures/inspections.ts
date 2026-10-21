import type { StoredInspection, SyncQueueItem } from "../../src/lib/storage/schema";

// Fábricas de datos sintéticos compartidas por unit e integration.
export function makeInspection(overrides: Partial<StoredInspection> = {}): StoredInspection {
  return {
    id: "inspection-test-001",
    clientMutationId: "mut-001",
    location: "Laboratorio de Redes",
    inspector: "Técnica A",
    findings: 0,
    status: "pendiente_sync",
    updatedAt: 1_000,
    version: 1,
    payload: { summary: "Registro sintético de prueba" },
    ...overrides,
  };
}

export function makeQueueItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    mutationId: "mut-001",
    entityId: "inspection-test-001",
    operation: "CREATE",
    timestamp: 1_000,
    retryCount: 0,
    data: makeInspection(),
    ...overrides,
  };
}
