# Modelo de amenazas · Semana 09

PWA offline-first para registrar inspecciones de mantenimiento de laboratorios de la Universidad Tecnológica de Tehuacán. **Todos los datos son sintéticos.** La UTT es una institución pública, por lo que es **sujeto obligado** de la LGPDPPSO; el tratamiento de datos se detalla en [`privacy-data-inventory.md`](privacy-data-inventory.md).

Método: las 5 preguntas del curso (diapositiva 5) → **activo → riesgo → control → prueba**. Un control sin prueba se considera una promesa, no un control.

| Criterio | Dónde se demuestra |
|---|---|
| AC-02 Implementación | §4 controles en `src/lib/security/`, `public/sw.js`, `next.config.mjs`, `public/robots.txt` |
| AC-03 Pruebas | §5 matriz control → prueba (`tests/security.spec.ts`, `tests/e2e/logout-offline.spec.ts`, `tests/e2e/security-headers.spec.ts`) y §6 defectos controlados |
| AC-04 Ingeniería | §3 priorización, §6 evidencia de fallo y corrección, §7 límites y trade-offs |

---

## 1. ¿Qué protegemos? (activos)

| Activo | Dónde vive | Por qué importa |
|---|---|---|
| A1 Inspecciones capturadas (laboratorio, responsable, hallazgos, descripción) | `localStorage` del dispositivo → "remoto" simulado | Registro de mantenimiento; su alteración da una falsa imagen del estado del laboratorio |
| A2 Evidencia fotográfica | `localStorage` (data URL) | Puede mostrar personas, equipos o lugares |
| A3 Ubicación de la captura | `localStorage` | Dato de localización de quien inspecciona |
| A4 Sesión del usuario (`ownerId`, rol) | `localStorage` (`…:session`) | Decide qué puede ver y enviar cada persona |
| A5 Cola de sincronización | `localStorage` (`…:queue`) | Puede reenviar datos al servidor |
| A6 Caché del Service Worker | Cache Storage | Puede conservar pantallas aunque la persona ya no esté |
| A7 Credenciales y configuración de despliegue | Fuera del repositorio (variables de entorno) | Su exposición compromete toda la infraestructura |

## 2. ¿Quién interactúa? (actores) y frontera de confianza

| Actor | Qué puede hacer legítimamente |
|---|---|
| Inspector (`inspector-a`, `inspector-b`) | Registrar y ver **sus** inspecciones |
| Supervisor (`supervisor-1`) | Ver y aprobar inspecciones **solo** de los laboratorios de su alcance |
| Visitante | Consultar el catálogo público; no registra ni ve registros |
| Atacante / persona ajena | Encuentra la tableta, comparte el dispositivo, manipula `localStorage`, inyecta contenido |

```
 DISPOSITIVO (no confiable)            │  FRONTERA DE CONFIANZA  │   SERVIDOR (confiable)
 pantalla · localStorage · Cache       │  ───── HTTPS ─────►      │   autenticación · autorización
 Storage · Service Worker              │                          │   validación · base de datos
```

**Regla:** el cliente **no es la autoridad**. La validación del formulario solo ayuda al usuario; el servidor (en este proyecto, `simulatedRemoteSync` como stand-in) vuelve a validar (400) y autoriza (401/403).

## 3. ¿Qué podría pasar? (amenazas y prioridad)

Prioridad = impacto × probabilidad en el contexto de una tableta de laboratorio compartida (diapositiva 6). La justificación importa más que la etiqueta.

| ID | Amenaza | Activos | Impacto | Prob. | Prioridad | Justificación |
|---|---|---|---|---|---|---|
| **R3** | La tableta se pierde o se comparte y la siguiente persona lee inspecciones, fotos y ubicación que quedaron guardadas | A1–A6 | Alto | Alta | **1** | Escenario central de la semana (diapositiva 3); el modo offline guarda datos a propósito |
| **R2** | Un inspector envía o consulta inspecciones de otro, o se envían datos fuera de rango manipulando `localStorage` | A1, A4, A5 | Alto | Media | **2** | Acceso indebido a datos ajenos (diapositiva 6, riesgo C) |
| **R4** | El Service Worker guarda en caché cualquier GET, incluidas pantallas con el id de una inspección | A6 | Medio | Alta | **3** | Se comprobó en esta versión: la caché conservaba `ver?id=…` y respuestas `?_rsc=` |
| **R1** | Se almacena la ubicación precisa aunque la finalidad no la requiere | A3 | Medio | Alta | **4** | Principio de minimización (diapositiva 15) |
| **R5** | Scripts u orígenes no previstos (XSS, incrustar la app en otro sitio, indexación de pantallas internas) | Todos | Medio | Baja | **5** | React escapa texto por defecto; CSP y headers son una capa adicional |
| **R6** | Credenciales de servicios en el repositorio | A7 | Alto | Baja | **6** | Hoy no hay servicios externos; se previene con `.gitignore` y revisión |
| **R7** | Dependencias con vulnerabilidades conocidas: Next 14.2.35 tenía avisos críticos de ejecución remota en `/_next/image` | Todos | Alto | Media | **2** | `/_next/image` responde aunque la app no use `next/image`; se comprobó con una petición real (200). La línea 14 ya no recibe parche |

## 4. ¿Cómo lo reducimos? (controles)

| Riesgo | Control | Implementación | Responsable |
|---|---|---|---|
| R3 | **Cerrar sesión borra todo lo capturado**: inspecciones, cola, remoto simulado, sesión y cachés dinámicas; advierte si hay inspecciones sin enviar | `src/lib/security/logout.ts` · botón en `src/app/ajustes/page.tsx` | Emmanuel |
| R4 | **Lista permitida en el Service Worker**: solo pantallas públicas sin parámetros, `/_next/static`, íconos y manifest; nunca `/api/`, `Cache-Control: no-store`/`private` ni URLs con consulta | `public/sw.js` (`isCacheable`, v4) | Emmanuel |
| R2 | **Mínimo privilegio** con `authorize()` (inspector: solo lo propio; supervisor: solo su alcance; visitante: nada; sin sesión: 401) y **validación en el servidor** con `validateForServer()` (400). `simulatedRemoteSync` aplica ambas antes de guardar y no deja sobrescribir la inspección de otra persona. Un rechazo es definitivo: sale de la cola y la pantalla muestra el motivo | `src/lib/security/access.ts`, `validation.ts`, `src/lib/storage/local-store.ts` | Abraham |
| R1 | **Minimización de ubicación** con `minimizeLocation()` (2 decimales ≈ 1 km, sin `accuracy`) en el formulario y otra vez en `saveNewInspection`; el servidor rechaza coordenadas más precisas | `src/lib/security/privacy.ts`, `src/app/inspecciones/nueva/page.tsx`, `src/lib/storage/local-store.ts` | Abraham |
| R5 | **CSP y encabezados** (`object-src 'none'`, `frame-ancestors 'none'`, `nosniff`, `Permissions-Policy`) y `robots.txt` para no indexar pantallas internas | `next.config.mjs`, `public/robots.txt` | Dana |
| R6 | Sin credenciales en el código; `.env*` en `.gitignore`; datos sintéticos | `.gitignore`, revisión de PR | Equipo |
| R7 | **Actualizar a Next 15.5.28 / React 19** y forzar una `postcss` corregida con `overrides`. `npm audit --omit=dev` se revisa en cada release | `package.json`, `package-lock.json` | Emmanuel |
| Base | **Sesión sintética con roles** y dueño (`ownerId`) en cada inspección | `src/lib/security/session.ts`, `src/lib/storage/local-store.ts` | Emmanuel |

Controles heredados que siguen vigentes: textos renderizados por React (sin `innerHTML`), permisos de cámara y ubicación pedidos solo al usarlos con flujo alternativo si se niegan (semana 6, `tests/e2e/device-denied.spec.ts`).

## 5. ¿Cómo lo probamos? (pruebas negativas)

| Riesgo | Prueba | Qué demuestra que NO pasa |
|---|---|---|
| R3 | `tests/e2e/logout-offline.spec.ts` › "cerrar sesión borra lo capturado y sin conexión no queda nada visible ni guardado" | Tras capturar con foto y ubicación y cerrar sesión: 0 llaves de la app en `localStorage`, ninguna caché con el texto ni con `?id=`, y sin red ni el inicio, ni Pendientes, ni el detalle muestran la inspección |
| R4 | `tests/e2e/logout-offline.spec.ts` › "el Service Worker no guarda pantallas con datos de la sesión" | Después de abrir el detalle propio y navegar, la caché no tiene URLs con `?id=` ni `_rsc=` (el shell sí está) |
| R2 | `tests/security.spec.ts` › "401 · sin sesión…", "403 · mínimo privilegio" (inspector A sobre B, `ownerId` manipulado en la cola, visitante, supervisor fuera de alcance) y "400 · el servidor vuelve a validar…" (hallazgos = 999, descripción de 5000 caracteres, tipos manipulados) | El remoto no guarda lo rechazado. El bloque "casos permitidos" comprueba que lo legítimo sí pasa |
| R1 | `tests/security.spec.ts` › "minimización de ubicación (R1)" y "ubicación precisa inyectada en la cola: 400" | En `localStorage` quedan 2 decimales y sin `accuracy`; el servidor tampoco acepta la precisa |
| R5 | `tests/e2e/security-headers.spec.ts` | Las respuestas traen la CSP y los headers, y la app sigue funcionando con ellos |
| R6 | Revisión del repositorio con `git grep` de patrones de credenciales (`ghp_`, `sk-`, `AKIA`, llaves privadas, cadenas de conexión con usuario y clave) y de archivos `.env` versionados | **Ninguna coincidencia** (1 de noviembre de 2026). Es una revisión puntual, no un control automático |
| R7 | `npm audit --omit=dev` y regresión completa tras actualizar (lint, tipos, build, Vitest y E2E) | Sin avisos críticos; la app sigue funcionando igual |
| Regresión | Todos los E2E de semanas anteriores inician sesión con `signInAs` (`tests/e2e/helpers.ts`) | Los controles nuevos no rompen el flujo offline |

## 6. Defectos controlados (evidencia de que las pruebas detectan la regresión)

Ensayo local del 30 de octubre de 2026 (build de producción, Chromium de Playwright). En ambos casos se restauró el código y la prueba volvió a pasar.

**R3 · cerrar sesión solo quita la sesión** (se quitan la limpieza de datos y el barrido de llaves en `logout.ts`):
```
× cerrar sesión borra lo capturado y sin conexión no queda nada visible ni guardado
  - Expected  - 1      + Received  + 5
  + "utt_pwa_inspections_db:inspections"
  + "utt_pwa_inspections_db:queue"
  + "utt_pwa_inspections_db:remote"
```
Hallazgo: quitar **solo** `clearLocalData()` no basta para que falle, porque `logout` tiene una segunda protección (borra cualquier llave con el prefijo de la app). Se documenta como defensa en profundidad.

**R4 · el Service Worker vuelve a guardar cualquier GET**:
```
× el Service Worker no guarda pantallas con datos de la sesión
  + "http://localhost:3100/inspecciones/ver?id=local-…&_rsc=fxg66"
  + "http://localhost:3100/inspecciones/ver?id=local-…"
  + "http://localhost:3100/inspecciones?_rsc=1e3q4"   (y 4 más)
```

**R2 y R1 · ensayo local de Abraham** (detalle en el [PR #19](https://github.com/lizcast06/PWA-Equipo2/pull/19)):

| Defecto | Pruebas de `tests/security.spec.ts` que fallan |
|---|---|
| Quitar `authorize` en `simulatedRemoteSync` | 6 (401, 403 A→B, visitante, supervisor y reintento) |
| Quitar `validateForServer` | 3 (hallazgos = 999, texto enorme y ubicación precisa) |
| Guardar `coords` sin minimizar | 2 (minimización y caso permitido) |

En los tres casos se restauró el código y volvió a 17/17.

## 7. Límites y trade-offs

- **No hay backend real.** El "servidor" es `simulatedRemoteSync`; las respuestas 400/401/403 se modelan ahí. En producción la misma regla debe vivir en la API, porque todo lo que corre en el navegador se puede modificar.
- **`localStorage` no está cifrado** y es accesible a cualquier script del mismo origen. La mitigación es guardar lo mínimo y borrarlo al cerrar sesión; no protege si la persona nunca cierra sesión ni frente a un XSS exitoso.
- **Cerrar sesión con inspecciones sin enviar las pierde.** Se decidió advertir y pedir confirmación antes que conservar datos de una sesión terminada en un dispositivo compartido.
- **Pantallas públicas en caché.** El shell, el catálogo y los tres detalles sembrados se precachean (son contenido público sintético) aunque el detalle dinámico responda `no-store`; es una lista explícita, no "cualquier GET".
- **CSP con `'unsafe-inline'` en scripts:** Next.js 14 inyecta scripts en línea para hidratar; sin nonces la app no funciona. La CSP se mantiene como capa adicional, no como único control contra XSS.
- **`robots.txt` no es un control de acceso**: solo evita la indexación; cualquiera puede ignorarlo.
- **Sesión sintética** elegida en Ajustes: modela roles y dueño, no autentica identidades reales. Sin sesión la inspección se guarda en el dispositivo, pero el servidor responde 401 hasta iniciar sesión y reintentar; la pantalla lo avisa.
- **`public-tests/check.sh` no sirve como detector de credenciales:** imprime `PUBLIC_OK` aunque su búsqueda encuentre coincidencias, porque en bash un comando negado con `!` no detiene `set -e`. Sus coincidencias en este repositorio son menciones de la palabra en documentos (`START_HERE.md`, `docs/`, `evidence/`) y el paquete `js-tokens` en `package-lock.json`, no credenciales. Por eso no se afirma "sin coincidencias", y la revisión real es la de §5.
- **HTTPS** se asume en el despliegue: protege el trayecto, no corrige XSS, autorizaciones defectuosas ni datos que quedan en el dispositivo (diapositiva 10).
