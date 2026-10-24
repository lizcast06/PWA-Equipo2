// Regla de validación de una captura de inspección. Es pura (sin React ni navegador)
// para que la use el formulario y se pueda probar de forma aislada.
export interface InspectionFormInput {
  location: string;
  inspector: string;
  findings: string;
  summary: string;
}

export type InspectionFormErrors = Partial<Record<keyof InspectionFormInput, string>>;

export const VALIDATION_MESSAGES = {
  location: "Indica el laboratorio inspeccionado.",
  inspector: "Escribe el nombre de quien inspecciona.",
  summary: "Describe la inspección (mínimo 10 caracteres).",
  findings: "Usa un número entero entre 0 y 99.",
} as const;

export function validateInspectionInput(input: InspectionFormInput): InspectionFormErrors {
  const errors: InspectionFormErrors = {};
  if (!input.location.trim()) errors.location = VALIDATION_MESSAGES.location;
  if (input.inspector.trim().length < 2) errors.inspector = VALIDATION_MESSAGES.inspector;
  if (input.summary.trim().length < 10) errors.summary = VALIDATION_MESSAGES.summary;
  // Number("") es 0: sin esta comprobación un campo vacío pasaría como "0 hallazgos".
  const raw = input.findings.trim();
  const count = Number(raw);
  if (raw === "" || !Number.isInteger(count) || count < 0 || count > 99) {
    errors.findings = VALIDATION_MESSAGES.findings;
  }
  return errors;
}
