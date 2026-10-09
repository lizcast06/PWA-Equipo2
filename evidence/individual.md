# Evidencia individual del proyecto

---
# Semana 6: Capacidades del dispositivo y notificaciones

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Estudiante:** Dana Lizbeth Castañeda Sánchez
- **Commit SHA evaluado:** b2eba7934783de11765236afbef1f9226a0bd6b4
- **Decisión técnica que puedo explicar:** Configuración del workflow de CI para la Semana 6 e implementación de los módulos `src/lib/device/camera.ts` y `src/lib/device/geolocation.ts`. Se estableció una arquitectura de fallback donde el acceso a hardware cuenta con alternativas directas: si la cámara webview rechaza el stream, se inyecta un input de captura por archivo; y si la geolocalización es denegada, se inyectan coordenadas sintéticas del campus UTT con la bandera `synthetic: true`.
- **Prueba que ejecuté y resultado:** `bash public-tests/check.sh` con salida `PUBLIC_OK` tras verificar los 5 artefactos y confirmar la ausencia de tokens o secretos en el repositorio.
- **Limitación o fallo diagnosticado:** El acceso a la cámara mediante `getUserMedia` requiere obligatoriamente contexto seguro (HTTPS o localhost); en entornos HTTP inseguros el navegador bloquea la API a nivel de política de seguridad del agente de usuario.
- **Cambio que podría defender o modificar en vivo:** Agregar una validación explícita con `window.isSecureContext` antes de invocar `navigator.mediaDevices` para detonar el fallback de archivo de forma inmediata sin lanzar excepciones.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para modelar los tipos de retorno de geolocalización; los parámetros de timeout y coordenadas sintéticas fueron ajustados manualmente.

---

## Integrante 2: Emmanuel Castro Salvador
- **Estudiante:** Emmanuel Castro Salvador
- **Commit SHA evaluado:** af8b676e942be3ed4b92b5b0f193a36e24411f6e
- **Decisión técnica que puedo explicar:** Creación del despachador de notificaciones en `src/lib/notifications/client.ts` y formalización de la documentación en `docs/capabilities.md`. Se diseñó un orden jerárquico de entrega: se intenta despachar la alerta mediante la suscripción del Service Worker; si no está disponible, se recurre a la Notification API clásica; y si los permisos son denegados o no existe soporte, se activa el callback de degradación in-app para no romper la experiencia del usuario.
- **Prueba que ejecuté y resultado:** Simulación de denegación de permisos de notificación en navegador. Se constató que `dispatchInspectionAlert` no arrojó un error fatal no controlado y entregó el mensaje correctamente a través del canal `IN_APP_FALLBACK`.
- **Limitación o fallo diagnosticado:** En dispositivos móviles con iOS WebKit, la API de Notificaciones Push exige que la PWA esté explícitamente instalada en la pantalla de inicio para conceder permisos.
- **Cambio que podría defender o modificar en vivo:** Incorporar un detector de estado de instalación PWA (`standalone`) para emitir una alerta explicativa al usuario en iOS antes de solicitar permisos de notificación.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para estructurar la matriz de estados de permisos; la lógica de degradación y el contenido de `docs/capabilities.md` fueron validados manualmente.

---

## Integrante 3: Abraham Cervantes Romero
- **Estudiante:** Abraham Cervantes Romero
- **Commit SHA evaluado:** a9af756176e437a7570e3ef24ff67cf8a4c8d516
- **Decisión técnica que puedo explicar:** Implementación de la suite determinista `tests/capabilities.spec.ts` y su orquestación en el script `"test"` de `package.json`. La suite verifica de manera determinista los contratos de fallback para captura fotográfica, la provisión de geolocalización sintética ante permisos denegados, la disponibilidad de canales in-app para alertas y la completitud del reporte técnico.
- **Prueba que ejecuté y resultado:** `npm run build && npm test`. El build de Next.js compiló sin incidencias (código 0) y las 7 suites acumulativas (starter, manifest, service-worker, offline, rendering, sync y capabilities) pasaron en verde.
- **Limitación o fallo diagnosticado:** Las pruebas en entorno headless de CI no poseen acceso a sensores físicos de cámara o GPS reales, por lo que la comprobación unitaria se enfoca en la robustez de los contratos de degradación y fallbacks sintéticos.
- **Cambio que podría defender o modificar en vivo:** Añadir pruebas E2E con mocks de `navigator.permissions` usando Playwright para emular las transiciones de permisos `prompt -> granted -> denied`.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para diseñar el esquema de aserciones de la suite de pruebas; la verificación en consola de Node 22 y el encadenamiento de scripts fueron ejecutados directamente por mí.

---
# Semana 5: Persistencia local y sincronización idempotente

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Estudiante:** Dana Lizbeth Castañeda Sánchez
- **Commit SHA evaluado:** 3e26bab3b5011509ddaae42b84916777373aca26
- **Decisión técnica que puedo explicar:** Definición del esquema tipado en `src/lib/storage/schema.ts` y redacción de la especificación técnica en `docs/sync-policy.md`. Se formalizaron las estructuras de `StoredInspection` y `SyncQueueItem`, estableciendo identificadores únicos de mutación (`clientMutationId`) y un límite determinista de 3 reintentos antes de transferir elementos a estado no bloqueante.
- **Prueba que ejecuté y resultado:** `bash public-tests/check.sh` con resultado `PUBLIC_OK` tras verificar los 5 artefactos requeridos y confirmar la ausencia de credenciales en el repositorio.
- **Limitación o fallo diagnosticado:** El almacenamiento en esquema estático asume disponibilidad de storage del navegador; en navegación privada extrema con cuotas restringidas a 0 MB, la inserción local requiere captura de excepciones `QuotaExceededError`.
- **Cambio que podría defender o modificar en vivo:** Agregar una función de validación de esquema en tiempo de ejecución (runtime schema parser) para rechazar mutaciones con tipos incompatibles antes de encolarlas.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para estructurar la matriz de reintentos; los campos del esquema y la configuración de stores fueron ajustados manualmente.

---

## Integrante 2: Emmanuel Castro Salvador
- **Estudiante:** Emmanuel Castro Salvador
- **Commit SHA evaluado:** e4bdc7e9017a783d5cd0fdf313350e5b7ac4be73
- **Decisión técnica que puedo explicar:** Implementación de la cola de sincronización en `src/lib/sync/queue.ts` y el algoritmo de resolución de conflictos en `src/lib/sync/conflict-policy.ts`. Se garantizó la idempotencia verificando la existencia previa de `mutationId` tanto en memoria activa como en el conjunto de mutaciones procesadas, aplicando una regla LWW basada en versión estricta y desempate por timestamp.
- **Prueba que ejecuté y resultado:** Simulación interactiva de desconexión y recuperación de red. Se confirmó que múltiples invocaciones con un mismo `clientMutationId` no duplicaron registros en cola y que ante divergencia de versiones se preservó la entidad con mayor jerarquía.
- **Limitación o fallo diagnosticado:** Si el reloj del dispositivo cliente se encuentra descalibrado, el desempate por timestamp de Last-Write-Wins puede beneficiar a un cliente con desfase horario; por ello la versión numérica prevalece sobre la marca temporal.
- **Cambio que podría defender o modificar en vivo:** Reemplazar el desempate por timestamp puro por un vector de versiones (Vector Clock) para detectar concurrencia real entre múltiples inspectores.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para modelar el ciclo de reintentos de la cola; la lógica de desempate y tipos de retorno fueron verificados manualmente.

---

## Integrante 3: Abraham Cervantes Romero
- **Estudiante:** Abraham Cervantes Romero
- **Commit SHA evaluado:** bd1e1039515b1a2f88372f01e4f069d515ca22b7
- **Decisión técnica que puedo explicar:** Creación de la suite determinista `tests/sync.spec.ts` y su integración en el pipeline de validación (`package.json`). La prueba comprueba de manera aislada el rechazo de mutaciones duplicadas (idempotencia), el vaciado exitoso de la cola tras sincronización simulada, el incremento del contador de reintentos ante fallas de transporte y la resolución correcta del conflicto a favor del registro con versión superior.
- **Prueba que ejecuté y resultado:** `npm run build && npm test`. El build finalizó con código 0 y las 6 suites acumulativas (starter, manifest, service-worker, offline, rendering y sync) pasaron en verde.
- **Limitación o fallo diagnosticado:** La suite actual valida la cola y la resolución de conflictos a nivel unitario en memoria; no ejecuta transacciones reales contra IndexedDB sobre un motor Chromium sin headless browser.
- **Cambio que podría defender o modificar en vivo:** Añadir aserciones adicionales en `tests/sync.spec.ts` que simulen la llegada de mutaciones fuera de orden cronológico.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para generar el esqueleto de las aserciones de prueba; la integración del script de pruebas en Node, depuración y validación local fueron efectuadas directamente por mí.

---

# Semana 4: Renderizado CSR/SSR con estados verificables

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Estudiante:** Dana Lizbeth Castañeda Sánchez
- **Commit SHA evaluado:** 7d19bb376d29948fefb33f4fdfd06c19bc35a326
- **Decisión técnica que puedo explicar:** Definición del componente de carga `src/components/loading-state.tsx` con atributos semánticos de accesibilidad (`role="status"` y `aria-live="polite"`), y elaboración de la matriz comparativa de trade-offs en `docs/rendering-decision.md` justificando el impacto en FCP y la prevención de hydration mismatch.
- **Prueba que ejecuté y resultado:** `bash public-tests/check.sh` completado con resultado `PUBLIC_OK` tras verificar los 5 artefactos obligatorios y la ausencia de cadenas de credenciales en el repositorio.
- **Limitación o fallo diagnosticado:** El componente de carga asume estilos basados en Tailwind CSS; si el bundle de estilos falla al cargar en red degradada, el spinner depende de animaciones CSS nativas.
- **Cambio que podría defender o modificar en vivo:** Incorporar variantes de skeleton screens dentro de `loading-state.tsx` en lugar de un único spinner central.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para formular la estructura comparativa de FCP; las propiedades ARIA y los criterios fueron validados manualmente contra WCAG 2.1.

---

## Integrante 2: Emmanuel Castro Salvador
- **Estudiante:** Emmanuel Castro Salvador
- **Commit SHA evaluado:** 9df7b03f74019974b85b56525917c36419ed64ad
- **Decisión técnica que puedo explicar:** Arquitectura dual de rutas en Next.js App Router: implementación de `/inspecciones` como Server Component para pre-renderizado del catálogo y `/inspecciones/[id]` como Client Component reactivo para interactividad en detalle con desacoplamiento de estado.
- **Prueba que ejecuté y resultado:** `npm run dev` y navegación interactiva en `http://localhost:3000/inspecciones`. Se verificó la transición desde el catálogo hacia el detalle, observando el despliegue del loading state durante el montaje y el manejo de fallback visual ante un ID sintético inexistente.
- **Limitación o fallo diagnosticado:** En la ruta CSR, la emulación de red depende de un temporizador en memoria; en un entorno sin conexión estricta, la consulta debe coordinarse con el Service Worker implementado en la Semana 3.
- **Cambio que podría defender o modificar en vivo:** Agregar soporte de generación estática con `generateStaticParams` en la ruta dinámica para optimizar aún más el FCP de los IDs sintéticos conocidos.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para modelar el manejo de estados de carga/error en React; las interfaces de TypeScript y el ruteo se ajustaron y probaron manualmente.

---

## Integrante 3: Abraham Cervantes Romero
- **Estudiante:** Abraham Cervantes Romero
- **Commit SHA evaluado:** 14d2b14783949aa01490b5b043f8d7a1ce7d27ec
- **Decisión técnica que puedo explicar:** Diseño e integración de la suite determinista `tests/rendering.spec.ts`. Se implementaron validaciones estáticas sobre las directivas de renderizado (`use client` en CSR y ausencia en SSR), la presencia de hooks de estado y ciclo de vida, accesibilidad de estados de carga y coherencia métrica en la documentación técnica.
- **Prueba que ejecuté y resultado:** `npm run build && npm test`. El build de Next.js optimizó las páginas estáticas y dinámicas con código 0 y las 5 suites de pruebas acumulativas pasaron en verde (`rendering.spec.ts: PASS`).
- **Limitación o fallo diagnosticado:** La suite valida la presencia sintáctica y modular de las directivas en tiempo de build, pero no emula la renderización con un DOM virtual completo tipo JSDOM.
- **Cambio que podría defender o modificar en vivo:** Añadir aserciones en `tests/rendering.spec.ts` para verificar la existencia de etiquetas `aria-label` en la sección de listado SSR.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para el diseño de expresiones regulares de validación de directivas; la integración en `package.json`, depuración del build y ejecución local fueron efectuadas directamente por mí.

---

# Semana 3: Service worker y consulta offline

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Estudiante:** Dana Lizbeth Castañeda Sánchez
- **Commit SHA evaluado:** fc9fed86a4e6f0ae8dbe50b489eea469fe945a34
- **Decisión técnica que puedo explicar:** Definición de la matriz de estrategias de almacenamiento en `docs/cache-strategy.md`, seleccionando un modelo híbrido Network-First con fallback a caché estática para documentos HTML navegables y Cache-First para assets inmutables.
- **Prueba que ejecuté y resultado:** `bash public-tests/check.sh`. Resultado: `PUBLIC_OK`, confirmando la existencia de los cinco artefactos requeridos para la Semana 3 y la ausencia de cadenas de secretos o tokens.
- **Limitación o fallo diagnosticado:** Los recursos servidos por dominios de terceros o fuentes externas no se almacenan en tiempo de ejecución para evitar contaminación de cuota en el navegador.
- **Cambio que podría defender o modificar en vivo:** Ajustar los nombres de versión de caché (`pwa-inspecciones-static-v2`) para forzar una invalidación manual inmediata durante la activación.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para esquematizar la tabla comparativa de estrategias de caché; la validación técnica fue contrastada con los requisitos de la rúbrica.

---

## Integrante 2: Emmanuel Castro Salvador
- **Estudiante:** Emmanuel Castro Salvador
- **Commit SHA evaluado:** 2561afb7b9efa77952705ea945e53e339d63378c
- **Decisión técnica que puedo explicar:** Implementación del ciclo de vida del Service Worker en `public/sw.js` utilizando `self.skipWaiting()` durante la instalación y `clients.claim()` junto con `caches.delete()` en la activación, asegurando que no se sirvan versiones huérfanas o corruptas del App Shell.
- **Prueba que ejecuté y resultado:** `npm run dev` y registro en el navegador. Se constató en DevTools > Application > Service Workers que el worker queda activo en el scope `/` y el evento `fetch` intercepta peticiones.
- **Limitación o fallo diagnosticado:** En modo incógnito o en navegadores con cuotas de almacenamiento estrictas (WebKit en iOS), la Cache API puede depurarse automáticamente ante falta de espacio en disco.
- **Cambio que podría defender o modificar en vivo:** Modificar el enrutador de peticiones en `public/sw.js` para incluir una página dedicada `offline.html` en lugar de redirigir a `/`.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para revisar la estructura del listener `fetch`; el control de promesas y métodos de caché se depuraron manualmente.

---

## Integrante 3: Abraham Cervantes Romero
- **Estudiante:** Abraham Cervantes Romero
- **Commit SHA evaluado:** 7121853886da0d32a3e135cc9a6fa3059a759305
- **Decisión técnica que puedo explicar:** Diseño y codificación de las pruebas automatizadas en `tests/service-worker.spec.ts` y `tests/offline.spec.ts`. Se implementaron validaciones estáticas sobre el AST/contenido de los archivos para verificar la presencia de manejadores `install`, `activate`, `fetch`, reclamo de clientes e inclusión de artefactos en el precache.
- **Prueba que ejecuté y resultado:** `npm run build && npm test`. El build de producción completó con éxito (código 0) y el runner de pruebas pasó deterministamente las suites acumulativas (`service-worker.spec.ts: PASS` y `offline.spec.ts: PASS`).
- **Limitación o fallo diagnosticado:** Las pruebas validan la sintaxis e invariantes en Node sin levantar un contexto completo de Chromium/Puppeteer para probar la API `caches` en runtime.
- **Cambio que podría defender o modificar en vivo:** Añadir aserciones específicas en `tests/offline.spec.ts` para verificar que el arreglo `PRECACHE_ASSETS` no esté vacío.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para estructurar aserciones deterministas basadas en expresiones regulares sin dependencias externas pesadas; validado y ejecutado en local.

---

# Semana 2: App shell instalable y manifest

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Estudiante:** Dana Lizbeth Castañeda Sánchez
- **Commit SHA evaluado:** fcd2799c830741cf635d74d9f8e9d8ed98d91aca
- **Decisión técnica que puedo explicar:** Declaración de metadatos y configuración del Web App Manifest en `public/manifest.webmanifest`. Se estableció `display: "standalone"`, `start_url: "/"` y `scope: "/"` para garantizar que la aplicación web se comporte como aplicación independiente al instalarse en dispositivos móviles y de escritorio, suprimiendo la barra de navegación del explorador.
- **Prueba que ejecuté y resultado:** Ejecución de `bash public-tests/check.sh` y verificación de `public/manifest.webmanifest`. Resultado: `PUBLIC_OK` tras constatar la existencia física de los cinco artefactos requeridos y la ausencia de credenciales o secretos en el árbol de archivos.
- **Limitación o fallo diagnosticado:** El manifest declara iconos en resoluciones `192x192` y `512x512` requeridos por la especificación PWA; sin embargo, en esta semana no se incluyen los binarios PNG finales generados por diseño, dependiendo de assets base provisionales.
- **Cambio que podría defender o modificar en vivo:** Ajustar los valores hexadecimales de `theme_color` (#0284c7) y `background_color` (#0f172a) en el manifest y layout para cumplir con las pautas de accesibilidad y contraste WCAG AA.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para corroborar la especificación W3C de campos del manifest y compatibilidad en navegadores móviles; la configuración e integración de rutas fue realizada y validada manualmente.

---

## Integrante 2: Abraham Cervantes Romero
- **Estudiante:** Abraham Cervantes Romero
- **Commit SHA evaluado:** cb90f159769bf65812e85c7d551d6bad7454b048
- **Decisión técnica que puedo explicar:** Implementación de la suite de pruebas unitarias automatizadas en `tests/manifest.spec.ts`. Se estructuraron aserciones deterministas sobre el contrato de instalación PWA (presencia de claves obligatorias, coherencia de alcance de `start_url` y existencia de landmarks semánticos en el AppShell) sin depender de librerías externas pesadas.
- **Prueba que ejecuté y resultado:** Ejecución de `npm run build && npm test`. Next.js compiló en modo producción con éxito (código 0) y el runner de pruebas completó todas las aserciones (`starter.spec.mjs: PASS` y `manifest.spec.ts: PASS`).
- **Limitación o fallo diagnosticado:** La prueba valida la integridad estructural y sintáctica de los archivos en tiempo de compilación mediante el sistema de archivos, pero no simula el ciclo de vida del evento interactivo de instalación del navegador (`beforeinstallprompt`).
- **Cambio que podría defender o modificar en vivo:** Ampliar las aserciones de `tests/manifest.spec.ts` para verificar de forma explícita que la orientación esté fijada en `portrait` y que los landmarks del shell incluyan atributos `aria-label` descriptivos.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para diagnosticar y corregir la incompatibilidad de resolución de módulos en `tsconfig.json` y el script de prueba en Windows/Node 20; la ejecución, depuración del build y validación del código fueron ejecutadas directamente por mí.

---

## Integrante 3: Emmanuel Castro Salvador
- **Estudiante:** Emmanuel Castro Salvador
- **Commit SHA evaluado:** 29f1b50feec290f3d60495336520a796a5138917
- **Decisión técnica que puedo explicar:** Arquitectura del componente modular `src/components/app-shell.tsx` y su integración en `src/app/page.tsx`. Se aplicaron landmarks semánticos de accesibilidad (`role="banner"`, `role="main"`, `role="contentinfo"`) y se incorporaron los límites de interfaz para representar estados de carga/sincronización, estado vacío adaptativo y visualización normal de inspecciones.
- **Prueba que ejecuté y resultado:** Ejecución de `npm run dev` en `http://localhost:3000`. Comprobé la navegación por teclado (tab focus) a través de los landmarks semánticos y el despliegue del componente ante datos sintéticos y colecciones vacías.
- **Limitación o fallo diagnosticado:** La barra de navegación inferior móvil (`role="navigation"`) enlaza a identificadores de anclaje provisionales (`#pendientes`, `#config`) dado que el enrutamiento a vistas secundarias está fuera del alcance de la Semana 2.
- **Cambio que podría defender o modificar en vivo:** Modificar la sección del empty state en `src/app/page.tsx` para agregar un botón interactivo de recarga o registro inicial.
- **Uso declarado de IA (herramienta, propósito, validación):** Se utilizó Gemini para generar la estructura semántica de landmarks accesibles en el cascarón; los componentes, props de TypeScript y la integración con las vistas fueron adaptados y comprobados manualmente.

---

# Historial acumulativo — Semana 1

## Integrante 1: Dana Lizbeth Castañeda Sánchez
- **Nombre:** Dana Lizbeth Castañeda Sánchez
- **Repositorio y commit evaluado:** https://github.com/lizcast06/PWA-Equipo2 — commit `3a2c56e` ("docs: definir problema, escenarios y política de datos sinteticos")
- **Mi contribución concreta:** Creación e inicialización del repositorio privado del equipo, invitación de colaboradores y redacción de las secciones 1 (Problema y contexto), 2 (Usuarios y escenarios de uso bajo conectividad intermitente) y 5 (Datos sintéticos y límites) en `docs/requirements.md`.
- **Decisión técnica que puedo explicar:** La delimitación de los alcances del sistema y la definición de una política estricta de datos sintéticos para evitar la inclusión de credenciales, nombres reales o infraestructura sensible de la universidad.
- **Comando o prueba que ejecuté y resultado:** `npm ci && npm run dev`. El servidor inició exitosamente en `http://localhost:3000` desplegando la interfaz inicial con los 3 registros sintéticos de prueba sin errores de consola.
- **Qué comprueba y qué no:** Comprueba la correcta instalación determinista mediante lockfile y el renderizado funcional de la interfaz en modo desarrollo. No comprueba empaquetado de producción ni capacidades offline.
- **Limitación o riesgo que encontré:** Dificultad para modelar escenarios realistas de campo sin depender de datos de infraestructura real del campus.
- **Uso de IA:** Se utilizó Gemini para estructurar la redacción formal de los escenarios de usuario; validado y adaptado personalmente al contexto de los laboratorios universitarios.

---

## Integrante 2: Abraham Cervantes Romero
- **Nombre:** Abraham Cervantes Romero
- **Repositorio y commit evaluado:** https://github.com/lizcast06/PWA-Equipo2 — commit `68edabf` ("docs: completar adr-001 con matriz comparativa y justificacion pwa")
- **Mi contribución concreta:** Redacción técnica integral del registro arquitectónico `docs/decision-record.md` (ADR-001), elaborando la matriz comparativa de las cuatro opciones (PWA, Web Tradicional, Nativa y Multiplataforma), así como la justificación técnica de la selección de Next.js PWA.
- **Decisión técnica que puedo explicar:** Justificación de la arquitectura PWA frente a una aplicación nativa o multiplataforma. El modelo PWA elimina la fricción y costo de publicación en tiendas oficiales, garantizando soporte offline mediante Service Workers con una única base de código TypeScript.
- **Comando o prueba que ejecuté y resultado:** `npm run verify`. Ejecución exitosa con código de salida 0, generando `reports/verification.json` con `status: pass`.
- **Qué comprueba y qué no:** Comprueba la integridad estructural del starter y la compilación limpia de Next.js. No comprueba el registro de Service Workers ni la instalación del Web App Manifest (previsto para semanas futuras).
- **Limitación o riesgo que encontré:** Las discrepancias en políticas de almacenamiento y cuotas de Cache API entre motores de navegación (WebKit/Safari en iOS frente a Blink/Chromium en Android) que deberán resolverse cuando se implemente el Service Worker.
- **Uso de IA:** Se utilizó Gemini como apoyo en la síntesis y comparación multidimensional de las alternativas tecnológicas; la revisión técnica, justificación contextual y pruebas fueron ejecutadas y verificadas por mí.

---

## Integrante 3: Emmanuel Castro Salvador
- **Nombre:** Emmanuel Castro Salvador
- **Repositorio y commit evaluado:** https://github.com/lizcast06/PWA-Equipo2 — commit `fd28356` ("docs: especificar requisitos funcionales, no funcionales y criterios s1")
- **Mi contribución concreta:** Redacción de las secciones 3 (Requisitos funcionales RF-01 a RF-04), 4 (Requisitos no funcionales RNF-01 a RNF-06) y 6 (Criterios de aceptación de la Semana 1) en `docs/requirements.md`, vinculando cada RF a los escenarios definidos por el equipo y agregando su criterio de aceptación correspondiente.
- **Decisión técnica que puedo explicar:** Vinculé RF-02 (consulta resiliente) y RF-04 (sincronización futura) al Escenario 2 de conectividad intermitente, y separé los RNF en seis dimensiones medibles (reproducibilidad, accesibilidad, seguridad, privacidad, rendimiento y offline futuro) indicando cómo y cuándo se comprobaría cada uno.
- **Comando o prueba que ejecuté y resultado:** `npm run verify`. Resultado real: `Starter verificable: PASS`, generando `reports/verification.json` con `"status": "pass"`. También resolví un conflicto de fusión real en `docs/requirements.md` al integrar mi commit con el de una compañera (`git pull`, `git stash`, `git stash pop`, resolución manual del conflicto).
- **Qué comprueba y qué no:** Comprueba que el proyecto instala, compila y pasa la prueba mínima provista, y que el documento de requisitos está completo y coherente. No comprueba manifest, Service Worker, sincronización real ni pruebas de accesibilidad automatizadas (quedan para semanas posteriores).
- **Limitación o riesgo que encontré:** Al trabajar en paralelo con el resto del equipo sobre el mismo archivo `docs/requirements.md`, tuve un conflicto de fusión real entre mi contenido (secciones 3 y 4) y los marcadores "pendiente" que había dejado mi compañera; se resolvió manualmente sin perder el trabajo de nadie.
- **Uso de IA:** Utilicé el asistente de IA integrado en Cursor (Claude) para redactar un primer borrador de los RF/RNF y los criterios de aceptación a partir del caso de estudio del curso, para resolver el conflicto de fusión en Git y para revisar que la evidencia de mis compañeros reflejara trabajo real y no contenido genérico. Validé manualmente cada requisito contra el enunciado de la actividad y ejecuté yo mismo `npm run verify` para confirmar el resultado.