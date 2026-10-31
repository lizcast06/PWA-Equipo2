"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { LoadingState } from "../../../components/loading-state";
import { inspections } from "../../../lib/data/inspections";
import { SYNC_STATUS_LABELS } from "../../../components/local-inspections";
import { getLocalInspection, LocalInspectionPayload, retryInspection, STORE_CHANGED_EVENT } from "../../../lib/storage/local-store";
import { StoredInspection } from "../../../lib/storage/schema";

interface InspectionDetail {
  id: string;
  location: string;
  date: string;
  inspector: string;
  status: string;
  statusLabel?: string;
  findings: number;
  summary: string;
  photo?: string;
  coords?: LocalInspectionPayload["coords"];
  syncStatus?: StoredInspection["status"];
  rejection?: LocalInspectionPayload["rejection"];
}

function fromLocal(record: StoredInspection): InspectionDetail {
  const payload = record.payload as unknown as LocalInspectionPayload;
  return {
    id: record.id,
    location: record.location,
    date: payload.date,
    inspector: record.inspector,
    status: record.findings > 0 ? "attention" : "ok",
    statusLabel: record.findings > 0 ? "Requiere atención" : "Sin incidencias",
    findings: record.findings,
    summary: payload.summary,
    photo: payload.photo,
    coords: payload.coords,
    syncStatus: record.status,
    rejection: payload.rejection,
  };
}

export default function InspeccionDetalleCSRPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  // El id llega por la ruta (/inspecciones/<id>) o, en la vista que funciona sin conexión,
  // por la consulta (/inspecciones/ver?id=<id>).
  const routeId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);
  const id = routeId ?? searchParams?.get("id") ?? "";

  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Emulación controlada de ciclo de hidratación y consulta cliente
    const timer = setTimeout(() => {
      if (!id) {
        setError("Identificador de inspección no proporcionado.");
        setIsLoading(false);
        return;
      }

      const match = inspections.find((item) => item.id.toLowerCase() === id.toLowerCase());
      const local = match ? undefined : getLocalInspection(id);
      if (match) {
        setInspection(match);
      } else if (local) {
        setInspection(fromLocal(local));
      } else {
        setError(`No se encontró registro para la inspección con identificador: ${id}`);
      }
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [id]);

  // Refleja en pantalla cuando un registro local termina de enviarse.
  useEffect(() => {
    if (!id) return;
    const refresh = () => {
      const local = getLocalInspection(id);
      if (local) setInspection(fromLocal(local));
    };
    window.addEventListener(STORE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(STORE_CHANGED_EVENT, refresh);
  }, [id]);

  return (
    <AppShell activeRoute="/inspecciones">
      <div className="space-y-6">
        <nav aria-label="Ruta de navegación">
          <Link
            href="/inspecciones"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-1"
          >
            <span>&larr; Volver al catálogo</span>
          </Link>
        </nav>

        <header className="border-b border-slate-700 pb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              CSR (Client-Side Rendered)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-2">
            Detalle de la inspección
          </h2>
        </header>

        {/* Estado de Carga */}
        {isLoading && (
          <LoadingState
            message="Cargando inspección..."
            description="Buscando el registro seleccionado"
          />
        )}

        {/* Estado de Error */}
        {!isLoading && error && (
          <div
            role="alert"
            className="p-6 bg-red-950/40 rounded-xl border border-red-800 text-center space-y-3"
          >
            <h3 className="text-sm font-semibold text-red-300">No encontramos esta inspección</h3>
            <p className="text-xs text-red-400">{error}</p>
            <Link
              href="/inspecciones"
              className="inline-block mt-2 px-3 py-1.5 bg-slate-800 text-xs text-slate-200 rounded border border-slate-700 hover:bg-slate-700"
            >
              Regresar al catálogo
            </Link>
          </div>
        )}

        {/* Estado Normal / Detalle Renderizado */}
        {!isLoading && !error && inspection && (
          <article className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-sky-400">ID: {inspection.id}</span>
                <h3 className="text-lg font-bold text-slate-100 mt-1">{inspection.location}</h3>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-medium border ${
                    inspection.status === "attention"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                  }`}
                >
                  {inspection.statusLabel || inspection.status}
                </span>
                {inspection.syncStatus && (
                  <span className={`px-2.5 py-1 rounded text-xs font-medium border ${SYNC_STATUS_LABELS[inspection.syncStatus].className}`}>
                    {SYNC_STATUS_LABELS[inspection.syncStatus].label}
                  </span>
                )}
              </div>
            </div>

            {inspection.syncStatus === "conflicto" && inspection.rejection && (
              <p role="alert" className="text-xs rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-3 py-2">
                El servidor rechazó el envío ({inspection.rejection.status}): {inspection.rejection.error}
              </p>
            )}

            {inspection.syncStatus === "conflicto" && (
              <button
                type="button"
                onClick={() => {
                  retryInspection(inspection.id);
                  setInspection({ ...inspection, syncStatus: "pendiente_sync" });
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
              >
                Reintentar envío
              </button>
            )}

            {inspection.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inspection.photo}
                alt={`Evidencia fotográfica de ${inspection.location}`}
                className="w-full max-h-80 object-contain rounded-lg border border-slate-700 bg-slate-950"
              />
            )}

            <p className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
              {inspection.summary}
            </p>

            <dl className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="bg-slate-900/30 p-3 rounded border border-slate-800">
                <dt className="text-slate-400">Responsable:</dt>
                <dd className="font-semibold text-slate-200 mt-0.5">{inspection.inspector}</dd>
              </div>
              <div className="bg-slate-900/30 p-3 rounded border border-slate-800">
                <dt className="text-slate-400">Fecha de Registro:</dt>
                <dd className="font-semibold text-slate-200 mt-0.5">{inspection.date}</dd>
              </div>
              <div className="bg-slate-900/30 p-3 rounded border border-slate-800">
                <dt className="text-slate-400">Hallazgos:</dt>
                <dd className="font-semibold text-slate-200 mt-0.5">{inspection.findings}</dd>
              </div>
              {inspection.coords && (
                <div className="bg-slate-900/30 p-3 rounded border border-slate-800">
                  <dt className="text-slate-400">Ubicación aproximada (~1 km):</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">
                    {inspection.coords.latitude.toFixed(2)}, {inspection.coords.longitude.toFixed(2)}
                    {inspection.coords.synthetic && <span className="block font-normal text-slate-400">(aproximada del campus)</span>}
                  </dd>
                </div>
              )}
            </dl>
          </article>
        )}
      </div>
    </AppShell>
  );
}
