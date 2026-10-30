import { DB_CONFIG, StoredInspection, SyncQueueItem } from "./schema";
import { SyncQueue } from "../sync/queue";
import { getCurrentUser } from "../security/session";

// Persistencia local en el dispositivo (localStorage) para las inspecciones
// capturadas en campo y su cola de sincronización.
const KEYS = {
  inspections: `${DB_CONFIG.name}:inspections`,
  queue: `${DB_CONFIG.name}:queue`,
  remote: `${DB_CONFIG.name}:remote`,
} as const;

export const STORE_CHANGED_EVENT = "inspecciones:store-changed";

export interface LocalInspectionPayload {
  summary: string;
  date: string;
  photo?: string;
  coords?: { latitude: number; longitude: number; accuracy: number; synthetic: boolean };
}

export interface NewInspectionInput {
  location: string;
  inspector: string;
  findings: number;
  summary: string;
  photo?: string;
  coords?: LocalInspectionPayload["coords"];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyChange(): void {
  if (isBrowser()) window.dispatchEvent(new Event(STORE_CHANGED_EVENT));
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function getLocalInspections(): StoredInspection[] {
  return read<StoredInspection[]>(KEYS.inspections, []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getLocalInspection(id: string): StoredInspection | undefined {
  return getLocalInspections().find((item) => item.id === id);
}

export function getPendingQueue(): SyncQueueItem[] {
  return read<SyncQueueItem[]>(KEYS.queue, []);
}

export function saveNewInspection(input: NewInspectionInput): StoredInspection {
  const now = Date.now();
  const mutationId = createId("mut");
  const record: StoredInspection = {
    id: createId("local"),
    clientMutationId: mutationId,
    location: input.location.trim(),
    inspector: input.inspector.trim(),
    findings: input.findings,
    status: "pendiente_sync",
    updatedAt: now,
    version: 1,
    ownerId: getCurrentUser()?.id,
    payload: {
      summary: input.summary.trim(),
      date: new Date(now).toISOString().slice(0, 10),
      photo: input.photo,
      coords: input.coords,
    } satisfies LocalInspectionPayload,
  };

  const queueItem: SyncQueueItem = {
    mutationId,
    entityId: record.id,
    operation: "CREATE",
    timestamp: now,
    retryCount: 0,
    data: record,
  };

  // Si el almacenamiento se llena (fotos grandes) se propaga el error al formulario.
  write(KEYS.inspections, [record, ...read<StoredInspection[]>(KEYS.inspections, [])]);
  write(KEYS.queue, [...getPendingQueue(), queueItem]);
  notifyChange();
  return record;
}

// Servidor simulado: guarda en otra llave para representar el "remoto".
// Falla si el dispositivo está sin conexión, igual que una petición real.
async function simulatedRemoteSync(item: SyncQueueItem): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const remote = read<Record<string, Partial<StoredInspection>>>(KEYS.remote, {});
  remote[item.entityId] = { ...item.data, status: "sincronizado" };
  write(KEYS.remote, remote);
  return true;
}

let syncInFlight: Promise<SyncSummary> | null = null;

export interface SyncSummary {
  processed: number;
  failed: number;
  pending: number;
  skipped: boolean;
}

export type RemoteSync = (item: SyncQueueItem) => Promise<boolean>;

// `remote` es opcional: la app usa el servidor simulado y las pruebas inyectan un fixture.
export function syncPendingInspections(remote: RemoteSync = simulatedRemoteSync): Promise<SyncSummary> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const pendingBefore = getPendingQueue();
    if (pendingBefore.length === 0 || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return { processed: 0, failed: 0, pending: pendingBefore.length, skipped: true };
    }

    const queue = new SyncQueue();
    pendingBefore.forEach((item) => queue.enqueue(item));
    // Se anota lo que el remoto aceptó en esta corrida (sea el simulado o uno inyectado).
    const delivered = new Set<string>();
    const { processed, failed } = await queue.processQueue(async (item) => {
      const accepted = await remote(item);
      if (accepted) delivered.add(item.entityId);
      return accepted;
    });
    const remaining = queue.getPendingItems();
    const remainingIds = new Set(remaining.map((item) => item.entityId));
    const failedIds = new Set(
      pendingBefore
        .filter((item) => !remainingIds.has(item.entityId) && !delivered.has(item.entityId))
        .map((item) => item.entityId)
    );

    const updated = read<StoredInspection[]>(KEYS.inspections, []).map((record) => {
      if (remainingIds.has(record.id)) return record;
      if (failedIds.has(record.id)) return { ...record, status: "conflicto" as const };
      if (record.status === "pendiente_sync") return { ...record, status: "sincronizado" as const };
      return record;
    });

    write(KEYS.inspections, updated);
    write(KEYS.queue, remaining);
    notifyChange();
    return { processed, failed, pending: remaining.length, skipped: false };
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

export function retryInspection(id: string): void {
  const record = getLocalInspection(id);
  if (!record) return;
  const retried: StoredInspection = { ...record, status: "pendiente_sync", updatedAt: Date.now() };
  write(
    KEYS.inspections,
    read<StoredInspection[]>(KEYS.inspections, []).map((item) => (item.id === id ? retried : item))
  );
  const others = getPendingQueue().filter((item) => item.entityId !== id);
  write(KEYS.queue, [
    ...others,
    {
      mutationId: createId("mut"),
      entityId: id,
      operation: "CREATE",
      timestamp: Date.now(),
      retryCount: 0,
      data: retried,
    } satisfies SyncQueueItem,
  ]);
  notifyChange();
}

export function clearLocalData(): void {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  notifyChange();
}
