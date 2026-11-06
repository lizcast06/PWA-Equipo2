# Semana 10 · Proceso de release

Cómo se construye, verifica y conserva una versión de la PWA de inspecciones (datos sintéticos, Universidad Tecnológica de Tehuacán). Qué hacer si una versión publicada falla, cómo volver atrás y el simulacro con una versión defectuosa están en [`runbook.md`](runbook.md).

## Versionado

- **Qué identifica una versión:** el número de `package.json` (`0.10.0`) y el commit de Git. El número dice qué cambió para las personas; el commit dice exactamente qué código se compiló.
- **Dónde se ve:** `/api/health` (`{"status":"ok","version":"0.10.0","commit":"<sha>"}`), la pantalla **Ajustes** ("Versión 0.10.0 · commit abc1234"), las etiquetas OCI de la imagen (`org.opencontainers.image.version` y `.revision`) y `release-manifest.json`.
- **Cómo se fija:** `docker build` recibe `APP_VERSION` (leído de `package.json`) y `GIT_SHA` (`github.sha`). La imagen se etiqueta `pwa-inspecciones:<sha>`. Si se construye sin argumentos, la versión es `0.10.0` y el commit `local` (`tests/unit/release-version.test.ts` comprueba que el valor por defecto del Dockerfile coincide con `package.json`).
- En un `pull_request`, `github.sha` es el commit de integración que GitHub evalúa; en un `push`, el commit de la rama. La comparación se hace siempre contra ese mismo SHA.
- **Política:** MAJOR para cambios incompatibles, MINOR para capacidades compatibles y PATCH para correcciones. El número de caché de `public/sw.js` sube en cada release que cambie la app (ver "Actualización del Service Worker").

## Etapas del pipeline

Todas están en `.github/workflows/academic-evaluation.yml` y corren en cada `push` y `pull_request`:

1. **Verificación previa:** `npm ci`, lint, tipos, build, suites heredadas, unit e integración con cobertura y E2E (Playwright contra `next start`). Si algo falla, no se construye la imagen.
2. **Construcción:** `docker build -t pwa-inspecciones:<sha> --build-arg APP_VERSION=<versión> --build-arg GIT_SHA=<sha> .`. El Dockerfile usa Node `22.22.0-bookworm-slim`, instala con `npm ci` desde el lockfile, compila en modo `standalone` y la imagen final corre con el usuario sin privilegios `node`.
3. **Arranque:** `docker run -d --name pwa -p 3100:3000 pwa-inspecciones:<sha>`. El E2E también usa el puerto 3100, pero su servidor termina antes de este paso.
4. **Disponibilidad:** hasta 30 intentos contra `/api/health`, con 2 segundos entre ellos. La respuesta se guarda en `release-evidence/health.json`. Que responda solo prueba que el servidor está arriba.
5. **Identidad:** se exige `status === "ok"` y `commit === github.sha`. Si el commit no coincide o falta, el job falla.
6. **Smoke contra el contenedor:** `npm run test:smoke` con `SMOKE_URL=http://localhost:3100` y `EXPECTED_COMMIT`. Las 4 pruebas de `tests/smoke.spec.ts` comprueban el health check y el commit, las pantallas clave y la versión en Ajustes, los archivos de la PWA y los encabezados de seguridad, y el flujo crítico: capturar sin conexión, reconectar y que quede una sola inspección enviada.
7. **Empaquetado:** con `if: always()`, `docker save | gzip` y un `sha256` del archivo. Si no hay imagen, se deja `image-unavailable.txt` en lugar de un archivo vacío.
8. **Manifiesto:** `release-manifest.json` con versión, commit, fecha UTC, imagen y el resultado de cada etapa (`build`, `health`, `commit`, `smoke`, `export`).
9. **Evidencia:** tres artefactos, que se suben aunque algo haya fallado: `manifiesto-release-<sha>`, `imagen-release-<sha>` y `reportes-verificacion-<sha>` (cobertura, `test-results/` con `smoke-junit.xml`, reporte de Playwright y `release-evidence/` con el health, los logs y el `inspect` del contenedor). Al final se elimina el contenedor.

## Criterios para publicar una versión

Una versión se da por buena solo si:

- el job **Verificación completa** termina en verde para ese commit;
- el manifiesto marca `success` en las cinco etapas;
- `/api/health` devuelve el commit esperado y el smoke pasa 4 de 4.

Si el smoke falla después de publicar, se vuelve a la imagen anterior siguiendo `runbook.md` §3.

## Criterios de aceptación de la actividad

| Criterio del kit | Cómo se cumple | Evidencia |
|---|---|---|
| **AC-01** El proyecto instala y compila en un entorno limpio | `npm ci` y build en CI; la imagen se construye desde el lockfile con una versión fija de Node | Corrida verde del workflow; `make verify` en local |
| **AC-02** Los artefactos de la actividad existen y son inspeccionables | `Dockerfile`, este documento, `docs/runbook.md`, `tests/smoke.spec.ts` y el workflow; la imagen, el manifiesto y los reportes se descargan desde Actions | Artefactos de cada corrida |
| **AC-03** Las pruebas cubren lo crítico y fallan ante una regresión | El smoke incluye el flujo crítico; con un defecto controlado el job sale en rojo en la etapa del smoke y aun así sube los reportes | Corridas roja y verde (abajo); simulacro de `runbook.md` §5 |
| **AC-04** La decisión técnica y su evidencia son legibles | Decisiones, trade-offs y límites de este documento y del runbook | Este documento |

## Decisiones y trade-offs

- **Imagen como artefacto de Actions, no en un registro.** Un registro (GHCR, Docker Hub) necesita un token con permiso de escritura, y la actividad pide no manejar secretos. El artefacto queda ligado a la corrida y al commit, y cualquiera con acceso al repositorio lo descarga. A cambio pesa unos 100 MB por corrida, caduca con la retención de Actions y no se puede hacer `docker pull`.
- **Sin tags de Git.** La versión se identifica con `package.json` y el commit, que es lo que se entrega y se evalúa. Un tag es una referencia más que se puede crear tarde o mover; en el primer parcial los tags tardíos invalidaron entregas, y la actividad no los pide.
- **Se compila dos veces** (para el E2E y dentro de Docker). Cuesta tiempo, pero el smoke prueba la imagen que se entregaría, no el build de las pruebas.
- **Node fijo y lockfile:** la instalación es repetible. La imagen base no está fijada por digest, así que no se afirma una imagen idéntica bit a bit.

## Actualización del Service Worker

Una versión nueva del Service Worker no se activa sola: queda en espera, la app muestra "Hay una versión nueva" y solo cambia cuando la persona pulsa **Actualizar**. Si su precache obligatorio falla, sigue la versión anterior. El detalle está en `docs/cache-strategy.md` (sección 6), la recuperación en `runbook.md` §4 y las pruebas en [`tests/e2e/sw-update.spec.ts`](../tests/e2e/sw-update.spec.ts).

## Recuperar una imagen guardada

Descargar el artefacto `imagen-release-<sha>` de la corrida y, en Bash:

```bash
sha256sum -c pwa-inspecciones-<sha>.tar.gz.sha256
gzip -dc pwa-inspecciones-<sha>.tar.gz | docker load
docker run -d --name pwa -p 3100:3000 pwa-inspecciones:<sha>
curl -s http://localhost:3100/api/health
SMOKE_URL=http://localhost:3100 EXPECTED_COMMIT=<sha> npm run test:smoke
```

La versión y el commit de `/api/health` deben coincidir con `release-manifest.json`. La integridad del archivo se comprueba con el `sha256`, no con el `imageId`: ese identificador puede cambiar según el motor de Docker que carga la imagen (en Docker Desktop salió distinto al del manifiesto de CI).

## Límites

- **Sin despliegue público:** la imagen se construye, se prueba y se guarda; no se publica en un servidor externo ni se crea un GitHub Release.
- **Sin backend ni base de datos reales:** la sincronización se simula en el navegador; no hay migraciones que revertir.
- **Solo Chromium:** no se prueba Safari/iOS.
- **`if: always()`** intenta guardar la evidencia, pero no la garantiza si falla la instalación, se agota el tiempo del job o falla el servicio de artefactos.
- **El checksum** detecta un archivo alterado; no es una firma de origen.

## Evidencia de CI

| Corrida | Commit | Resultado |
|---|---|---|
| [Verificación completa #65](https://github.com/lizcast06/PWA-Equipo2/actions/runs/42042250960) | `95dbc26` (pipeline del release) | Verde: las 5 etapas en `success`, smoke 4/4 |
| [Defecto controlado #72](https://github.com/lizcast06/PWA-Equipo2/actions/runs/42153997369) | `4186e66` (título esperado incorrecto en el smoke) | Rojo solo en "Smoke test del release" (3 pasan, 1 falla: esperaba otro título en Ajustes); el manifiesto marca `smoke: failure` y se subieron manifiesto, imagen y reportes |
| Corrida del commit que revierte el defecto | ver [PR #26](https://github.com/lizcast06/PWA-Equipo2/pull/26) | Verde |

El SHA final evaluado y el enlace a su corrida se registran en la entrega de Classroom, porque escribirlos aquí crearía otro commit distinto al evaluado.
