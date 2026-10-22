import { describe, expect, it } from "vitest";
import { SyncQueue } from "../../src/lib/sync/queue";
import type { StoredInspection, SyncQueueItem } from "../../src/lib/storage/schema";
import { makeInspection, makeQueueItem } from "../fixtures/inspections";

// Integra SyncQueue + resolveConflict con un "servidor" en memoria que simula
// conectividad intermitente, como ocurre en los laboratorios.
function createFlakyRemote(failuresBeforeSuccess: number) {
  const store = new Map<string, Partial<StoredInspection>>();
  let calls = 0;
  const send = async (item: SyncQueueItem) => {
    calls += 1;
    if (calls <= failuresBeforeSuccess) throw new Error("timeout de red");
    store.set(item.entityId, item.data);
    return true;
  };
  return { send, store, calls: () => calls };
}

describe("flujo de sincronización offline → online", () => {
  it("una inspección capturada sin red llega al servidor tras reintentos y sin duplicados", async () => {
    const queue = new SyncQueue();
    const remote = createFlakyRemote(2);

    queue.enqueue(makeQueueItem({ mutationId: "m-1" }));
    queue.enqueue(makeQueueItem({ mutationId: "m-1" })); // doble clic del usuario

    await queue.processQueue(remote.send); // falla 1
    await queue.processQueue(remote.send); // falla 2
    const final = await queue.processQueue(remote.send);

    expect(final.processed).toBe(1);
    expect(remote.store.size).toBe(1);
    expect(remote.calls()).toBe(3);
  });

  it("al reconciliar con el remoto se conserva la versión más reciente", () => {
    const queue = new SyncQueue();
    const local = makeInspection({ version: 3, findings: 2 });
    const remote = makeInspection({ version: 2, findings: 0 });

    expect(queue.reconcileRecord(local, remote).findings).toBe(2);
  });

  // TODO(Abraham): integrar geolocalización y notificaciones con jsdom
  // (agregar `// @vitest-environment jsdom` al inicio de un archivo nuevo y simular
  // navigator.geolocation / Notification para cubrir los fallbacks).
});
