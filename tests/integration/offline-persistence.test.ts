// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncQueueItem } from "../../src/lib/storage/schema";
import {
  getLocalInspections,
  getPendingQueue,
  saveNewInspection,
  syncPendingInspections,
  type NewInspectionInput,
} from "../../src/lib/storage/local-store";

// Integra local-store (localStorage real de jsdom) + SyncQueue + un remoto controlado.
const QUEUE_KEY = "utt_pwa_inspections_db:queue";

const CAPTURE: NewInspectionInput = {
  location: "Laboratorio de Química",
  inspector: "Técnica B",
  findings: 1,
  summary: "Captura sintética en el sótano sin señal",
};

// El remoto guarda CADA llamada en un arreglo (no por id), para que un envío
// duplicado se vea. Puede fallar las primeras `failures` llamadas.
function createRemoteFixture(failures = 0) {
  const received: SyncQueueItem[] = [];
  let calls = 0;
  const send = vi.fn(async (item: SyncQueueItem) => {
    calls += 1;
    if (calls <= failures) return false;
    received.push(item);
    return true;
  });
  return { send, received };
}

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("persistencia offline y reintentos de sincronización", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("guardar sin conexión persiste la inspección y su operación en la cola", async () => {
    setOnline(false);
    const remote = createRemoteFixture();

    const saved = saveNewInspection(CAPTURE);
    const summary = await syncPendingInspections(remote.send);

    expect(getLocalInspections()).toEqual([
      expect.objectContaining({ id: saved.id, location: CAPTURE.location, status: "pendiente_sync" }),
    ]);
    expect(getPendingQueue()).toEqual([
      expect.objectContaining({ entityId: saved.id, mutationId: saved.clientMutationId, operation: "CREATE" }),
    ]);
    expect(summary).toEqual({ processed: 0, failed: 0, pending: 1, skipped: true });
    expect(remote.send).not.toHaveBeenCalled();
  });

  it("lo guardado sobrevive a una recarga: se lee de nuevo desde localStorage", () => {
    setOnline(false);
    const saved = saveNewInspection(CAPTURE);

    // Una recarga pierde la memoria de la página; solo queda lo que está en localStorage.
    const reloaded = JSON.parse(JSON.stringify(localStorage)) as Record<string, string>;
    localStorage.clear();
    Object.entries(reloaded).forEach(([key, value]) => localStorage.setItem(key, value));

    expect(getLocalInspections().map((item) => item.id)).toEqual([saved.id]);
    expect(getPendingQueue()).toHaveLength(1);
  });

  it("al reconectar se sincroniza: queda sincronizada y la cola vacía", async () => {
    setOnline(false);
    const saved = saveNewInspection(CAPTURE);
    setOnline(true);
    const remote = createRemoteFixture();

    const summary = await syncPendingInspections(remote.send);

    expect(summary).toEqual({ processed: 1, failed: 0, pending: 0, skipped: false });
    expect(getLocalInspections()).toEqual([expect.objectContaining({ id: saved.id, status: "sincronizado" })]);
    expect(getPendingQueue()).toEqual([]);
    expect(remote.received.map((item) => item.entityId)).toEqual([saved.id]);
  });

  it("reintentar la misma operación (duplicada en la cola) no crea un duplicado en el remoto", async () => {
    setOnline(true);
    const saved = saveNewInspection(CAPTURE);
    // Doble clic / reintento: la misma operación aparece dos veces en la cola.
    const [operation] = getPendingQueue();
    localStorage.setItem(QUEUE_KEY, JSON.stringify([operation, { ...operation }]));
    const remote = createRemoteFixture();

    await syncPendingInspections(remote.send);
    await syncPendingInspections(remote.send); // segundo intento del usuario

    expect(remote.received).toHaveLength(1);
    expect(remote.received[0].mutationId).toBe(saved.clientMutationId);
    expect(getPendingQueue()).toEqual([]);
  });

  it("si el remoto falla, la inspección sigue pendiente y el reintento la envía una sola vez", async () => {
    setOnline(true);
    const saved = saveNewInspection(CAPTURE);
    const remote = createRemoteFixture(1);

    const first = await syncPendingInspections(remote.send);

    expect(first).toEqual({ processed: 0, failed: 0, pending: 1, skipped: false });
    expect(getLocalInspections()[0].status).toBe("pendiente_sync");
    expect(getPendingQueue()).toEqual([expect.objectContaining({ mutationId: saved.clientMutationId, retryCount: 1 })]);

    const second = await syncPendingInspections(remote.send);

    expect(second).toEqual({ processed: 1, failed: 0, pending: 0, skipped: false });
    expect(remote.send).toHaveBeenCalledTimes(2);
    expect(remote.received).toHaveLength(1);
    expect(getLocalInspections()[0].status).toBe("sincronizado");
  });

  it("tras 3 rechazos del remoto la inspección queda en conflicto y sale de la cola", async () => {
    setOnline(true);
    saveNewInspection(CAPTURE);
    const remote = createRemoteFixture(3);

    await syncPendingInspections(remote.send);
    await syncPendingInspections(remote.send);
    const last = await syncPendingInspections(remote.send);

    expect(last).toEqual({ processed: 0, failed: 1, pending: 0, skipped: false });
    expect(getLocalInspections()[0].status).toBe("conflicto");
    expect(getPendingQueue()).toEqual([]);
    expect(remote.received).toHaveLength(0);
  });

  it("dos sincronizaciones al mismo tiempo (al abrir la app y al volver la red) envían una sola vez", async () => {
    setOnline(true);
    saveNewInspection(CAPTURE);
    const remote = createRemoteFixture();

    await Promise.all([syncPendingInspections(remote.send), syncPendingInspections(remote.send)]);

    expect(remote.received).toHaveLength(1);
  });
});
