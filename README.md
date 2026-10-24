# PWA de inspecciones de laboratorio — proyecto base

Starter oficial para la materia **Aplicaciones Web Progresivas**.

Este repositorio es el punto de partida común para las actividades de las semanas 1–13. En la Semana 1 no debes construir todavía toda la PWA: debes poner en marcha este proyecto, documentar el problema y dejar una primera versión reproducible. Cada semana conservarás el mismo repositorio y agregarás la capacidad indicada por la actividad.

## Requisitos locales

- Node.js 20 LTS o superior compatible con Next.js.
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

`make verify` genera `reports/verification.json`; ese archivo y la corrida verde de GitHub Actions son la evidencia técnica del arranque.

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
| `npm run test:legacy` | Ejecuta las pruebas públicas y validaciones de Semanas 01 a 06 |
| `npm run test:coverage` | Pruebas unitarias e integración con generación de reporte en `coverage/` |
| `npm run test:e2e` | Pruebas End-to-End con Playwright contra el servidor de producción en puerto 3100 |

> **Nota para Windows:** El equivalente a la verificación completa es ejecutar en orden:
> `npm run lint && npm run typecheck && npm run build && npm run test:legacy && npm run test:coverage && npm run test:e2e`

### Servidor de Pruebas E2E
El entorno E2E utiliza `playwright.config.ts` configurado para iniciar `next start` en el puerto `3100`. En entornos CI se utiliza la variable `E2E_SKIP_BUILD=1` para omitir la fase de recompilación y reutilizar el build previo.

### Enlaces de CI (Workflow `.github/workflows/academic-evaluation.yml`)
* **Ejecución con fallo validado (Rojo):** [Ver ejecución con fallo](PEGA_AQUI_TU_ENLACE_ROJO)
* **Última ejecución exitosa en main (Verde):** [Ver ejecución exitosa](PEGA_AQUI_TU_ENLACE_VERDE)

### Estructura y Correspondencia de Carpetas
* Pruebas Unitarias: `tests/unit/`
* Pruebas de Integración: `tests/integration/`
* Pruebas End-to-End: `tests/e2e/`
* Estrategia de Pruebas: `docs/test-strategy.md`
* Pipeline de CI: `.github/workflows/academic-evaluation.yml`