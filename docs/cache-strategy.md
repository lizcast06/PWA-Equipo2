# Estrategia de Caché y Resiliencia Offline — Semana 3

## 1. Topología de Almacenamiento
- **Precache estático (`static-v1`):** App Shell, manifest, layout compilado y estilos críticos para permitir el arranque offline.
- **Runtime cache (`runtime-v1`):** Respuestas de datos sintéticos de inspecciones y navegación bajo demanda.
- **Fallback offline:** Página/indicador estático servido cuando un recurso de navegación no está en caché ni hay conexión.

## 2. Estrategias por Recurso
| Tipo de Recurso | Estrategia | Justificación |
|---|---|---|
| Documento HTML principal | Network-First con fallback a Caché | Garantiza frescura de datos al haber red y persistencia sin conexión |
| Assets estáticos (CSS/JS) | Cache-First | Inmutables por hash durante la vida de la versión |
| Web Manifest / Iconos | Stale-While-Revalidate | Carga instantánea con actualización en segundo plano |

## 3. Ciclo de Vida e Invalidación
- **Install:** Abre la caché estática y precachea las rutas críticas declaradas. Desde la semana 10 ya no se activa sola: queda en espera hasta que la persona pulsa **Actualizar** (ver sección 6).
- **Activate:** Limpia cachés de versiones obsoletas comparando contra `CURRENT_CACHES` y toma control inmediato con `clients.claim()`.
- **Fetch:** Intercepta peticiones del mismo origen aplicando el enrutador de estrategias seguro sin bloquear llamadas externas.
## 4. Ajustes posteriores (`static-v2` / `runtime-v2`)
- **Precache ampliado:** además de `/` y el manifest, se precachean los íconos (`/icon-192.png`, `/icon-512.png`) y las pantallas `/inspecciones`, `/inspecciones/nueva`, `/pendientes` y `/ajustes` para que abran sin conexión aunque no se hayan visitado. Las rutas se agregan de forma individual para que una falla no cancele la instalación.
- **JS/CSS pasan a Network-First con fallback a caché:** en `next dev` los archivos de `/_next/static` no llevan hash, por lo que Cache-First servía código viejo después de cada cambio. Con Network-First siempre se usa la versión actual cuando hay red y la copia en caché cuando no la hay.
- **Manifest e íconos:** Cache-First, ya que no cambian entre versiones.
- **Indicador real en la interfaz:** la etiqueta del encabezado refleja si el Service Worker controla la página ("Listo sin conexión"), si no está activo ("En línea · sin caché offline") o si el navegador perdió la red ("Sin conexión").

## 5. Versión `static-v3` / `runtime-v3` (semana 8, hallazgo D10)
- **Detalle sin conexión:** las inspecciones creadas en el dispositivo se abren en `/inspecciones/ver?id=<id>`, una página estática; la navegación sin red usa `ignoreSearch`, así una sola copia sirve para cualquier id. Los detalles de las tres inspecciones sembradas también se precachean.
- **JavaScript de cada pantalla:** al instalarse, el Service Worker descarga el HTML de cada ruta y guarda los archivos `/_next/static/...` que referencia, para que una pantalla nunca abierta con red sea interactiva sin conexión.
- Cubierto por `tests/e2e/offline-screens.spec.ts` (ver `docs/test-strategy.md`, D10 y E9).

## 6. Versión `static-v5` / `runtime-v5` (semana 10, actualización segura)
- **Sin activación automática:** `install` ya no llama `skipWaiting()`. Si otra versión controla la app, la nueva queda en espera y la interfaz muestra "Hay una versión nueva" con el botón **Actualizar**. Solo entonces se envía `{ type: "SKIP_WAITING" }`, la versión nueva toma el control y la página recarga una vez. La primera instalación se activa sola porque no hay versión anterior.
- **Precache obligatorio:** `/`, `/inspecciones`, `/inspecciones/nueva`, `/inspecciones/ver`, `/pendientes` y `/ajustes`, con su JS/CSS. Si alguno falla, `install` falla y sigue la versión anterior. Los tres detalles sembrados son opcionales.
- **Varias pestañas:** al pulsar Actualizar en una pestaña que ya quedó controlada por la versión nueva (porque otra pestaña la aplicó), esa pestaña también recarga, para no seguir con la página anterior.
- **Límite:** el navegador solo detecta una versión nueva si cambia `public/sw.js`. Cada release que cambie la app debe subir el número de caché; si no, no aparece el aviso y la caché obligatoria queda con los archivos anteriores.
- Cubierto por `tests/e2e/sw-update.spec.ts`; la recuperación ante una versión defectuosa está en `docs/runbook.md` (sección 4).
