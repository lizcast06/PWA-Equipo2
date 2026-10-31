import { DB_CONFIG, StoredInspection, SyncQueueItem } from "./schema";
import { SyncQueue } from "../sync/queue";
import { getCurrentUser } from "../security/session";
import { ACCESS_ERRORS, authorize } from "../security/access";
import { validateForServer } from "../security/validation";
import { minimizeLocation, type MinimizedLocation, type RawCoordinates } from "../security/privacy";

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
  /** Solo la ubicación aproximada (semana 9, minimización): nunca la precisa del GPS. */
  coords?: MinimizedLocation;
  /** Motivo con el que el servidor rechazó el envío (400/401/403). */
  rejection?: ServerRejection;
}

/** Respuesta del servidor que rechaza un envío: no se reintenta sola, la persona debe corregir. */
export interface ServerRejection {
  status: 400 | 401 | 403;
  error: string;
}

export interface NewInspectionInput {
  location: string;
  inspector: string;
  findings: number;
  summary: string;
  photo?: string;
  coords?: RawCoordinates;
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
      // Defensa en profundidad: aunque la pantalla ya la minimiza, aquí se vuelve a aplicar.
      coords: input.coords ? minimizeLocation(input.coords) : undefined,
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
// Semana 9: antes de guardar autoriza (401/403) y valida (400) como lo haría una API real;
// si rechaza, el remoto NO cambia.
async function simulatedRemoteSync(item: SyncQueueItem): Promise<boolean | ServerRejection> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const remote = read<Record<string, Partial<StoredInspection>>>(KEYS.remote, {});
  const user = getCurrentUser();
  const record = { ownerId: item.data.ownerId, location: item.data.location ?? "" };

  const access = authorize(user, "create", record);
  if (!access.allowed) return { status: access.status, error: access.error };
  // Tampoco se puede sobrescribir en el remoto una inspección que ya es de otra persona.
  const existing = remote[item.entityId];
  if (existing) {
    const owner = authorize(user, "create", { ownerId: existing.ownerId, location: existing.location ?? "" });
    if (!owner.allowed) return { status: owner.status, error: owner.error };
  }
  const valid = validateForServer(item.data);
  if (!valid.ok) return { status: valid.status, error: valid.error };

  remote[item.entityId] = { ...item.data, status: "sincronizado" };
  write(KEYS.remote, remote);
  return true;
}

export type RemoteResponse =
  | { status: 200; record: Partial<StoredInspection> }
  | { status: 401 | 403 | 404; error: string };

// GET simulado de una inspección en el "remoto": solo la entrega a quien puede verla.
export async function fetchRemoteInspection(id: string): Promise<RemoteResponse> {
  const record = read<Record<string, Partial<StoredInspection>>>(KEYS.remote, {})[id];
  const user = getCurrentUser();
  if (!user) return { status: 401, error: ACCESS_ERRORS.noSession };
  if (!record) return { status: 404, error: "No se encontró la inspección." };
  const access = authorize(user, "read", { ownerId: record.ownerId, location: record.location ?? "" });
  if (!access.allowed) return { status: access.status, error: access.error };
  return { status: 200, record };
}

let syncInFlight: Promise<SyncSummary> | null = null;

export interface SyncSummary {
  processed: number;
  failed: number;
  pending: number;
  skipped: boolean;
}

// true = aceptado · false = fallo de transporte (se reintenta) · ServerRejection = 400/401/403 (no se reintenta).
export type RemoteSync = (item: SyncQueueItem) => Promise<boolean | ServerRejection>;

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
    // Un rechazo del servidor es una respuesta definitiva: sale de la cola sin reintentos.
    const rejected = new Map<string, ServerRejection>();
    const result = await queue.processQueue(async (item) => {
      const response = await remote(item);
      if (response === true) delivered.add(item.entityId);
      else if (response !== false) rejected.set(item.entityId, response);
      return response !== false;
    });
    const processed = result.processed - rejected.size;
    const failed = result.failed + rejected.size;
    const remaining = queue.getPendingItems();
    const remainingIds = new Set(remaining.map((item) => item.entityId));
    const failedIds = new Set(
      pendingBefore
        .filter((item) => !remainingIds.has(item.entityId) && !delivered.has(item.entityId))
        .map((item) => item.entityId)
    );

    const updated = read<StoredInspection[]>(KEYS.inspections, []).map((record) => {
      if (remainingIds.has(record.id)) return record;
      const rejection = rejected.get(record.id);
      if (rejection) return { ...record, status: "conflicto" as const, payload: { ...record.payload, rejection } };
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
  // Al reintentar se olvida el rechazo anterior: el servidor vuelve a decidir.
  const payload = { ...record.payload };
  delete payload.rejection;
  const retried: StoredInspection = { ...record, status: "pendiente_sync", updatedAt: Date.now(), payload };
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
