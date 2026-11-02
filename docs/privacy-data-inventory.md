# Inventario de datos y privacidad · Semana 09

## Marco normativo y contexto
La **Universidad Tecnológica de Tehuacán** es una institución pública y, por lo tanto, **sujeto obligado** de la **Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO)**.
En esta actividad **todos los datos son sintéticos**: no se tratan datos de personas reales. El inventario documenta qué trataría la PWA en operación real y por qué.

Principio práctico del curso: *si no podemos justificar un dato, probablemente no debemos recolectarlo.*

## Matriz de tratamiento de datos

La llave base en `localStorage` es `utt_pwa_inspections_db`.

| Dato | Finalidad | Dónde queda | Justificación | Plazo de conservación en el dispositivo | Decisión / control |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ID de inspección** | Identificar el registro y evitar duplicados | `localStorage` (`:inspections`, `:queue`, `:remote`) | Necesario para sincronizar sin duplicar | Hasta cerrar sesión o borrar datos locales | UUID aleatorio, sin datos personales. Las URLs con `?id=` no se guardan en caché |
| **Laboratorio** | Saber qué espacio se inspeccionó | `localStorage` | Es el objeto de la inspección | Hasta cerrar sesión o borrar datos locales | Lista sintética u "Otro laboratorio" (máx. 80 caracteres) |
| **Responsable** | Trazabilidad de quién inspeccionó | `localStorage` | Rendición de cuentas de la inspección | Hasta cerrar sesión o borrar datos locales | Texto sintético (2 a 80 caracteres). Dato personal en operación real |
| **Hallazgos** | Cuántas incidencias se encontraron | `localStorage` | Diagnóstico de mantenimiento | Hasta cerrar sesión o borrar datos locales | Entero de 0 a 99, validado también en el servidor (400) |
| **Descripción** | Detalle de lo revisado | `localStorage` | Evidencia de la inspección | Hasta cerrar sesión o borrar datos locales | Texto de 10 a 1000 caracteres; React lo muestra como texto, no como HTML. Indicar que no se escriban datos personales |
| **Fotografía** (opcional) | Evidencia del estado del equipo | `localStorage` (data URL JPEG reducida a 800 px). **No** en Cache Storage | Solo si aporta evidencia; se puede omitir | Hasta cerrar sesión o borrar datos locales | Opcional. Podría captar personas o lugares: fotografiar solo el equipo. Revisar plazo en operación real |
| **Ubicación** (opcional) | Saber en qué zona del campus se hizo la inspección | `localStorage` | La precisa **no se requiere** para esa finalidad | Hasta cerrar sesión o borrar datos locales | **Minimizada** a 2 decimales (~1 km) y sin `accuracy`. Si se niega el permiso, se usa la ubicación aproximada del campus |
| **Dueño (`ownerId`) y sesión** | Control de acceso por rol | `localStorage` (`:session` y dentro de cada inspección) | Mínimo privilegio (401/403) | Sesión: hasta cerrar sesión | Usuarios sintéticos (`inspector-a`, `inspector-b`, `supervisor-1`, `visitante`); no autentica identidades reales |
| **Cola de sincronización** | Enviar lo capturado sin conexión | `localStorage` (`:queue`) | Funcionamiento offline | Se vacía al enviar o si el servidor rechaza; también al cerrar sesión | Copia temporal de la inspección con `mutationId` para no duplicar |
| **Motivo de rechazo** | Explicar por qué no se aceptó un envío | `localStorage` (dentro de la inspección) | Que la persona pueda corregir | Hasta cerrar sesión o borrar datos locales | Solo estado 400/401/403 y mensaje |
| **Remoto simulado** | Representar al servidor en esta actividad | `localStorage` (`:remote`) | No hay backend real | Hasta cerrar sesión o borrar datos locales | En operación real viviría en la API y tendría su propio plazo |
| **Caché del Service Worker** | Abrir la app sin conexión | Cache Storage (`pwa-inspecciones-static-v4`, `pwa-inspecciones-runtime-v4`) | Disponibilidad offline | La estática hasta nueva versión; la dinámica se borra al cerrar sesión | Lista permitida: solo pantallas públicas, `/_next/static`, íconos y manifest. **Sin** registros de inspección, `/api/`, `no-store`/`private` ni URLs con consulta |

## Principios aplicados
1. **Minimización:** ubicación aproximada, foto y ubicación opcionales, sin campos que no tengan finalidad.
2. **Finalidad:** los datos se usan solo para el reporte de inspección.
3. **Conservación limitada:** "Cerrar sesión" borra inspecciones, cola, remoto simulado, sesión y caché dinámica (`src/lib/security/logout.ts`). También existe "Borrar datos locales" en Ajustes.
4. **Permisos solo al usarlos:** cámara y ubicación se piden al pulsar el botón; si se niegan, la captura se completa igual.

## Derechos ARCO (nivel conceptual)
| Derecho | Situación en la PWA |
| :--- | :--- |
| **Acceso** | La persona ve sus inspecciones en Pendientes y en el detalle; el "servidor" responde 403 a inspecciones ajenas |
| **Rectificación** | **No implementada:** no se edita una inspección guardada; requeriría un flujo con versiones y autorización |
| **Cancelación** | "Borrar datos locales" y "Cerrar sesión" eliminan los datos del dispositivo. En operación real se atendería también en el servidor |
| **Oposición** | Foto y ubicación son opcionales y se pueden negar los permisos sin perder la captura |

## Controles técnicos relacionados
- **CSP y encabezados** en `next.config.mjs`: `object-src 'none'`, `frame-ancestors 'none'`, `nosniff`, `Permissions-Policy`.
- **`public/robots.txt`:** evita la indexación de pantallas internas. **No es un control de seguridad:** cualquiera puede ignorarlo.

## Límites
- **`localStorage` no está cifrado:** la mitigación es guardar lo mínimo y borrarlo al cerrar sesión; no protege si nunca se cierra sesión ni ante un XSS exitoso.
- **`'unsafe-inline'` en `script-src`:** riesgo aceptado, porque Next.js 14 necesita scripts en línea para hidratar si no se usan nonces. La CSP es una capa adicional, no el único control contra XSS.
- **Sin backend real:** las reglas del servidor están modeladas en `simulatedRemoteSync`; en producción deben vivir en la API.
- **Aviso de privacidad y plazos oficiales:** en operación real los definiría la institución; aquí son una propuesta técnica.
