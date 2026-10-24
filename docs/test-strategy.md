# Estrategia de pruebas · Semana 08

PWA de inspecciones de laboratorio (datos sintéticos). Este documento relaciona cada riesgo del flujo crítico con la capa de prueba que lo cubre, registra el diagnóstico inicial, los comandos, los escenarios ejecutados, el defecto controlado y los límites.

**Flujo crítico:** crear inspección → guardar sin conexión → recargar → reconectar → sincronizar sin duplicar, más la variante con una capacidad del dispositivo denegada o ausente.

| Criterio del profesor | Dónde se demuestra en este documento |
|---|---|
| AC-01 Reproducibilidad (instalación limpia y build) | §4 Comandos · README |
| AC-02 Estrategia implementada (unit, integración, E2E) | §3 Matriz · §5 Escenarios |
| AC-03 Calidad verificable (CI con resultados y defecto controlado) | §6 Defecto controlado · §4 CI |
| AC-04 Ingeniería (matriz, diagnóstico, límites, evidencia) | §2 Diagnóstico · §3 Matriz · §7 Límites · §8 Cobertura |

---

## 1. Capas elegidas

| Capa | Herramienta | Carpeta | Qué prueba | Por qué esta herramienta |
|---|---|---|---|---|
| Unitaria | Vitest 3 | `tests/unit/` | Una regla aislada (validación, cola, política de conflictos) | Rápida y determinista; corre TypeScript sin compilar. |
| Integración | Vitest 3 (+ jsdom cuando hay navegador) | `tests/integration/` | Cola + almacenamiento + remoto **controlado con fixtures** | Permite simular conexión, almacenamiento y respuestas remotas sin navegador real. |
| E2E | Playwright (Chromium) | `tests/e2e/` | El flujo completo desde la interfaz, con Service Worker, recarga sin red y permisos | Es la única capa con navegador real: puede cortar la red (`context.setOffline`) y negar permisos. |
| Heredadas (sem. 1–6) | node | `tests/*.spec.ts` | Existencia de artefactos de semanas anteriores | Se conservan para no romper la retroalimentación del curso. **No** prueban comportamiento (ver §2). |

Datos de prueba: `tests/fixtures/inspections.ts` (unit/integración) y textos sintéticos escritos dentro de cada E2E. Cada E2E usa un contexto de navegador nuevo, con almacenamiento vacío.

---

## 2. Diagnóstico inicial (AC-04)

Antes de escribir pruebas se ejecutó la versión de la semana 6 (`25e8a52`) en `npm run build && npm start` y en el navegador.

| # | Observado en la versión de la semana 6 | Impacto en las pruebas | Resolución |
|---|---|---|---|
| D1 | No existía ninguna pantalla para **crear** una inspección | El E2E "crear → guardar offline" era imposible de ejecutar | PR #10: `/inspecciones/nueva` |
| D2 | La cola (`SyncQueue`), cámara, ubicación y notificaciones existían en `src/lib/` **sin consumidor** en la interfaz | No se podían probar desde la UI | PR #10: formulario, Pendientes y Ajustes las usan |
| D3 | La etiqueta "Offline Ready" era **texto fijo** | Falso positivo: decía "listo" aunque el Service Worker no estuviera activo | PR #10: indicador real con `navigator.serviceWorker.controller` |
| D4 | "Pendientes" y "Ajustes" apuntaban a `#pendientes` y `#config` (no hacían nada) | Navegación rota | PR #10: páginas reales |
| D5 | Los íconos del manifest (`/icon-192.png`, `/icon-512.png`) daban **404** | Instalación incompleta | PR #10: íconos generados |
| D6 | Las 7 suites existentes solo **buscan texto en el código** con expresiones regulares | No detectan regresiones de comportamiento | Esta semana: unit, integración y E2E con aserciones sobre resultados |
| D7 | Primera corrida repetida del E2E offline: **1 fallo intermitente** (la navegación de la prueba chocaba con la redirección de la app al guardar) | Prueba inestable (flaky) | Se espera la redirección (`waitForURL`) antes de navegar; 35/35 en 5 repeticiones |

No se declaró aprobado nada que no se pudiera ejecutar: D1–D5 se corrigieron antes de escribir los E2E que dependen de ellos.

---

## 3. Matriz riesgo → capa → prueba (AC-02, AC-04)

| Riesgo | Qué podría pasar | Capa | Prueba | Por qué esa capa |
|---|---|---|---|---|
| **R1 Captura inválida** | Se guarda una inspección sin responsable, sin descripción o con hallazgos negativos | Unit + E2E | Unit: `tests/unit/inspection-validation.test.ts` *(pendiente, PR de Abraham)* · E2E: `device-denied.spec.ts` › "una captura inválida no se guarda…" | La regla es pura (unit, entradas válidas e inválidas). El E2E confirma que el usuario **ve** los errores y que **no se guarda nada**. |
| **R2 Persistencia / reconexión** | Al perder la red o recargar se pierde la inspección; al volver la red no se envía | Integración + E2E | Integración: `tests/integration/offline-persistence.test.ts` *(pendiente, PR de Abraham)* · E2E: `offline-flow.spec.ts` | Integración controla almacenamiento y remoto. Solo el E2E prueba la **recarga real sin red** con Service Worker. |
| **R3 Duplicado de sincronización** | Un doble clic o un reintento crea dos inspecciones en el servidor | Unit + integración + E2E | Unit: `sync-queue.test.ts` › "es idempotente…", "no vuelve a aceptar una mutación ya procesada" · Integración: `sync-flow.test.ts` › "…sin duplicados" · E2E: `offline-flow.spec.ts` (remoto con **1** registro) | La idempotencia es una regla de la cola (unit); el reintento con remoto intermitente es integración; el E2E verifica el resultado final. Ver §6: **el E2E solo no basta**. |
| **R4 Permisos del dispositivo** | Sin cámara o sin permiso de ubicación el usuario no puede terminar la captura | E2E (API simulada) | `device-denied.spec.ts` › "sin cámara ni permiso de ubicación…" | Depende del navegador. Se **simula** la ausencia (`navigator.mediaDevices` eliminado, contexto sin permisos); no se usan sensores reales. |
| R5 Conflicto de versiones | Una versión vieja sobrescribe una más nueva | Unit + integración | `conflict-policy.test.ts` · `sync-flow.test.ts` › "…se conserva la versión más reciente" | Regla pura de decisión. |
| R6 Regresión de consulta SSR/CSR | El catálogo o el detalle dejan de mostrarse | E2E | `critical-flow.spec.ts` | Requiere renderizado real del servidor y del cliente. |

---

## 4. Comandos (AC-01, AC-03)

Node 22 y npm 10. Desde la raíz del repositorio:

| Etapa | Comando | Qué ejecuta |
|---|---|---|
| Instalación limpia | `npm ci` | Instala exactamente lo de `package-lock.json` |
| Lint | `npm run lint` | `next lint --max-warnings=0` (cualquier advertencia falla) |
| Tipos | `npm run typecheck` | `tsc --noEmit` |
| Build | `npm run build` | `next build` |
| Heredadas + unit + integración | `npm test` | `test:legacy` (7+1 suites de node) y `vitest run` |
| Solo unit / solo integración | `npm run test:unit` / `npm run test:integration` | Vitest por carpeta |
| Cobertura y reporte | `npm run test:coverage` | Vitest con cobertura v8 → `coverage/` y JUnit → `test-results/vitest-junit.xml` |
| E2E | `npx playwright install chromium` (una vez) y `npm run test:e2e` | Playwright contra el build de producción |
| Todo | `make verify` | lint → tipos → build → pruebas; se detiene en la primera etapa que falla |

**Servidor usado por E2E** (`playwright.config.ts`): Playwright arranca `npm run build && npx next start -p 3100` y espera a que responda `http://localhost:3100`. En CI, con `E2E_SKIP_BUILD=1`, solo ejecuta `npx next start -p 3100` porque el build ya se hizo en la etapa anterior. Reporte HTML en `playwright-report/` y trazas de fallos en `test-results/e2e/` (subcarpeta propia para no borrar `test-results/vitest-junit.xml`, ya que Playwright vacía su carpeta de salida al iniciar).

**CI:** `.github/workflows/academic-evaluation.yml` (PR #12). Etapas: instalación limpia → lint → tipos → build → suites heredadas → unit + integración con cobertura → navegador E2E → E2E → subida de `coverage/`, `test-results/` y `playwright-report/` con `if: always()`. Cada etapa corta el job si falla. La ejecución del SHA final se registra en la entrega de Classroom.

---

## 5. Escenarios ejecutados (AC-02)

Resultados observados el 23 de octubre de 2026 en Windows 11, Node 22.22, Chromium de Playwright.

| Escenario | Preparación | Acción / comando | Esperado | Observado | Prueba |
|---|---|---|---|---|---|
| E1 Crear → offline → recargar → reconectar → una sola sincronizada | Contexto nuevo; Service Worker controlando la página | Crear desde "+ Nueva inspección" con la red cortada; abrir Pendientes; recargar sin red; reconectar | "Pendiente de envío" antes y después de recargar; al reconectar "Todo está al día ✓"; **1** registro en el remoto | ✅ Cumple · 5/5 repeticiones | `tests/e2e/offline-flow.spec.ts` |
| E2 Sin cámara y sin permiso de ubicación | Contexto sin permisos; `navigator.mediaDevices` eliminado | "Tomar foto" → selector de archivos con imagen sintética; "Agregar mi ubicación"; guardar | Aviso de cámara no disponible, vista previa, aviso de ubicación aproximada; el detalle muestra foto y "(aproximada del campus)" | ✅ Cumple · 5/5 | `tests/e2e/device-denied.spec.ts` |
| E3 Captura inválida | Formulario vacío, hallazgos = `-3` | Guardar | Sigue en el formulario, 3 mensajes de error, nada en almacenamiento | ✅ Cumple · 5/5 | `tests/e2e/device-denied.spec.ts` |
| E4 Consulta SSR/CSR | — | Inicio → catálogo → detalle; id inexistente; manifest | Contenido visible, error con `role="alert"`, `display: standalone` | ✅ Cumple · 5/5 | `tests/e2e/critical-flow.spec.ts` |
| E5 Cola idempotente y reintentos | Fixtures de `tests/fixtures/inspections.ts` | `npm run test:unit` | Mismo `mutationId` no se encola dos veces; 3 fallos → elemento fallido | ✅ 8/8 | `tests/unit/*.test.ts` |
| E6 Remoto intermitente sin duplicados | Remoto en memoria que falla 2 veces | `npm run test:integration` | Una sola inspección en el remoto tras 3 intentos | ✅ 2/2 | `tests/integration/sync-flow.test.ts` |

Totales locales: E2E **7 pruebas, 35/35** en `--repeat-each=5`; Vitest **10/10**; suites heredadas 8/8.

---

## 6. Defecto controlado (AC-03)

**Defecto:** omitir la protección de duplicados en `SyncQueue.enqueue` (`src/lib/sync/queue.ts`): se elimina la comprobación de `mutationId` y toda operación se agrega a la cola.

**Ensayo local (23 oct):**

```
× SyncQueue > es idempotente: no encola dos veces el mismo mutationId
  → expected true to be false
× SyncQueue > no vuelve a aceptar una mutación ya procesada
  → expected true to be false
× flujo de sincronización offline → online > una inspección capturada sin red llega al servidor tras reintentos y sin duplicados
  → expected +0 to be 1
Test Files  2 failed | 1 passed (3)
     Tests  3 failed | 7 passed (10)
```

Tras restaurar el código: `Tests 10 passed (10)`.

**Hallazgo de ingeniería:** con el mismo defecto, el E2E `offline-flow.spec.ts` **siguió pasando**. El remoto simulado guarda por `entityId`, así que esconde el duplicado al final del flujo. Esto justifica la pirámide: **el riesgo R3 necesita pruebas de la cola (unit e integración); un E2E por sí solo no lo detecta.**

**Evidencia en CI:**
- Rama temporal: `defecto/w08-sin-idempotencia` (no se fusiona).
- Ejecución con el defecto, commit `de080fc` (**roja**): https://github.com/lizcast06/PWA-Equipo2/actions/runs/40061332791
  Lint, tipos, build y suites heredadas pasan; **falla "Unit + integración con cobertura"**; E2E se omite; **"Reportes y cobertura" se sube igual** (`if: always()`).
- Ejecución con la corrección, commit `cec607b` = `git revert` del defecto (**verde**): https://github.com/lizcast06/PWA-Equipo2/actions/runs/40061487918
  Todas las etapas en verde, incluido E2E.
- La rama nunca se abrió como PR ni se integró a `main`.

---

## 7. Límites: qué NO demuestran estas pruebas (AC-04)

- **No hay backend real.** El "remoto" es una llave de `localStorage`; no se prueban respuestas HTTP reales (409, 500, timeouts de red).
- **Solo Chromium.** No cubre Safari/iOS, donde las PWA, los permisos y las notificaciones se comportan distinto.
- **No se usan cámara ni GPS reales.** Se simula su ausencia o denegación.
- **La recarga sin red cubre pantallas ya visitadas.** El Service Worker precachea el HTML de las rutas principales, pero los archivos JavaScript de una pantalla se guardan al usarla o precargarla con red. Una pantalla que nunca se abrió con conexión podría no ser interactiva sin red.
- **Las notificaciones del sistema no se verifican.** El E2E comprueba el aviso dentro de la app.
- Las suites heredadas (`tests/*.spec.ts`) solo comprueban existencia de texto; se conservan, pero no cuentan como evidencia de comportamiento.

---

## 8. Cobertura (AC-03, AC-04)

`npm run test:coverage` (solo unit + integración, sobre `src/lib/**`). La cobertura se usa para **encontrar huecos**, no como meta.

| Archivo | Líneas | Hueco detectado |
|---|---|---|
| `sync/queue.ts` | 89 % | Remoto que responde `false` (no lanza error) y `getPendingItems` — *pendiente, PR de Abraham* |
| `sync/conflict-policy.ts` | cubierto | — |
| `storage/local-store.ts` | 0 % | Guardar offline, reconectar y reintentar sin duplicar — *pendiente, PR de Abraham (integración)*; hoy lo cubre el E2E |
| `device/camera.ts`, `device/geolocation.ts`, `notifications/client.ts` | 0 % | Cubiertos solo por E2E (`device-denied.spec.ts`); falta integración con jsdom |

Reporte HTML: `coverage/index.html` (artefacto de CI).
