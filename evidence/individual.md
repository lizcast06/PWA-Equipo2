# Evidencia individual — Semana 1

## Integrante 1: (Nombre Completo de Integrante 1)
- **Nombre:** Dana Lizbeth Castañeda Dánchez 
- **Repositorio y commit evaluado:** lizcast06/pwa-equipo2 (3a2c56eeb1c03e148e784e35620a5a47ba53a196)
- **Mi contribución concreta:** Creación e inicialización del repositorio privado del equipo, invitación de colaboradores y redacción de las secciones 1 (Problema y contexto), 2 (Usuarios y escenarios de uso bajo conectividad intermitente) y 5 (Datos sintéticos y límites) en `docs/requirements.md`.
- **Decisión técnica que puedo explicar:** La delimitación de los alcances del sistema y la definición de una política estricta de datos sintéticos para evitar la inclusión de credenciales, nombres reales o infraestructura sensible de la universidad.
- **Comando o prueba que ejecuté y resultado:** `npm ci && npm run dev`. El servidor inició exitosamente en `http://localhost:3000` desplegando la interfaz inicial con los 3 registros sintéticos de prueba sin errores de consola.
- **Qué comprueba y qué no:** Comprueba la correcta instalación determinista mediante lockfile y el renderizado funcional de la interfaz en modo desarrollo. No comprueba empaquetado de producción ni capacidades offline.
- **Limitación o riesgo que encontré:** Dificultad para modelar escenarios realistas de campo sin depender de datos de infraestructura real del campus.
- **Uso de IA:** Se utilizó Gemini para estructurar la redacción formal de los escenarios de usuario; validado y adaptado personalmente al contexto de los laboratorios universitarios.

---

## Integrante 2: Abraham Cervantes Romero
- **Nombre:** Abraham Cervantes Romero
- **Repositorio y commit evaluado:** lizcast06/pwa-equipo2 (68edabf3f29229b9afc0c5652c5b41d3fb8a0a5e)
- **Mi contribución concreta:** Redacción técnica integral del registro arquitectónico `docs/decision-record.md` (ADR-001), elaborando la matriz comparativa de las cuatro opciones (PWA, Web Tradicional, Nativa y Multiplataforma), así como la justificación técnica de la selección de Next.js PWA.
- **Decisión técnica que puedo explicar:** Justificación de la arquitectura PWA frente a una aplicación nativa o multiplataforma. Defiendo que el modelo PWA elimina la fricción y costo de publicación en tiendas oficiales, garantizando soporte offline mediante Service Workers con una única base de código TypeScript.
- **Comando o prueba que ejecuté y resultado:** `npm run verify`. Ejecución exitosa con código de salida 0. Pasó la prueba unitaria base `tests/starter.spec.mjs` y compiló el proyecto Next.js en producción, generando `reports/verification.json`.
- **Qué comprueba y qué no:** Comprueba la integridad estructural del starter, consistencia de archivos y compilación limpia de Next.js en producción. No comprueba el registro de Service Workers ni la instalación del Web App Manifest (previsto para semanas futuras).
- **Limitación o riesgo que encontré:** Las discrepancias en políticas de almacenamiento y cuotas de Cache API entre motores de navegación (WebKit/Safari en iOS frente a Blink/Chromium en Android).
- **Uso de IA:** Se utilizó Gemini como apoyo en la síntesis y comparación multidimensional de las alternativas tecnológicas; la revisión técnica, justificación contextual y pruebas fueron ejecutadas y verificadas por mí.

---

## Integrante 3: (Nombre Completo de Integrante 3)
- **Nombre:** Emmanuel Castro Salvador
- **Repositorio y commit evaluado:** lizcast06/pwa-equipo2 (c9160fd93f25fe35c4f04da31fc2bbbfdea658ec)
- **Mi contribución concreta:** Redacción técnica de las secciones 3 (Requisitos funcionales numerados y verificables), 4 (Requisitos no funcionales medibles) y 6 (Criterios de aceptación) en `docs/requirements.md`.
- **Decisión técnica que puedo explicar:** Establecimiento de criterios de aceptación medibles y verificables (auditorías WCAG AA, métricas Core Web Vitals en red móvil y verificación reproducible mediante lockfile).
- **Comando o prueba que ejecuté y resultado:** `npm test` y comprobación estructural con `bash public-tests/check.sh`. Ambos comandos finalizaron con éxito (código 0) confirmando que la suite mínima pasa sin fallos.
- **Qué comprueba y qué no:** Comprueba que las aserciones de la prueba de inicio son válidas y que los archivos requeridos están en su ruta correcta. No certifica ausencia de vulnerabilidades de seguridad ni cobertura exhaustiva de pruebas de interfaz.
- **Limitación o riesgo que encontré:** Establecer condiciones de aceptación verificables para la Semana 1 sin adelantar código ni implementar librerías que corresponden a semanas posteriores.
- **Uso de IA:** Se utilizó Gemini para consultar la redacción técnica estándar de requisitos bajo IEEE 830; validado y filtrado manualmente.