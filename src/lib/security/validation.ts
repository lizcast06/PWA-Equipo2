// Validación del lado del servidor (semana 9, riesgo R2, diapositiva 8).
// "El frontend ayuda; el backend impone la regla": el formulario ya valida, pero cualquiera
// puede editar localStorage o la cola y mandar otra cosa. El "servidor" (simulatedRemoteSync)
// vuelve a revisar TODO lo que recibe y responde 400 si no cumple.

import type { StoredInspection } from "../storage/schema";
import { validateInspectionInput, VALIDATION_MESSAGES } from "../validation/inspection";
import { hasAllowedPrecision, LOCATION_DECIMALS } from "./privacy";

export const SERVER_LIMITS = {
  location: 80,
  inspector: 80,
  summary: 1000,
  /** Foto en data URL (el formulario la reduce a 800 px, unos 100 KB). */
  photo: 2_000_000,
} as const;

export type ServerValidation = { ok: true } | { ok: false; status: 400; error: string };

const fail = (error: string): ServerValidation => ({ ok: false, status: 400, error });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCoords(coords: unknown): string | undefined {
  if (coords === undefined) return undefined;
  if (!isPlainObject(coords)) return "Ubicación con formato inválido.";
  const { latitude, longitude } = coords;
  if (typeof latitude !== "number" || typeof longitude !== "number") return "Ubicación con formato inválido.";
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return "Ubicación fuera de rango.";
  // Minimización: el servidor tampoco acepta la ubicación precisa del GPS.
  if ("accuracy" in coords || !hasAllowedPrecision(latitude) || !hasAllowedPrecision(longitude)) {
    return `Ubicación demasiado precisa: solo se aceptan ${LOCATION_DECIMALS} decimales y sin precisión del GPS.`;
  }
  return undefined;
}

export function validateForServer(record: Partial<StoredInspection> | null | undefined): ServerValidation {
  if (!isPlainObject(record)) return fail("Solicitud sin inspección.");
  const payload = isPlainObject(record.payload) ? record.payload : {};
  const { location, inspector, findings } = record;
  const summary = payload.summary;

  if (typeof location !== "string" || typeof inspector !== "string" || typeof summary !== "string") {
    return fail("Faltan laboratorio, responsable o descripción.");
  }
  // typeof evita que "5" (texto) pase como número al convertirlo para la regla del formulario.
  if (typeof findings !== "number" || !Number.isInteger(findings) || findings < 0 || findings > 99) {
    return fail(`Hallazgos: ${VALIDATION_MESSAGES.findings}`);
  }
  if (location.length > SERVER_LIMITS.location) return fail(`Laboratorio: máximo ${SERVER_LIMITS.location} caracteres.`);
  if (inspector.length > SERVER_LIMITS.inspector) return fail(`Responsable: máximo ${SERVER_LIMITS.inspector} caracteres.`);
  if (summary.length > SERVER_LIMITS.summary) return fail(`Descripción: máximo ${SERVER_LIMITS.summary} caracteres.`);

  // Mismas reglas mínimas que el formulario (semana 8), aplicadas ahora en el servidor.
  const formErrors = validateInspectionInput({ location, inspector, findings: String(findings), summary });
  const firstError = Object.values(formErrors)[0];
  if (firstError) return fail(firstError);

  const photo = payload.photo;
  if (photo !== undefined) {
    if (typeof photo !== "string" || !photo.startsWith("data:image/")) return fail("La evidencia debe ser una imagen.");
    if (photo.length > SERVER_LIMITS.photo) return fail("La foto es demasiado grande.");
  }

  const coordsError = validateCoords(payload.coords);
  if (coordsError) return fail(coordsError);

  return { ok: true };
}
