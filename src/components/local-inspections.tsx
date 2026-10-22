"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StoredInspection } from "../lib/storage/schema";
import { getLocalInspections, LocalInspectionPayload, STORE_CHANGED_EVENT } from "../lib/storage/local-store";

export const SYNC_STATUS_LABELS: Record<StoredInspection["status"], { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-slate-600/30 text-slate-300 border-slate-500/40" },
  pendiente_sync: { label: "Pendiente de envío", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  sincronizado: { label: "Enviada", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  conflicto: { label: "Error al enviar", className: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export function useLocalInspections(): StoredInspection[] | null {
  const [items, setItems] = useState<StoredInspection[] | null>(null);
  useEffect(() => {
    const load = () => setItems(getLocalInspections());
    load();
    window.addEventListener(STORE_CHANGED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(STORE_CHANGED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return items;
}

export function LocalInspections({ title = "Registradas en este dispositivo" }: { title?: string }) {
  const items = useLocalInspections();
  if (!items || items.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const payload = item.payload as unknown as LocalInspectionPayload;
          const status = SYNC_STATUS_LABELS[item.status];
          return (
            <li key={item.id}>
              <article className="relative h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm hover:border-sky-500/60 transition">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${status.className}`}>{status.label}</span>
                  <span className="text-xs text-slate-400">{payload.date}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">
                  <Link href={`/inspecciones/${item.id}`} className="after:absolute after:inset-0 after:rounded-lg focus:outline-none">
                    {item.location}
                  </Link>
                </h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{payload.summary}</p>
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                  <span>
                    Resp: <strong className="text-slate-200">{item.inspector}</strong>
                  </span>
                  <span>
                    Hallazgos: <strong className="text-slate-200">{item.findings}</strong>
                    {payload.photo ? " · 📷" : ""}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
