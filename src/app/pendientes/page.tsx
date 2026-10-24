"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { SYNC_STATUS_LABELS, useLocalInspections } from "../../components/local-inspections";
import { LoadingState } from "../../components/loading-state";
import { useAppStatus } from "../../lib/pwa/use-app-status";
import { inspectionDetailHref } from "../../lib/routes";
import { showToast } from "../../lib/pwa/toast";
import { LocalInspectionPayload, retryInspection, syncPendingInspections } from "../../lib/storage/local-store";

export default function PendientesPage() {
  const items = useLocalInspections();
  const { online, pendingCount } = useAppStatus();
  const [syncing, setSyncing] = useState(false);

  const waiting = items?.filter((item) => item.status !== "sincronizado") ?? [];
  const sent = items?.filter((item) => item.status === "sincronizado") ?? [];

  const syncNow = async () => {
    setSyncing(true);
    const result = await syncPendingInspections();
    setSyncing(false);
    if (result.skipped) {
      showToast(online ? "No hay nada pendiente por enviar." : "Sin conexión: se enviará cuando vuelva la señal.", "info");
    } else if (result.failed > 0 || result.pending > 0) {
      showToast("Algunas inspecciones no se pudieron enviar. Intenta de nuevo.", "error");
    } else {
      showToast(`${result.processed} inspección(es) enviadas.`, "success");
    }
  };

  return (
    <AppShell activeRoute="/pendientes" isSyncing={syncing}>
      <div className="space-y-6">
        <header className="border-b border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Pendientes de envío</h2>
            <p className="text-sm text-slate-400 mt-1">
              Inspecciones guardadas en este dispositivo. Se envían solas al haber conexión.
            </p>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing || !online || pendingCount === 0}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Enviando..." : online ? "Enviar ahora" : "Sin conexión"}
          </button>
        </header>

        {items === null && <LoadingState message="Cargando pendientes..." description="Leyendo el almacenamiento del dispositivo" />}

        {items !== null && waiting.length === 0 && (
          <div className="text-center py-10 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 p-6">
            <p className="text-base font-medium text-slate-300">Todo está al día ✓</p>
            <p className="text-xs text-slate-500 mt-1">No hay inspecciones esperando envío.</p>
            <Link href="/inspecciones/nueva" className="inline-block mt-4 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white">
              + Nueva inspección
            </Link>
          </div>
        )}

        {waiting.length > 0 && (
          <ul className="space-y-3">
            {waiting.map((item) => {
              const payload = item.payload as unknown as LocalInspectionPayload;
              const status = SYNC_STATUS_LABELS[item.status];
              return (
                <li key={item.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${status.className}`}>{status.label}</span>
                      <span className="text-xs text-slate-400">{payload.date}</span>
                    </div>
                    <Link href={inspectionDetailHref(item.id)} className="block mt-1 text-sm font-semibold text-slate-100 hover:text-sky-300 truncate">
                      {item.location}
                    </Link>
                    <p className="text-xs text-slate-400 truncate">{payload.summary}</p>
                  </div>
                  {item.status === "conflicto" && (
                    <button
                      type="button"
                      onClick={() => retryInspection(item.id)}
                      className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                    >
                      Reintentar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {sent.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Enviadas recientemente</h3>
            <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
              {sent.slice(0, 10).map((item) => (
                <li key={item.id} className="px-4 py-2 flex justify-between text-xs">
                  <Link href={inspectionDetailHref(item.id)} className="text-slate-200 hover:text-sky-300 truncate">
                    {item.location}
                  </Link>
                  <span className="text-emerald-300 shrink-0 ml-3">Enviada</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
