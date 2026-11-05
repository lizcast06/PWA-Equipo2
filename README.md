# PWA de inspecciones de laboratorio

PWA offline-first para registrar inspecciones y mantenimiento de laboratorios de la Universidad Tecnológica de Tehuacán. Se puede instalar, captura sin conexión y sincroniza sin duplicar. Proyecto integrador de la materia **Aplicaciones Web Progresivas**; **todos los datos son sintéticos**.

La verificación y las decisiones de cada semana están en las secciones finales de este documento y en `docs/`.

## Supuestos

- **Node 22** (`.nvmrc` y `engines` en `package.json`) y npm 10 o superior.
- **Sin backend real:** el "servidor" se simula en el navegador (`simulatedRemoteSync`), incluidas las respuestas 400/401/403. En producción esas reglas deben vivir en la API.
- **Sesión sintética:** se elige un usuario de prueba en Ajustes; no autentica identidades reales.
- **HTTPS en el despliegue:** cámara, ubicación y Service Worker lo requieren fuera de `localhost`; `Strict-Transport-Security` solo aplica sobre HTTPS.
- **Navegador de prueba:** Chromium con Playwright; no se prueba Safari/iOS.
- **Dependencias:** se actualizó a Next.js 15.5 porque la línea 14 del starter tiene avisos críticos sin parche; el detalle está en `docs/threat-model.md` (R7).

## Requisitos locales

- Node.js 22 (la misma versión que usa el CI).
- npm 10 o superior.
- Git y una cuenta de GitHub.

## Arranque verificable

```bash
npm ci
npm run dev
```

Abre <http://localhost:3000>. Debes ver la pantalla inicial de inspecciones con datos sintéticos.

Rutas de la Semana 4 (datos sintéticos):

- Catálogo SSR: <http://localhost:3000/inspecciones>
- Detalle CSR (ejemplo): <http://localhost:3000/inspecciones/inspection-001>
- Detalle con error (id inexistente): <http://localhost:3000/inspecciones/no-existe>

Antes de entregar ejecuta:

```bash
make verify
bash public-tests/check.sh
```

`make verify` ejecuta lint, tipos, build y pruebas (se detiene en la primera etapa que falle) y al final genera `reports/verification.json`; ese archivo y la corrida verde de GitHub Actions son la evidencia técnica del arranque.

## Flujo de trabajo del curso

1. Conserva este repositorio como tu proyecto personal y crea un repositorio privado en GitHub.
2. Completa únicamente los entregables de la actividad de la semana.
3. Haz cambios pequeños y descriptivos; no borres lo que ya funciona.
4. Ejecuta la verificación local y espera que GitHub Actions termine en verde.
5. Entrega en Classroom la URL del repositorio, el SHA exacto evaluado, el enlace a Actions y `evidence/individual.md`.

No uses datos reales de personas, laboratorios o estudiantes. Todo dato del starter es sintético.

## Estructura inicial

- `src/app/`: aplicación Next.js con App Router.
- `src/lib/data/`: datos sintéticos de inspecciones.
- `docs/`: plantillas de documentación de la Semana 1.
- `scripts/verify.mjs`: verificación reproducible local.
- `tests/`: prueba mínima del starter.

Las decisiones de arquitectura y las nuevas carpetas se incorporan en las actividades correspondientes; no es necesario adelantarlas.


## Semana 08 · Verificación

### Entorno y Requisitos
* **Node.js:** v22.x
* **npm:** v10.x o superior

### Instalación y Ejecución Local
* **Instalación limpia:** `npm ci`
* **Servidor de desarrollo:** `npm run dev`
* **Compilación de producción:** `npm run build && npm start`

### Tabla de Comandos de Verificación
| Comando | Descripción |
| :--- | :--- |
| `npm run lint` | Valida reglas de código estáticas mediante ESLint |
| `npm run typecheck` | Comprueba la validez de tipos de TypeScript con `tsc --noEmit` |
| `npm run build` | Compila la aplicación Next.js para producción |
| `npm test` | Suites heredadas (semanas 01–06) + unitarias + integración |
| `npm run test:legacy` | Ejecuta las pruebas públicas y validaciones de Semanas 01 a 06 |
| `npm run test:unit` | Solo pruebas unitarias (`tests/unit/`, Vitest) |
| `npm run test:integration` | Solo pruebas de integración (`tests/integration/`, Vitest) |
| `npm run test:coverage` | Unitarias + integración con cobertura en `coverage/` y reporte JUnit en `test-results/vitest-junit.xml` |
| `npx playwright install chromium` | Descarga una sola vez el navegador para E2E |
| `npm run test:e2e` | Pruebas End-to-End con Playwright contra el servidor de producción en puerto 3100 |
| `make verify` | `lint` → `typecheck` → `build` → `npm test` → `npm run verify`; falla si falla cualquier etapa |

> **Nota para Windows (sin `make`):** El equivalente a la verificación completa es ejecutar en orden:
> `npm run lint && npm run typecheck && npm run build && npm run test:legacy && npm run test:coverage && npm run test:e2e`

### Servidor de Pruebas E2E
El entorno E2E utiliza `playwright.config.ts` configurado para iniciar `next start` en el puerto `3100`. En entornos CI se utiliza la variable `E2E_SKIP_BUILD=1` para omitir la fase de recompilación y reutilizar el build previo.

### CI y artefactos
* **Workflow de la semana 8:** `.github/workflows/academic-evaluation.yml` (job `verify`). Ejecuta en orden: `npm ci` → lint → tipos → build → suites heredadas → unit + integración con cobertura → instalación de Chromium → E2E. Cualquier etapa que falle hace fallar el job. El detalle de cada etapa está en `docs/test-strategy.md` §4.
* **Artefacto:** cada ejecución publica `reportes-verificacion-<sha>` (en ejecuciones anteriores se llamaba `reportes-w08-<sha>`) en la pestaña *Actions*, **también cuando una prueba falla** (`if: always()`), con:
  * `coverage/`: reporte de cobertura (abrir `coverage/index.html`).
  * `test-results/vitest-junit.xml`: resultados de unit + integración.
  * `test-results/e2e/`: trazas de Playwright de las pruebas que fallen.
  * `playwright-report/`: reporte HTML de E2E.
* **Workflows anteriores:** los archivos `week-0X-*.yml` se conservan como retroalimentación de las semanas 1–6; el de la semana 8 es `academic-evaluation.yml`.

### Enlaces de CI
* **Ejecución con fallo validado (Rojo):** [defecto controlado `de080fc`](https://github.com/lizcast06/PWA-Equipo2/actions/runs/40061332791) — falla la etapa "Unit + integración" y aun así se suben los reportes.
* **Ejecución de la corrección (Verde):** [revert `cec607b`](https://github.com/lizcast06/PWA-Equipo2/actions/runs/40061487918) — todas las etapas, incluido E2E, en verde.
* **Versión final en `main`:** el SHA final y su ejecución de Actions se registran en la entrega de Classroom (detalle en `docs/test-strategy.md`, §6).

### Estructura y Correspondencia de Carpetas
* Pruebas Unitarias: `tests/unit/`
* Pruebas de Integración: `tests/integration/`
* Pruebas End-to-End: `tests/e2e/`
* Estrategia de Pruebas: `docs/test-strategy.md`
* Pipeline de CI: `.github/workflows/academic-evaluation.yml`



## Semana 09 · Seguridad y privacidad

### Controles de Seguridad Implementados
* **Encabezados HTTP & CSP:** Configurados en `next.config.mjs` para mitigar ataques XSS, clickjacking e inyección de frames (`frame-ancestors 'none'`, `object-src 'none'`).
* **Trade-off de CSP:** Se mantiene `'unsafe-inline'` en `script-src` debido a los requerimientos de scripts en línea para la hidratación en Next.js 14. Las imágenes admiten esquemas `data:` y `blob:` para renderizar capturas de evidencia.
* **Protección de Indexación:** Implementación de `public/robots.txt` para deshabilitar la indexación en motores de búsqueda de rutas privadas (`/pendientes`, `/ajustes`, `/inspecciones/nueva`, `/inspecciones/ver`). No es un control de seguridad: solo evita la indexación.
* **Inventario de Privacidad:** Documentado en `docs/privacy-data-inventory.md` considerando a la institución como sujeto obligado de la LGPDPPSO.

### Comandos de Verificación
* `npm test`: suites heredadas, unitarias, integración y `tests/security.spec.ts` (pruebas negativas 400/401/403 y ubicación minimizada).
* `npm run build && npm run test:e2e`: E2E, incluidos `security-headers.spec.ts` (CSP y encabezados) y `logout-offline.spec.ts` (cerrar sesión sin dejar datos).
* `bash public-tests/check.sh`: artefactos obligatorios de la semana 9.

### Documentos de la semana
* Modelo de amenazas: `docs/threat-model.md` (activos, frontera de confianza, priorización, controles, pruebas, defectos controlados y límites).
* Inventario de privacidad: `docs/privacy-data-inventory.md`.
* Reglas de seguridad: `src/lib/security/` (`session`, `access`, `validation`, `privacy`, `logout`).
* Workflow de la actividad: `.github/workflows/week-09-w09-security-privacy.yml`; verificación completa: `.github/workflows/academic-evaluation.yml`.

### Ejecuciones de CI
* Verificación completa (lint, tipos, build, todas las capas de pruebas y reportes): [Academic Evaluation · Verificación completa](https://github.com/lizcast06/PWA-Equipo2/actions/workflows/academic-evaluation.yml).
* Checks de la actividad: [week-09-w09-security-privacy](https://github.com/lizcast06/PWA-Equipo2/actions/workflows/week-09-w09-security-privacy.yml).
* El SHA final y el enlace a su ejecución se registran en la entrega de Classroom, porque escribirlos aquí crearía otro commit distinto al evaluado.



## Semana 10 · Release

El proceso de release permite construir y verificar una imagen Docker identificada mediante el commit de Git.

- **Versión:** definida en `package.json`.
- **Construcción:** imagen Docker etiquetada con `github.sha`.
- **Validación:** `/api/health`, comprobación estricta del commit y pruebas smoke con Playwright.
- **Artefactos:** manifiesto JSON, imagen Docker comprimida, checksum SHA-256 y reportes.
- **Recuperación:** procedimiento manual mediante `docker load`.

### Documentación y evidencias

- [Proceso de release y criterios AC-01 a AC-04](docs/release-process.md).
- [Workflow Academic Evaluation](https://github.com/lizcast06/PWA-Equipo2/actions/workflows/academic-evaluation.yml).

La ejecución de GitHub Actions y la validación de los criterios de aceptación están pendientes de comprobación. Los resultados y enlaces se registrarán después de ejecutar el workflow.
