export interface StoredInspection {
  id: string;
  clientMutationId: string;
  location: string;
  inspector: string;
  findings: number;
  status: "borrador" | "pendiente_sync" | "sincronizado" | "conflicto";
  updatedAt: number;
  version: number;
  payload: Record<string, unknown>;
}

export interface SyncQueueItem {
  mutationId: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  timestamp: number;
  retryCount: number;
  data: Partial<StoredInspection>;
}

export const DB_CONFIG = {
  name: "utt_pwa_inspections_db",
  version: 1,
  stores: {
    inspections: "id, clientMutationId, status, updatedAt",
    queue: "mutationId, entityId, timestamp",
  },
} as const;