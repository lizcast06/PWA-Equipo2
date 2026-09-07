# ADR-001 — Estrategia de arquitectura de aplicación

## Estado
Aprobado — Semana 1

## Contexto y restricciones
Para la Universidad Tecnológica de Tehuacán (UTT), se requiere un sistema ágil para el levantamiento de bitácoras de inspección de laboratorios técnicos. Las restricciones críticas del proyecto son:
1. **Conectividad:** Cobertura de red celular y WiFi sumamente irregular en talleres y laboratorios con estructuras de concreto y blindaje.
2. **Diversidad de hardware:** Personal técnico con dispositivos heterogéneos (teléfonos Android de gama baja/media, iPhones y equipos de cómputo portátiles).
3. **Plazo de entrega y equipo:** Ventana de desarrollo acotada al cuatrimestre universitario (14 semanas) con un equipo de desarrollo enfocado en la pila JavaScript/TypeScript.
4. **Cero fricción de despliegue:** Restricción presupuestal y de tiempos para pagar cuentas de desarrollador y someterse a procesos de revisión en Apple App Store o Google Play Store.
5. **Verificabilidad:** Necesidad de compilación, empaquetado y pruebas reproducibles en pipelines de CI (GitHub Actions).

## Comparación de alternativas

| Criterio | PWA (Next.js App Router) [Seleccionada] | Web Tradicional (SSR / SPA estándar) | App Nativa (Kotlin/Swift) | Multiplataforma (Flutter / React Native) |
| :--- | :--- | :--- | :--- | :--- |
| **Instalación y acceso** | Instalable desde el navegador sin tiendas; acceso inmediato vía URL. | No instalable en el SO; requiere acceso vía URL en cada uso. | Instalación obligatoria mediante tiendas de aplicaciones oficiales. | Instalación obligatoria mediante tiendas o distribución de binarios (.apk / .ipa). |
| **Conexión intermitente (Offline)** | **Alta:** Control programable mediante Service Workers, Cache Storage e IndexedDB. | **Nula:** Falla inmediata si se pierde la red durante la navegación o petición. | **Excelente:** Control total de almacenamiento local (SQLite, Room, CoreData). | **Excelente:** Soporte nativo de bases de datos embebidas (SQLite, Hive). |
| **Distribución y despliegue** | Inmediata; cada push/deploy a producción actualiza a todos los clientes sin revisión de tiendas. | Inmediata vía web. | Lenta; sujeta a revisión, políticas y tiempos de aprobación de Apple y Google. | Lenta; sujeta a aprobación de tiendas en cada actualización de binario. |
| **Costos y velocidad de desarrollo** | **Bajo:** Un solo repositorio y código base (Next.js, React, TS) para web y móvil. | **Bajo:** Un solo código base. | **Muy Alto:** Dos bases de código independientes (Swift para iOS, Kotlin para Android). | **Medio:** Una base de código, pero requiere configuración de entornos móviles nativos y SDKs. |
| **Mantenimiento** | Simple y unificado bajo estándares web modernos. | Simple y unificado. | Complejo; mantenimiento y actualización dual de bibliotecas nativas. | Medio; mantenimiento de dependencias nativas y puentes de compilación. |
| **Capacidades de hardware requeridas** | Suficiente (almacenamiento local, cámara para fotos/QR futuro, eventos de red). | Limitado; no persiste adecuadamente en segundo plano. | Total (acceso a todos los sensores del dispositivo). | Alto (acceso a APIs nativas mediante plugins). |

## Justificación de la decisión
Se selecciona la alternativa de **Progressive Web App (PWA) construida sobre Next.js (App Router), React y TypeScript**. 

Las razones determinantes son:
* Resuelve el requerimiento crítico de **operación offline** mediante el ciclo de vida del Service Worker y Cache API, sin incurrir en el costo financiero ni temporal de publicar en tiendas de aplicaciones móviles.
* Permite al equipo aprovechar un único lenguaje (TypeScript) y framework (Next.js) tanto para el renderizado optimizado de vistas como para la lógica de cliente, maximizando la velocidad de entrega en las 14 semanas.
* El acceso mediante URL garantiza que cualquier técnico pueda utilizar la herramienta de inmediato desde su navegador móvil o instalarla en la pantalla de inicio con un solo toque.

*Cuándo sería preferible otra opción:* Si el sistema requiriera en el futuro comunicación por Bluetooth Low Energy (BLE) para interactuar con instrumentación industrial o procesamiento gráfico 3D intensivo en segundo plano, una solución nativa o multiplataforma (Flutter) sería la indicada.

## Consecuencias y riesgos
* **Consecuencias positivas:**
  * Reducción a cero de los costos de distribución por tiendas.
  * Despliegue continuo directo mediante GitHub Actions y plataformas como Vercel o servidores Node.js.
  * Mantenimiento centralizado en un único árbol de código fuente.
* **Riesgos técnicos identificados:**
  * *Inconsistencia entre motores de navegador:* Safari (WebKit) impone cuotas de almacenamiento y políticas de ciclo de vida de caché más agresivas que Chrome (Blink).
  * *Invalidación de caché:* Riesgo de que los clientes sirvan versiones desactualizadas de los activos si las estrategias de caché del Service Worker no se diseñan adecuadamente.
* **Estrategia de mitigación:**
  * Aplicar estrategias de caché bien delimitadas (Cache First para assets estáticos, Network First / Stale While Revalidate para datos).
  * Implementación de pruebas automatizadas y comprobaciones de compatibilidad en pipelines de CI.

## Validación futura
La efectividad de esta decisión arquitectónica se validará en las siguientes etapas:
1. **Semana 1:** Compilación limpia de Next.js, paso de la prueba base y reporte verde en GitHub Actions (`make verify`).
2. **Semanas 2–5 (PWA Core):** Registro de Web App Manifest y Service Worker, verificando la instalación en un dispositivo Android y un dispositivo iOS.
3. **Validación de desconexión:** Pruebas de campo simulando pérdida total de red (Network Throttling -> Offline en DevTools) verificando que el listado de inspecciones se mantenga interactivo y operativo.