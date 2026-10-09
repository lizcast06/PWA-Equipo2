import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function runCapabilitiesTests() {
  const root = process.cwd();

  const cameraPath = resolve(root, "src/lib/device/camera.ts");
  const geoPath = resolve(root, "src/lib/device/geolocation.ts");
  const notifPath = resolve(root, "src/lib/notifications/client.ts");
  const docsPath = resolve(root, "docs/capabilities.md");

  const cameraCode = await readFile(cameraPath, "utf8");
  const geoCode = await readFile(geoPath, "utf8");
  const notifCode = await readFile(notifPath, "utf8");
  const docsCode = await readFile(docsPath, "utf8");

  // 1. Verificacion de contrato y fallback de Camara
  assert.match(cameraCode, /requestCameraStream/, "camera.ts debe exportar requestCameraStream");
  assert.match(cameraCode, /createFileInputFallback/, "camera.ts debe ofrecer fallback mediante input de archivo");
  assert.match(cameraCode, /capture/, "El input de archivo debe incluir atributo capture para dispositivo");

  // 2. Verificacion de contrato y resiliencia en Geolocalizacion
  assert.match(geoCode, /obtainLocation/, "geolocation.ts debe exportar obtainLocation");
  assert.match(geoCode, /synthetic/i, "geolocation.ts debe contemplar coordenadas sinteticas como fallback");
  assert.match(geoCode, /PERMISSION_DENIED|DENIED/, "geolocation.ts debe gestionar la denegacion de permisos");

  // 3. Verificacion de Notificaciones y degradacion in-app
  assert.match(notifCode, /dispatchInspectionAlert/, "client.ts debe exportar dispatchInspectionAlert");
  assert.match(notifCode, /IN_APP_FALLBACK/, "client.ts debe incluir canal de fallback in-app");
  assert.match(notifCode, /requestNotificationPermission/, "client.ts debe validar solicitud de permisos explicitos");

  // 4. Verificacion de documentacion de ingenieria
  assert.ok(docsCode.length > 200, "docs/capabilities.md debe contener analisis formal de capacidades");
  assert.match(docsCode, /Fallback|Degradaci[oó]n/i, "docs/capabilities.md debe justificar la degradacion elegante");
  assert.match(docsCode, /Privacidad|PII/i, "docs/capabilities.md debe detallar politicas de privacidad");

  console.log("capabilities.spec.ts: PASS");
}

runCapabilitiesTests();