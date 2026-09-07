# Requisitos del producto — completar en Semana 1

> Conserva estos encabezados y reemplaza las instrucciones por tu análisis. No uses datos reales.

## 1. Problema y contexto

En los laboratorios de la Universidad Tecnológica de Tehuacán (UTT), el personal técnico e 
inspectores requieren registrar inspecciones de mantenimiento, consultar antecedentes y dar 
seguimiento a hallazgos. Las instalaciones sufren de conectividad intermitente o nula en 
sótanos y áreas blindadas. La solución debe ser una Aplicación Web Progresiva (PWA) 
instalable, resiliente y verificable que garantice que la captura y consulta de datos no se 
detengan ante la falta de red. 

## 2. Usuarios y escenarios

Usuario principal: Inspector de Mantenimiento de Laboratorio (Rol técnico). 
● Escenario 1 (Conectividad estable): El inspector inicia la aplicación en la oficina con 
conexión a red, navega por el App Shell y consulta las inspecciones registradas 
previamente. 
● Escenario 2 (Conectividad intermitente / Offline): El inspector ingresa al laboratorio de 
Química en el sótano donde se pierde la señal. La PWA mantiene la interfaz activa (App 
Shell), permite consultar los antecedentes guardados en caché local y registrar nuevos 
hallazgos sin congelar la aplicación ni mostrar pantallas de error. 

## 3. Requisitos funcionales

- **RF-01 — Visualización del App Shell e inspecciones base.** Vinculado al Escenario 1 (conectividad estable). Al ingresar a `http://localhost:3000`, el sistema muestra la estructura navegable y la lista de inspecciones sintéticas registradas (ubicación, fecha, responsable, estado, hallazgos). **Aceptación:** la pantalla inicial despliega al menos 3 inspecciones con todos sus campos visibles, sin necesidad de configuración adicional.

- **RF-02 — Consulta resiliente ante pérdida de conexión.** Vinculado al Escenario 2 (conectividad intermitente). El usuario debe poder seguir consultando las inspecciones ya cargadas aunque la red se interrumpa después de la carga inicial, sin que la aplicación muestre pantallas de error ni quede congelada. **Aceptación:** al simular modo "Offline" en las DevTools después de cargar la página, los registros ya mostrados permanecen visibles y la navegación entre ellos sigue funcionando.

- **RF-03 — Registro de nueva inspección (producto futuro, no se implementa esta semana).** El inspector podrá capturar una inspección indicando laboratorio, fecha y hallazgo. **Aceptación:** al guardar datos válidos, aparece un nuevo registro en la lista con esos mismos valores. Describirlo ahora no obliga a programarlo en la Semana 1.

- **RF-04 — Sincronización de hallazgos capturados sin conexión (producto futuro).** Vinculado al Escenario 2. Un hallazgo registrado sin red se guarda localmente y se sincroniza al recuperar conexión. **Aceptación:** al reconectar, el registro capturado offline aparece reflejado con un estado de "sincronizado" y sin duplicados.

## 4. Requisitos no funcionales

- **RNF-01 (Reproducibilidad).** El proyecto debe instalarse limpio con `npm ci` y arrancar con `npm run dev` en Node.js 20+ sin errores de compilación. **Cómo/cuándo comprobar:** en cada entrega, ejecutando ambos comandos en un entorno limpio (o en GitHub Actions) y confirmando código de salida 0.

- **RNF-02 (Accesibilidad).** Los elementos interactivos (tarjetas de inspección, navegación) deben tener contraste de texto suficiente y ser operables con teclado. **Cómo/cuándo comprobar:** auditoría manual y con Lighthouse (categoría Accessibility ≥ 90) a partir de la semana en que se trabaje la interfaz.

- **RNF-03 (Seguridad).** El repositorio no debe exponer secretos, tokens, llaves ni variables de entorno (`.env`). **Cómo/cuándo comprobar:** revisión de `.gitignore` y búsqueda de patrones de credenciales antes de cada push, y como parte del checklist de `make verify`.

- **RNF-04 (Privacidad).** Todos los datos usados deben ser sintéticos; no se permite información real de personas, laboratorios o estudiantes de la UTT. **Cómo/cuándo comprobar:** revisión del contenido de `src/lib/data` en cada entrega semanal.

- **RNF-05 (Rendimiento).** La pantalla inicial debe mostrar contenido visible (First Contentful Paint) en menos de 1.8 segundos bajo una red 3G simulada. **Cómo/cuándo comprobar:** métrica de Lighthouse Performance, a partir de la semana en que se optimice la carga inicial.

- **RNF-06 (Operación offline futura).** A partir de la semana correspondiente, la aplicación deberá conservar el último estado conocido (App Shell + datos en caché) cuando no haya red disponible. **Cómo/cuándo comprobar:** prueba manual alternando conexión/desconexión en DevTools una vez implementado el Service Worker (semana 3).

## 5. Datos sintéticos y límites

Dentro del alcance: Inspecciones sintéticas de laboratorio, interfaz Next.js con App Router, 
verificación automatizada mediante scripts de prueba local y CI. 
Fuera del alcance: Datos reales de alumnos o docentes de la UTT, integraciones 
institucionales reales, pasarelas de pago, autenticación real o despliegue completo de PWA 
(manifest/service worker) en esta Semana 01. 

## 6. Criterios de aceptación de la Semana 1

- **Instalación reproducible:** `npm ci` termina sin errores usando el lockfile del repositorio.
- **Arranque y datos sintéticos:** `npm run dev` levanta el servidor y `http://localhost:3000` muestra las 3 inspecciones sintéticas descritas en el Escenario 1.
- **Requisitos funcionales y no funcionales documentados:** las secciones 3 y 4 de este documento están completas, numeradas y cada una indica cómo/cuándo se verifica.
- **Verificación automatizada:** `npm run verify` finaliza con `Starter verificable: PASS` y genera `reports/verification.json`.
- **Chequeo estructural opcional:** `bash public-tests/check.sh` confirma que existen los archivos requeridos del starter.
- **Integración continua:** el workflow de GitHub Actions del commit evaluado termina en verde.

