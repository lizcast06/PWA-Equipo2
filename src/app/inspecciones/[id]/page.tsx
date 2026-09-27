"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { LoadingState } from "../../../components/loading-state";
import { inspections } from "../../../lib/data/inspections";

interface InspectionDetail {
  id: string;
  location: string;
  date: string;
  inspector: string;
  status: string;
  statusLabel?: string;
  findings: number;
  summary: string;
}

export default function InspeccionDetalleCSRPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

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
      if (match) {
        setInspection(match);
      } else {
        setError(`No se encontró registro para la inspección con identificador: ${id}`);
      }
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [id]);

  return (
    <AppShell activeRoute="/inspecciones">
      <div className="space-y-6">
        <nav aria-label="Ruta de navegación">
          <Link
            href="/inspecciones"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-1"
          >
            <span>&larr; Volver al catálogo SSR</span>
          </Link>
        </nav>

        <header className="border-b border-slate-700 pb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              CSR (Client-Side Rendered)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-2">
            Detalle Interactivo de Laboratorio
          </h2>
        </header>

        {/* Estado de Carga */}
        {isLoading && (
          <LoadingState
            message="Hidratando y recuperando inspección..."
            description="Recuperando estado de memoria cliente para el registro seleccionado"
          />
        )}

        {/* Estado de Error */}
        {!isLoading && error && (
          <div
            role="alert"
            className="p-6 bg-red-950/40 rounded-xl border border-red-800 text-center space-y-3"
          >
            <h3 className="text-sm font-semibold text-red-300">Error de Recuperación</h3>
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
              <span className="px-2.5 py-1 rounded text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {inspection.statusLabel || inspection.status}
              </span>
            </div>

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
            </dl>
          </article>
        )}
      </div>
    </AppShell>
  );
}
