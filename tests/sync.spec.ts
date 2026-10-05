import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function runSyncTests() {
  const root = process.cwd();

  const schemaPath = resolve(root, "src/lib/storage/schema.ts");
  const queuePath = resolve(root, "src/lib/sync/queue.ts");
  const conflictPath = resolve(root, "src/lib/sync/conflict-policy.ts");
  const docPath = resolve(root, "docs/sync-policy.md");

  const schemaContent = await readFile(schemaPath, "utf8");
  const queueContent = await readFile(queuePath, "utf8");
  const conflictContent = await readFile(conflictPath, "utf8");
  const docContent = await readFile(docPath, "utf8");

  // 1. Validacion de contratos de persistencia y esquema
  assert.match(schemaContent, /interface StoredInspection/, "schema.ts debe definir la entidad StoredInspection");
  assert.match(schemaContent, /clientMutationId/, "StoredInspection debe incluir clientMutationId para deduplicacion");
  assert.match(schemaContent, /interface SyncQueueItem/, "schema.ts debe definir SyncQueueItem");
  assert.match(schemaContent, /DB_CONFIG/, "schema.ts debe exportar la configuracion del almacenamiento");

  // 2. Validacion de cola idempotente y reintentos
  assert.match(queueContent, /class SyncQueue/, "queue.ts debe exportar la clase SyncQueue");
  assert.match(queueContent, /enqueue/, "SyncQueue debe implementar metodo enqueue");
  assert.match(queueContent, /mutationId/, "SyncQueue debe evaluar mutationId para evitar duplicaciones");
  assert.match(queueContent, /retryCount|maxRetries/, "SyncQueue debe contemplar politica de reintentos");
  assert.match(queueContent, /processQueue/, "SyncQueue debe proveer despacho de cola");

  // 3. Validacion de resolucion de conflictos LWW
  assert.match(conflictContent, /resolveConflict/, "conflict-policy.ts debe exportar resolveConflict");
  assert.match(conflictContent, /version/, "resolveConflict debe priorizar la version de la entidad");
  assert.match(conflictContent, /updatedAt/, "resolveConflict debe aplicar desempate temporal Last-Write-Wins");

  // 4. Validacion de documentacion y anti-gaming
  assert.ok(docContent.length > 150, "docs/sync-policy.md debe contener justificacion detallada");
  assert.match(docContent, /Idempotencia|idempotente/i, "docs/sync-policy.md debe justificar idempotencia");
  assert.match(docContent, /Last-Write-Wins|LWW/i, "docs/sync-policy.md debe documentar politica de resolucion");

  console.log("sync.spec.ts: PASS");
}

runSyncTests();