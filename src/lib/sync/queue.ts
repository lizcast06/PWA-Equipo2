import { SyncQueueItem, StoredInspection } from "../storage/schema";
import { resolveConflict } from "./conflict-policy";

export class SyncQueue {
  private queue: SyncQueueItem[] = [];
  private processedMutationIds: Set<string> = new Set();
  private maxRetries: number = 3;

  public enqueue(item: SyncQueueItem): boolean {
    // Idempotencia: evitar duplicados en la cola
    if (this.processedMutationIds.has(item.mutationId)) {
      return false;
    }
    const exists = this.queue.some((q) => q.mutationId === item.mutationId);
    if (!exists) {
      this.queue.push({ ...item });
      return true;
    }
    return false;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public async processQueue(
    remoteSyncFn: (item: SyncQueueItem) => Promise<boolean>
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of this.queue) {
      if (this.processedMutationIds.has(item.mutationId)) {
        continue;
      }

      try {
        const success = await remoteSyncFn(item);
        if (success) {
          this.processedMutationIds.add(item.mutationId);
          processed++;
        } else {
          throw new Error("Sync failed at transport level");
        }
      } catch {
        item.retryCount++;
        if (item.retryCount < this.maxRetries) {
          remainingQueue.push(item);
        } else {
          failed++; // Registro marcado como fallido tras superar límite
        }
      }
    }

    this.queue = remainingQueue;
    return { processed, failed };
  }

  public reconcileRecord(local: StoredInspection, remote: StoredInspection): StoredInspection {
    return resolveConflict(local, remote).resolvedRecord;
  }
}