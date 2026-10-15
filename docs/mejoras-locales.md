# Mejoras de usabilidad (rama local `mejoras/local-ux`)

Cambios aplicados sobre `main` para que las capacidades de las semanas 3–6 se puedan usar desde la interfaz.

## Qué cambió para el usuario

| Antes | Ahora |
|---|---|
| Etiqueta fija "Offline Ready" aunque el Service Worker no estuviera activo | Indicador real: "Listo sin conexión", "Offline no activo" o "Sin conexión", más un aviso cuando se pierde la red |
| Tarjetas del inicio sin enlace | Toda la tarjeta abre el detalle |
| "Pendientes" y "Ajustes" apuntaban a `#pendientes` / `#config` | Páginas reales `/pendientes` y `/ajustes`; también hay navegación en escritorio |
| No existía forma de registrar una inspección | Formulario `/inspecciones/nueva` con validación, foto (cámara o galería) y ubicación |
| Cola de sincronización solo en código | Las inspecciones se guardan en el dispositivo, quedan en Pendientes sin conexión y se envían solas al volver la red (`SyncQueue.processQueue`) |
| Notificaciones solo en código | Ajustes permite activarlas; al sincronizar se avisa por notificación del sistema o con un aviso en pantalla |
| Íconos del manifest inexistentes (404) | `public/icon-192.png` y `public/icon-512.png` generados con `node scripts/generate-icons.mjs` |
| Service Worker con Cache-First para JS (código viejo en desarrollo) | Network-First con respaldo en caché y precache de todas las pantallas (ver `docs/cache-strategy.md`) |

## Archivos principales

- `src/lib/storage/local-store.ts`: guardado local, cola y servidor simulado.
- `src/lib/pwa/use-app-status.ts`: estado de conexión, Service Worker y pendientes.
- `src/app/inspecciones/nueva/page.tsx`, `src/app/pendientes/page.tsx`, `src/app/ajustes/page.tsx`.
- `tests/ux.spec.ts`: verifica íconos, rutas de navegación, indicador real y uso de las capacidades en la UI.

## Cómo probarlo

```bash
npm ci
npm run build
npm start
```

En Chrome: DevTools → Application → Service Workers → marcar **Offline**, registrar una inspección, revisar Pendientes y desmarcar Offline para ver el envío automático.

> El "servidor" es simulado en el propio navegador (no hay backend); todos los datos son sintéticos.
