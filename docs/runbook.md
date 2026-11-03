# Runbook · Publicar, detectar fallos y volver atrás

Qué hacer si una versión publicada de la PWA de inspecciones falla. Todos los datos son sintéticos. El proceso completo de release está en [`release-process.md`](release-process.md).

| Criterio | Dónde se demuestra |
|---|---|
| AC-02 Implementación | §1 versión identificable · §3 rollback · §4 Service Worker |
| AC-03 Pruebas | §2 smoke · §5 simulacro con una versión defectuosa |
| AC-04 Ingeniería | §5 hallazgos · §6 límites |

## 1. Identificar qué versión está publicada

```bash
curl -s http://localhost:3100/api/health
docker inspect -f '{{.Config.Image}} {{.State.Health.Status}}' pwa
```

`/api/health` responde `{"status":"ok","version":"0.10.0","commit":"<sha>"}`. La versión y el commit se fijan **al compilar la imagen** (`--build-arg APP_VERSION`, `--build-arg GIT_SHA`), y la versión también se ve en **Ajustes**. Cada imagen se etiqueta con su commit (`pwa-inspecciones:<sha>`), así que siempre se sabe a qué regresar.

## 2. Comprobar una versión con el smoke test

```bash
SMOKE_URL=http://localhost:3100 EXPECTED_COMMIT=<sha> npm run test:smoke
```

`tests/smoke.spec.ts` comprueba, contra lo ya publicado: health check y commit esperado, pantallas clave y versión visible, archivos de la PWA y encabezados de seguridad, y el flujo crítico (capturar sin conexión, reconectar, una sola inspección enviada).

**Cuándo hacer rollback:** si falla cualquier prueba del smoke después de publicar, o si se confirma que no se pueden capturar o enviar inspecciones. **No basta con mirar el health check** (ver §5).

## 3. Volver a la versión anterior

Requisito: conservar la imagen buena anterior.

```bash
docker rm -f pwa
docker run -d --name pwa -p 3100:3000 pwa-inspecciones:<sha-anterior>
# esperar a que docker inspect indique healthy
curl -s http://localhost:3100/api/health
SMOKE_URL=http://localhost:3100 EXPECTED_COMMIT=<sha-completo-anterior> npm run test:smoke
```

Solo se da por terminado cuando el smoke pasa y `commit` es el de la versión anterior.

Si la imagen no está en la máquina, se recupera del artefacto de Actions de ese commit (`docker load`) o se reconstruye desde ese commit con el mismo `docker build`.

**Datos de las personas:** las inspecciones viven en el `localStorage` de cada dispositivo, no en la imagen, así que cambiar de imagen no las borra. Las que estaban sin enviar se envían al volver a una versión sana.

## 4. Service Worker después de un rollback

El servidor puede volver atrás en segundos, pero el navegador conserva su Service Worker y su caché. Por eso:

- Una **corrección** se publica con un número de caché nuevo en `public/sw.js`: el navegador detecta el archivo distinto y descarta las cachés anteriores al activarse.
- Si un dispositivo se queda con una versión mala: abrir la app con conexión y recargar; como último recurso, en DevTools → Application → Service Workers → **Unregister** y recargar. No borrar el almacenamiento del sitio si hay inspecciones sin enviar, porque se perderían.
- JS, CSS y pantallas usan Network-First: con conexión se sirve lo publicado; sin conexión, la última copia guardada.

El flujo de actualización con aviso al usuario y su prueba están en `public/sw.js` y `tests/e2e/sw-update.spec.ts`.

## 5. Simulacro con una versión defectuosa (3 de noviembre de 2026)

**Preparación:** imagen buena `pwa-inspecciones:5b614f1` (0.10.0) e imagen `pwa-inspecciones:defectuosa` (0.10.1), con un defecto controlado **que compila**: `saveNewInspection` lanza un error, de modo que no se puede guardar ninguna inspección. El código se restauró de inmediato y no se integró.

| Paso | Acción | Resultado observado |
|---|---|---|
| 1 | Publicar la versión defectuosa | `docker` → `healthy`; `/api/health` → `ok`, `0.10.1`, `defectuosa` |
| 2 | Ejecutar el smoke | **3 pasan y 1 falla:** "flujo crítico…": no aparece "Detalle de la inspección" tras guardar |
| 3 | Rollback a `5b614f1` | `healthy`; `/api/health` → `ok`, `0.10.0`, `5b614f13…` |
| 4 | Ejecutar el smoke con `EXPECTED_COMMIT` | **4 de 4 pasan** |

**Hallazgos:**
1. **El health check dijo `healthy` con la versión defectuosa.** Solo confirma que el servidor responde, no que la app funcione. Por eso el rollback se decide con el smoke, y el smoke incluye el flujo crítico.
2. **Un primer intento del simulacro no fue válido:** el defecto no compilaba, no se creó la imagen y el smoke falló 4 de 4 **porque no había servidor**, no porque detectara algo. Se repitió con un defecto que compila. Un fallo solo cuenta como evidencia si falla por el motivo esperado.

## 6. Límites

- **Sin despliegue público:** el simulacro corre en Docker local y en CI. No hay balanceador ni cambio sin interrupción: durante el rollback el servicio se detiene unos segundos.
- **Sin backend ni base de datos reales:** no hay migraciones que revertir. En producción, volver atrás también debería contemplar datos y esquemas.
- **El smoke cubre lo esencial,** no todo: la cobertura amplia está en las pruebas unitarias, de integración y E2E.
- **HTTPS:** el contenedor sirve HTTP; en producción va detrás de un proxy con TLS, que es donde aplica `Strict-Transport-Security`.
