# Especificación de Consistencia y Sincronización Idempotente

## 1. Modelo de Consistencia Offline-First
El sistema garantiza que cualquier registro capturado en laboratorios sin conexión se almacene localmente en una estructura indexada determinista. Al recuperar conectividad, la cola de sincronización procesa los elementos pendientes.

## 2. Garantía de Idempotencia
Cada mutación generada en el cliente incorpora un `clientMutationId` único (UUID v4 sintético). Si una mutación se envía en múltiples ocasiones debido a pérdidas de paquete en red intermitente, el receptor identifica el identificador de mutación para descartar duplicados y prevenir alteraciones múltiples sobre el mismo estado.

## 3. Política de Resolución de Conflictos: Last-Write-Wins (LWW) con Versionado
- Ante modificaciones concurrentes sobre el mismo registro (`id`), se compara el campo `version` y la marca de tiempo `updatedAt`.
- Se preserva la versión con mayor secuencia temporal válida.
- En caso de empate idéntico de timestamps, se aplica ordenación lexicográfica determinista del hash de mutación.

## 4. Estrategia de Reintentos y Backoff
- Límite de reintentos configurado a 3 intentos máximos por elemento de cola.
- Al alcanzar el umbral de reintentos fallidos, la mutación se transfiere a un estado de error observable para evitar el bloqueo del resto de la cola (Head-of-Line Blocking).