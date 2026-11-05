# Semana 10 · Proceso de release

## Alcance y versión

Proyecto académico con datos sintéticos. `package.json` declara `0.10.0` y Next.js `15.5.28`. La versión se lee de ese archivo al construir; no se modifica en esta entrega. Política propuesta: MAJOR para incompatibilidades, MINOR para capacidades compatibles y PATCH para correcciones compatibles. Es una política de trabajo, no un historial de publicaciones comprobado.

La imagen se identifica como `pwa-inspecciones:<github.sha>`; versión funcional y commit cumplen funciones diferentes. En eventos pull_request, `github.sha` puede corresponder al commit de integración que GitHub evalúa. La comparación se hace contra ese mismo SHA del checkout, no contra una rama asumida. No se crean tags Git ni commits en main.

## Etapas y explicación para defensa

1. **Verificación previa.** Instalación limpia, lint, tipos, build, pruebas heredadas, cobertura y E2E preceden al release. Si fallan, la construcción del release se omite: conservar diagnóstico no significa aprobarlo.
2. **Construcción.** `docker build` recibe `APP_VERSION` desde package.json y `GIT_SHA` desde github.sha. El Dockerfile ya tiene etapas deps/build/runner con Node `22.22.0-bookworm-slim`, compilación standalone y usuario `node`. Los argumentos identifican el código compilado y las etiquetas OCI.
3. **Arranque.** `docker run -d --name pwa -p 3100:3000` expone el servidor del contenedor. Las E2E previas también usan 3100; Playwright administra su servidor y debe liberarlo al terminar. Un puerto ocupado hace fallar el arranque y queda registrado.
4. **Disponibilidad.** Hasta 30 consultas a `/api/health`, con conexión limitada a 2 segundos, petición a 5 segundos y pausas de 2 segundos. Se conserva la respuesta HTTP satisfactoria en `release-evidence/health.json`. HTTP correcto indica disponibilidad, todavía no acredita identidad.
5. **Identidad estricta.** Node analiza ese JSON y exige `status === 'ok'` y `commit === EXPECTED_COMMIT`, con comparación estricta y variable obligatoria. JSON inválido, commit ausente o distinto provocan fallo. No se acepta una coincidencia parcial ni la etiqueta de la imagen como sustituto de esta prueba.
6. **Smoke sobre el contenedor.** `npm run test:smoke` recibe `SMOKE_URL=http://localhost:3100` y `EXPECTED_COMMIT`. La configuración existente evita levantar otro servidor cuando se define SMOKE_URL. Las cuatro pruebas existentes verifican health/versión, pantallas, recursos PWA/encabezados y captura offline con sincronización sin duplicados. Repiten la comparación del commit mediante Playwright.
7. **Empaquetado y trazabilidad.** Con `if: always()`, se intenta `docker save | gzip`. Se usa pipefail y archivo temporal para no publicar una exportación incompleta como válida. Se genera un SHA-256 del archivo comprimido. Si no existe imagen, se conserva `image-unavailable.txt`; si el build decía success y falta la imagen, la exportación falla.
8. **Manifiesto.** También con `if: always()`, se escribe `release-manifest.json`: versión, commit, fecha UTC, nombre de imagen, imageId y resultados de build/health/commit/smoke/export. `imageId: null` indica que no se pudo inspeccionar la imagen; el manifiesto por sí solo no acredita un release aprobado.
9. **Evidencia y limpieza.** Tres subidas independientes con `if: always()` conservan manifiesto, imagen/checksum o explicación de ausencia, y reportes/diagnóstico. Se guardan logs e inspección del contenedor y al final se intenta eliminarlo. No se usa continue-on-error para esconder fallos de build, identidad, smoke o exportación.

## Criterios de aceptación

- **AC-01 · Construcción identificable.** Tras E2E exitoso, build recibe versión y SHA; la imagen se etiqueta por SHA y arranca en 3100:3000. Evidencia: logs de build/arranque, etiquetas OCI en la imagen y manifiesto.
- **AC-02 · Disponibilidad e identidad.** Health responde y su commit coincide exactamente con github.sha; ausencia, JSON inválido o diferencia hacen fallar el job. Evidencia: health.json y paso Verificar commit exacto del contenedor. El smoke vuelve a comprobarlo.
- **AC-03 · Funcionalidad del release.** Las cuatro pruebas smoke existentes pasan contra el contenedor mediante SMOKE_URL. Evidencia: `test-results/smoke-junit.xml` y trazas en `test-results/smoke/` cuando hay fallos.
- **AC-04 · Conservación de evidencia.** Se intentan exportación, manifiesto, diagnóstico y subidas aun después de fallos. Evidencia esperada en Actions: `manifiesto-release-<sha>`, `imagen-release-<sha>` y `reportes-verificacion-<sha>`. Si no se pudo construir, se publica la explicación de ausencia, no una imagen ficticia. La aceptación del release requiere job verde y resultados success de las cinco etapas del manifiesto.

## Recuperación manual de la imagen

Descargar y extraer el artefacto de imagen de Actions. En Bash, sustituir SHA por el commit completo evaluado:

```bash
sha256sum -c pwa-inspecciones-SHA.tar.gz.sha256
gzip -dc pwa-inspecciones-SHA.tar.gz | docker load
docker run --rm -p 3100:3000 pwa-inspecciones:SHA
```

Consultar `/api/health` y contrastar commit, versión e imageId con el manifiesto. Para repetir smoke se necesita el checkout, `npm ci` y Chromium instalado; ejecutar `SMOKE_URL=http://localhost:3100 EXPECTED_COMMIT=SHA npm run test:smoke` en otra terminal Bash.

## Trade-offs y límites

- Se compila una vez para E2E y otra dentro de Docker: cuesta tiempo, pero el smoke examina el producto empaquetado. El límite del job sigue siendo 25 minutos; no se ha medido aquí su suficiencia.
- Lockfile y versión de Node mejoran repetibilidad; la etiqueta base no está fijada por digest. No se afirma reproducibilidad binaria idéntica ni procedencia firmada.
- La imagen comprimida facilita revisión sin registry, a costa de tiempo, almacenamiento y retención de Actions. El checksum detecta alteración del archivo; no es firma ni acreditación independiente de origen.
- `if: always()` intenta conservar evidencia cuando fallan pasos. No garantiza archivos si checkout/instalación fallan, si el runner termina, se agota el tiempo o falla el servicio de artefactos. `if-no-files-found: warn` deja explícita la ausencia.
- Chromium y datos sintéticos no acreditan Safari/iOS, carga real, backend real ni autenticación de producción. Las pruebas existentes usan sincronización simulada en el navegador.
- Este flujo empaqueta y verifica; no despliega a un servicio externo ni crea una publicación GitHub Release.

## Evidencia realmente revisada y pendientes

Se leyeron los cinco archivos solicitados de la copia local cuyo origin apunta a `https://github.com/lizcast06/PWA-Equipo2.git`. Su HEAD es `feature/w10-ci-release`, basado en `587a507dcd6c86f5e5d95c80978c6ed08706b78f`. El workflow tenía modificaciones locales previas: build, run, espera health, smoke con EXPECTED_COMMIT y generación de manifiesto ya estaban presentes; la comparación estricta en smoke también existía. Dockerfile, package.json y configuración/pruebas smoke no requirieron modificaciones.

Nuevos cambios: verificación independiente de identidad, límites de curl, exportación/checksum, resultados por etapa en manifiesto, subidas de manifiesto/imagen, diagnóstico, limpieza y documentación.

La consulta remota de ramas no mostró `feature/w10-ci-release` durante esta revisión. Por ello no se presenta esta copia local como contenido verificado de esa rama en GitHub. El motor Docker local no estaba disponible; no se ejecutaron build, contenedor ni smoke completo. Tampoco se verificó una corrida de Actions para esta entrega. Registrar después el SHA publicado, URL de Actions, resultado de AC-01..AC-04 y artefactos descargados. No reutilizar corridas de semanas anteriores como evidencia de este release.
