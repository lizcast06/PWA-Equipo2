import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGES, validateInspectionInput, type InspectionFormInput } from "../../src/lib/validation/inspection";

// Captura sintética válida; cada caso cambia un solo campo.
function input(overrides: Partial<InspectionFormInput> = {}): InspectionFormInput {
  return {
    location: "Laboratorio de Redes",
    inspector: "Técnica A",
    findings: "2",
    summary: "Revisión sintética de extintores",
    ...overrides,
  };
}

describe("validateInspectionInput", () => {
  it("una captura completa no tiene errores", () => {
    expect(validateInspectionInput(input())).toEqual({});
  });

  it("acepta los bordes válidos: 0 y 99 hallazgos, descripción de 10 caracteres y responsable de 2", () => {
    expect(validateInspectionInput(input({ findings: "0" }))).toEqual({});
    expect(validateInspectionInput(input({ findings: "99" }))).toEqual({});
    expect(validateInspectionInput(input({ summary: "1234567890" }))).toEqual({});
    expect(validateInspectionInput(input({ inspector: "Al" }))).toEqual({});
  });

  it("ignora los espacios al inicio y al final al medir los campos", () => {
    expect(validateInspectionInput(input({ inspector: "  Al  ", findings: " 3 " }))).toEqual({});
  });

  it("exige el laboratorio, también si solo tiene espacios", () => {
    expect(validateInspectionInput(input({ location: "" }))).toEqual({ location: VALIDATION_MESSAGES.location });
    expect(validateInspectionInput(input({ location: "   " }))).toEqual({ location: VALIDATION_MESSAGES.location });
  });

  it("rechaza un responsable de menos de 2 caracteres sin contar espacios", () => {
    expect(validateInspectionInput(input({ inspector: "A" }))).toEqual({ inspector: VALIDATION_MESSAGES.inspector });
    expect(validateInspectionInput(input({ inspector: " a " }))).toEqual({ inspector: VALIDATION_MESSAGES.inspector });
  });

  it("rechaza una descripción de 9 caracteres", () => {
    expect(validateInspectionInput(input({ summary: "123456789" }))).toEqual({ summary: VALIDATION_MESSAGES.summary });
    expect(validateInspectionInput(input({ summary: "   123456789   " }))).toEqual({
      summary: VALIDATION_MESSAGES.summary,
    });
  });

  it.each(["-1", "100", "2.5", "abc", "", "   "])("rechaza hallazgos = %j", (findings) => {
    expect(validateInspectionInput(input({ findings }))).toEqual({ findings: VALIDATION_MESSAGES.findings });
  });

  it("reporta todos los campos inválidos a la vez", () => {
    const errors = validateInspectionInput({ location: "", inspector: "", findings: "-3", summary: "" });

    expect(Object.keys(errors).sort()).toEqual(["findings", "inspector", "location", "summary"]);
  });
});
