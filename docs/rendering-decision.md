# Decisión de renderizado SSR vs CSR — Semana 4

## Problema
El mismo dominio (inspecciones de laboratorio) necesita un listado estable y un detalle interactivo. Renderizar ambas rutas igual mezclaría responsabilidades: el catálogo no requiere estado de cliente, pero el detalle sí debe mostrar carga, error e hidratación controlada.

## Decisión
| Ruta | Modo | Justificación |
|---|---|---|
| `/inspecciones` | **SSR** (Server Component, sin `"use client"`) | El catálogo es de solo lectura. El servidor resuelve `inspections` y envía HTML con las tarjetas ya presentes. Menos JS en el cliente y mejor primera pintura del listado. |
| `/inspecciones/[id]` | **CSR** (`"use client"` + `useEffect`) | El detalle necesita estados explícitos de carga y error, y puede fallar si el `id` no existe. El estado inicial es `isLoading=true` en servidor y cliente para evitar hydration mismatch. |

## Estados verificables
- **SSR — contenido:** tarjetas del catálogo sintético con enlace a cada detalle.
- **SSR — vacío:** colección sin registros.
- **SSR — error:** origen de datos que no es un arreglo.
- **CSR — loading:** `LoadingState` con `role="status"` mientras se resuelve el `id`.
- **CSR — error:** `role="alert"` si el identificador falta o no coincide.
- **CSR — success:** ficha del laboratorio seleccionado.

## Trade-off medible
En una recarga local (`npm run dev`), el catálogo SSR llega con el título y las 3 tarjetas en el HTML inicial (View Source / documento). El detalle CSR llega primero con el indicador de carga y después pinta el contenido (~150 ms simulados). Se gana interactividad y mensajes de error en el detalle a costa de un segundo de espera percibida; se gana TTFB de contenido en el listado a costa de no poder reconsultar en el cliente sin recargar.

## Límites
- Los datos siguen siendo sintéticos en `src/lib/data/inspections.ts`; no hay API remota.
- El App Shell es Client Component (registro del Service Worker). Eso no convierte al catálogo en CSR: la página `/inspecciones` sigue siendo Server Component y solo hidrata el cascarón.
- No se midió Lighthouse en CI; la comparación de carga es reproducible con “Ver código fuente” vs. el estado `LoadingState` del detalle.
