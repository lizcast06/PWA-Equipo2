// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { StoredInspection, SyncQueueItem } from "../src/lib/storage/schema";
import {
  fetchRemoteInspection,
  getLocalInspection,
  getPendingQueue,
  retryInspection,
  saveNewInspection,
  syncPendingInspections,
  type LocalInspectionPayload,
  type NewInspectionInput,
} from "../src/lib/storage/local-store";
import { ACCESS_ERRORS, authorize } from "../src/lib/security/access";
import { validateForServer } from "../src/lib/security/validation";
import { minimizeLocation } from "../src/lib/security/privacy";
import { clearCurrentUser, findUser, setCurrentUser } from "../src/lib/security/session";
import { makeInspection } from "./fixtures/inspections";

// Semana 9 · pruebas negativas de seguridad (diapositiva 16: "sin prueba, el control es una promesa").
// Se ejercita el "servidor" real de la app (simulatedRemoteSync, detrás de syncPendingInspections)
// con localStorage de jsdom y usuarios sintéticos. Cada caso comprueba el RESULTADO: código
// 400/401/403, qué quedó en el remoto y en qué estado quedó la inspección en el dispositivo.

const KEYS = {
  inspections: "utt_pwa_inspections_db:inspections",
  queue: "utt_pwa_inspections_db:queue",
  remote: "utt_pwa_inspections_db:remote",
};

const CAPTURE: NewInspectionInput = {
  location: "Laboratorio de Redes", // dentro del alcance de supervisor-1
  inspector: "Técnica A",
  findings: 2,
  summary: "Revisión sintética de extintores y cableado",
};

const OUT_OF_SCOPE_LAB = "Laboratorio de Química";

function remoteStore(): Record<string, Partial<StoredInspection>> {
  return JSON.parse(localStorage.getItem(KEYS.remote) ?? "{}");
}

function rejectionOf(id: string): LocalInspectionPayload["rejection"] {
  return (getLocalInspection(id)?.payload as unknown as LocalInspectionPayload | undefined)?.rejection;
}

// Simula a alguien que edita la cola en localStorage antes de que se envíe.
function tamperQueue(change: (data: Partial<StoredInspection>) => Partial<StoredInspection>) {
  const queue = JSON.parse(localStorage.getItem(KEYS.queue) ?? "[]") as SyncQueueItem[];
  localStorage.setItem(KEYS.queue, JSON.stringify(queue.map((item) => ({ ...item, data: change(item.data) }))));
}

function captureAs(userId: string, input: Partial<NewInspectionInput> = {}): StoredInspection {
  setCurrentUser(userId);
  return saveNewInspection({ ...CAPTURE, ...input });
}

beforeEach(() => {
  localStorage.clear();
});

describe("401 · sin sesión el servidor no acepta nada", () => {
  it("una inspección capturada sin sesión se rechaza con 401 y el remoto queda vacío", async () => {
    clearCurrentUser();
    const saved = saveNewInspection(CAPTURE);

    const summary = await syncPendingInspections();

    expect(summary).toMatchObject({ processed: 0, failed: 1, pending: 0 });
    expect(remoteStore()).toEqual({});
    expect(getLocalInspection(saved.id)?.status).toBe("conflicto");
    expect(rejectionOf(saved.id)).toEqual({ status: 401, error: ACCESS_ERRORS.noSession });
  });

  it("consultar el remoto sin sesión responde 401 aunque la inspección exista", async () => {
    const saved = captureAs("inspector-a");
    await syncPendingInspections();
    clearCurrentUser();

    expect(await fetchRemoteInspection(saved.id)).toEqual({ status: 401, error: ACCESS_ERRORS.noSession });
  });
});

describe("403 · mínimo privilegio", () => {
  it("inspector A no puede enviar la inspección de B: 403, no se reintenta y el remoto no la guarda", async () => {
    const ofB = captureAs("inspector-b"); // B capturó en la tableta compartida
    setCurrentUser("inspector-a"); // y A tomó la tableta antes de que se enviara

    const summary = await syncPendingInspections();

    expect(summary).toMatchObject({ processed: 0, failed: 1, pending: 0 });
    expect(remoteStore()).toEqual({});
    expect(getPendingQueue()).toEqual([]); // un 403 es definitivo: no se queda reintentando
    expect(getLocalInspection(ofB.id)?.status).toBe("conflicto");
    expect(rejectionOf(ofB.id)).toEqual({ status: 403, error: ACCESS_ERRORS.notOwner });
  });

  it("inspector A no puede consultar la inspección de B en el remoto (403); B sí (200)", async () => {
    const ofB = captureAs("inspector-b");
    await syncPendingInspections();
    expect(Object.keys(remoteStore())).toEqual([ofB.id]);

    setCurrentUser("inspector-a");
    expect(await fetchRemoteInspection(ofB.id)).toEqual({ status: 403, error: ACCESS_ERRORS.notOwner });

    setCurrentUser("inspector-b");
    const own = await fetchRemoteInspection(ofB.id);
    expect(own.status).toBe(200);
    expect(own.status === 200 && own.record.ownerId).toBe("inspector-b");
  });

  it("cambiar el ownerId en la cola no permite sobrescribir en el remoto la inspección de otra persona", async () => {
    const ofB = captureAs("inspector-b", { summary: "Registro original de B, ya enviado" });
    await syncPendingInspections();

    // A edita su localStorage: reencola la inspección de B poniéndose como dueño y cambia el texto.
    setCurrentUser("inspector-a");
    retryInspection(ofB.id);
    tamperQueue((data) => ({ ...data, ownerId: "inspector-a", payload: { ...data.payload, summary: "Texto alterado por A" } }));

    await syncPendingInspections();

    expect(remoteStore()[ofB.id]).toMatchObject({ ownerId: "inspector-b", payload: { summary: "Registro original de B, ya enviado" } });
    expect(rejectionOf(ofB.id)?.status).toBe(403);
  });

  it("visitante intenta registrar: 403 y nada llega al remoto", async () => {
    const saved = captureAs("visitante");

    await syncPendingInspections();

    expect(remoteStore()).toEqual({});
    expect(rejectionOf(saved.id)).toEqual({ status: 403, error: ACCESS_ERRORS.visitor });
  });

  it("supervisor fuera de su alcance: no puede ver ni aprobar (403)", async () => {
    const outside = captureAs("inspector-a", { location: OUT_OF_SCOPE_LAB });
    await syncPendingInspections();
    expect(Object.keys(remoteStore())).toEqual([outside.id]);

    setCurrentUser("supervisor-1");
    expect(await fetchRemoteInspection(outside.id)).toEqual({ status: 403, error: ACCESS_ERRORS.outOfScope });
    expect(authorize(findUser("supervisor-1"), "approve", { ownerId: "inspector-a", location: OUT_OF_SCOPE_LAB })).toEqual({
      allowed: false,
      status: 403,
      error: ACCESS_ERRORS.outOfScope,
    });
  });

  it("un inspector no puede aprobar, ni siquiera su propia inspección", () => {
    expect(authorize(findUser("inspector-a"), "approve", { ownerId: "inspector-a", location: CAPTURE.location })).toMatchObject({
      allowed: false,
      status: 403,
    });
  });
});

describe("400 · el servidor vuelve a validar lo que llega", () => {
  it("hallazgos = 999 editado en localStorage: 400 con error claro y nada en el remoto", async () => {
    const saved = captureAs("inspector-a");
    tamperQueue((data) => ({ ...data, findings: 999 }));

    await syncPendingInspections();

    expect(remoteStore()).toEqual({});
    expect(rejectionOf(saved.id)).toEqual({ status: 400, error: "Hallazgos: Usa un número entero entre 0 y 99." });
  });

  it("descripción enorme (5000 caracteres): 400 y nada en el remoto", async () => {
    const saved = captureAs("inspector-a");
    tamperQueue((data) => ({ ...data, payload: { ...data.payload, summary: "x".repeat(5000) } }));

    await syncPendingInspections();

    expect(remoteStore()).toEqual({});
    expect(rejectionOf(saved.id)).toEqual({ status: 400, error: "Descripción: máximo 1000 caracteres." });
  });

  it("rechaza tipos y valores que el formulario nunca enviaría", () => {
    const valid = makeInspection({ ownerId: "inspector-a", payload: { summary: "Registro sintético de prueba" } });

    expect(validateForServer(valid)).toEqual({ ok: true });
    expect(validateForServer({ ...valid, findings: "5" as unknown as number })).toMatchObject({ ok: false, status: 400 });
    expect(validateForServer({ ...valid, findings: 2.5 })).toMatchObject({ ok: false, status: 400 });
    expect(validateForServer({ ...valid, findings: -1 })).toMatchObject({ ok: false, status: 400 });
    expect(validateForServer({ ...valid, inspector: "x".repeat(81) })).toEqual({
      ok: false,
      status: 400,
      error: "Responsable: máximo 80 caracteres.",
    });
    expect(validateForServer({ ...valid, payload: { summary: "corto" } })).toMatchObject({ ok: false, status: 400 });
    expect(validateForServer({ ...valid, payload: { ...valid.payload, photo: "javascript:alert(1)" } })).toEqual({
      ok: false,
      status: 400,
      error: "La evidencia debe ser una imagen.",
    });
    expect(validateForServer(null)).toMatchObject({ ok: false, status: 400 });
  });

  it("ubicación precisa inyectada en la cola: 400 (el servidor tampoco la acepta)", async () => {
    const saved = captureAs("inspector-a");
    tamperQueue((data) => ({
      ...data,
      payload: { ...data.payload, coords: { latitude: 18.463312, longitude: -97.391645, accuracy: 8, synthetic: false } },
    }));

    await syncPendingInspections();

    expect(remoteStore()).toEqual({});
    expect(rejectionOf(saved.id)?.status).toBe(400);
    expect(rejectionOf(saved.id)?.error).toMatch(/Ubicación demasiado precisa/);
  });
});

describe("minimización de ubicación (R1)", () => {
  it("guardar con 6 decimales y accuracy deja en localStorage solo 2 decimales y sin accuracy", () => {
    setCurrentUser("inspector-a");
    const saved = saveNewInspection({
      ...CAPTURE,
      coords: { latitude: 18.463312, longitude: -97.391645, accuracy: 12.5, synthetic: false },
    });

    const raw = localStorage.getItem(KEYS.inspections) ?? "";
    const stored = (JSON.parse(raw) as StoredInspection[]).find((item) => item.id === saved.id);
    expect(stored?.payload.coords).toEqual({ latitude: 18.46, longitude: -97.39, synthetic: false, approximate: true });
    // Ni en la inspección ni en la cola queda la coordenada precisa ni la precisión del GPS.
    for (const key of [KEYS.inspections, KEYS.queue]) {
      const text = localStorage.getItem(key) ?? "";
      expect(text).not.toContain("18.463312");
      expect(text).not.toContain("-97.391645");
      expect(text).not.toContain("accuracy");
    }
  });

  it("minimizeLocation solo conserva los campos permitidos", () => {
    const precise = { latitude: 18.468, longitude: -97.3949, accuracy: 3, altitude: 1676, synthetic: true };
    expect(minimizeLocation(precise)).toEqual({ latitude: 18.47, longitude: -97.39, synthetic: true, approximate: true });
  });
});

describe("casos permitidos · los controles no bloquean el trabajo legítimo", () => {
  it("inspector A envía su propia inspección con ubicación minimizada: 200 y queda en el remoto", async () => {
    const saved = captureAs("inspector-a", {
      coords: { latitude: 18.463312, longitude: -97.391645, accuracy: 12.5, synthetic: false },
    });

    const summary = await syncPendingInspections();

    expect(summary).toMatchObject({ processed: 1, failed: 0, pending: 0 });
    expect(remoteStore()[saved.id]).toMatchObject({ ownerId: "inspector-a", status: "sincronizado" });
    expect(getLocalInspection(saved.id)?.status).toBe("sincronizado");
    expect(rejectionOf(saved.id)).toBeUndefined();
  });

  it("supervisor dentro de su alcance puede ver y aprobar; también registra lo propio", async () => {
    const inside = captureAs("inspector-a");
    await syncPendingInspections();

    setCurrentUser("supervisor-1");
    expect((await fetchRemoteInspection(inside.id)).status).toBe(200);
    expect(authorize(findUser("supervisor-1"), "approve", { ownerId: "inspector-a", location: CAPTURE.location })).toEqual({
      allowed: true,
    });

    const own = captureAs("supervisor-1", { inspector: "Supervisora C" });
    await syncPendingInspections();
    expect(remoteStore()[own.id]).toMatchObject({ ownerId: "supervisor-1" });
  });

  it("tras un 401, iniciar sesión como dueño y reintentar sí envía (el rechazo se borra)", async () => {
    setCurrentUser("inspector-a");
    const saved = saveNewInspection(CAPTURE);
    clearCurrentUser();
    await syncPendingInspections();
    expect(rejectionOf(saved.id)?.status).toBe(401);

    setCurrentUser("inspector-a");
    retryInspection(saved.id);
    expect(rejectionOf(saved.id)).toBeUndefined();
    await syncPendingInspections();

    expect(getLocalInspection(saved.id)?.status).toBe("sincronizado");
    expect(Object.keys(remoteStore())).toEqual([saved.id]);
  });
});
