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

  it("si el remoto responde false el elemento sigue pendiente y suma un reintento", async () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "rechazada" }));

    const result = await queue.processQueue(vi.fn().mockResolvedValue(false));

    expect(result).toEqual({ processed: 0, failed: 0 });
    expect(queue.getPendingItems()).toMatchObject([{ mutationId: "rechazada", retryCount: 1 }]);
  });

  it("con éxitos y fallos mezclados solo quedan pendientes los que fallaron", async () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "ok-1", entityId: "e-1" }));
    queue.enqueue(makeQueueItem({ mutationId: "falla", entityId: "e-2" }));
    queue.enqueue(makeQueueItem({ mutationId: "ok-2", entityId: "e-3" }));
    const remote = vi.fn(async (item: { mutationId: string }) => item.mutationId !== "falla");

    const result = await queue.processQueue(remote);

    expect(result).toEqual({ processed: 2, failed: 0 });
    expect(queue.getPendingItems().map((item) => item.mutationId)).toEqual(["falla"]);
    // Al reintentar solo se vuelve a enviar el que falló, no los que ya llegaron.
    await queue.processQueue(vi.fn().mockResolvedValue(true));
    expect(queue.getPendingCount()).toBe(0);
  });

  it("getPendingItems devuelve copias: modificarlas no altera la cola", () => {
    const queue = new SyncQueue();
    queue.enqueue(makeQueueItem({ mutationId: "a" }));

    const [copy] = queue.getPendingItems();
    copy.retryCount = 99;
    copy.mutationId = "otra";

    expect(queue.getPendingItems()).toMatchObject([{ mutationId: "a", retryCount: 0 }]);
  });
});
