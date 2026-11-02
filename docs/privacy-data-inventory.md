# Inventario de Tratamiento de Datos y Privacidad · Semana 09

## Marco normativo y contexto institucional
La Universidad Tecnológica de Tula-Tepeji (UTT) es un **sujeto obligado** en términos de la **Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO)**. 
Para la evaluación técnica de esta PWA de inspecciones, **todos los datos utilizados son estrictamente sintéticos y simulados**.

## Matriz de tratamiento de datos

| Dato | Finalidad | Ubicación de almacenamiento | Base / Justificación | Plazo de conservación | Decisión técnica / Control |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ID de Inspección** | Identificación única de registro | `localStorage` / Cache Storage | Cumplimiento de función pública | Duración de la sesión / Sincronización | Generación aleatoria UUID |
| **Laboratorio** | Asignación del espacio evaluado | `localStorage` | Evaluación de infraestructura | Hasta completar reporte | Selección desde lista fija sintética |
| **Responsable** | Vinculación del encargado del área | `localStorage` | Trazabilidad del hallazgo | Registro histórico sintético | Cadena de texto sintética |
| **Hallazgos** | Registro técnico de incidencias | `localStorage` | Diagnóstico operativo | Sincronización remota | Texto plano no codificado |
| **Descripción** | Detalle descriptivo de hallazgo | `localStorage` | Evidencia de inspección | Sincronización remota | Texto plano sintético |
| **Fotografía** | Evidencia visual del estado del área | `localStorage` / Cache Storage | Documentación del reporte | Limpieza al cerrar sesión | Convertido a Base64 / Blob |
| **Ubicación Geográfica** | Trazabilidad del lugar del hallazgo | `localStorage` | Verificación de presencialidad | Hasta envío de inspección | **Minimización de precisión a ~1 km** |
| **ID del Usuario (`ownerId`)** | Control de acceso por perfil | Session Context (`localStorage`) | Control de sesión y roles | Sesión activa | Asignación sintética (`inspector-a`) |
| **Cola de sincronización** | Almacenamiento offline temporal | `localStorage` (`sync_queue`) | Resiliencia sin conectividad | Vaciado al sincronizar con servidor | Limpieza automática tras HTTP 200 |
| **Caché Service Worker** | Shell de aplicación y recursos offline | Cache Storage (`v1`) | Disponibilidad de PWA | Actualización por ciclo de vida | Exclusión de respuestas dinámicas sensible |

## Principios de protección de datos aplicados
1. **Minimización:** Se reduce la precisión de las coordenadas GPS a un radio aproximado de 1 km para evitar rastreo exacto no justificado.
2. **Finalidad:** Los datos se procesan exclusivamente para la generación del reporte de inspección institucional.
3. **Conservación limitada:** Los datos de sesión y cola local se purgan del cliente al ejecutar el flujo de cierre de sesión.

## Derechos ARCO y limitaciones
* **Derechos ARCO:** A nivel conceptual, la plataforma permite el Acceso y Rectificación de inspecciones en estado borrador antes de su envío. Cancelación y Oposición son gestionados mediante el purgado local.
* **Cierre de sesión:** La acción de cierre de sesión invalida el token simulado y limpia las claves de `localStorage` y caché del cliente.
* **Límite de seguridad:** La directiva `'unsafe-inline'` en `script-src` dentro de la CSP representa un riesgo controlado aceptado debido a la arquitectura de hidratación de Next.js 14 sin nonces estáticos.