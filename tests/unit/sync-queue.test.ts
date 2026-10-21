import { describe, expect, it, vi } from "vitest";
import { SyncQueue } from "../../src/lib/sync/queue";
import { makeQueueItem } from "../fixtures/inspections";

describe("SyncQueue", () => {
  it("es idempotente: no encola dos veces el mismo mutationId", () => {
    const queue = new SyncQueue();

    expect(queue.enqueue(makeQueueItem())).toBe(true);
    expect(queue.enqueue(makeQueueItem())).toBe(false);
    expect(queue.getPendingCount()).toBe(1);
  });

  it("despacha los elementos y vacía la cola cuando el remoto responde bien", async () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "a" }));
    queue.enqueue(makeQueueItem({ mutationId: "b" }));
    const remote = vi.fn().mockResolvedValue(true);

    const result = await queue.processQueue(remote);

    expect(result).toEqual({ processed: 2, failed: 0 });
    expect(remote).toHaveBeenCalledTimes(2);
    expect(queue.getPendingCount()).toBe(0);
  });

  it("no vuelve a aceptar una mutación ya procesada", async () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "a" }));
    await queue.processQueue(vi.fn().mockResolvedValue(true));

    expect(queue.enqueue(makeQueueItem({ mutationId: "a" }))).toBe(false);
  });

  it("reintenta hasta 3 veces y después marca el elemento como fallido", async () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "falla" }));
    const remote = vi.fn().mockRejectedValue(new Error("sin red"));

    expect(await queue.processQueue(remote)).toEqual({ processed: 0, failed: 0 });
    expect(await queue.processQueue(remote)).toEqual({ processed: 0, failed: 0 });
    expect(await queue.processQueue(remote)).toEqual({ processed: 0, failed: 1 });
    expect(queue.getPendingCount()).toBe(0);
  });

  // TODO(Abraham): agregar casos para respuesta `false` del remoto y mezcla de éxitos/fallos.
});
