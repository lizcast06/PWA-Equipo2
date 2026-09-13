# Evidencia individual del proyecto

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