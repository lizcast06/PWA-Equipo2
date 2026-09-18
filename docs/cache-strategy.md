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
- **Install:** Abre la caché estática y precachea las rutas críticas declaradas. `self.skipWaiting()` fuerza la activación.
- **Activate:** Limpia cachés de versiones obsoletas comparando contra `CURRENT_CACHES` y toma control inmediato con `clients.claim()`.
- **Fetch:** Intercepta peticiones del mismo origen aplicando el enrutador de estrategias seguro sin bloquear llamadas externas.