import React from "react";
import Link from "next/link";
import { Inspection } from "../lib/data/inspections";

// Tarjeta completa clicable: el enlace del título cubre toda la tarjeta.
export function InspectionCard({ item }: { item: Inspection }) {
  const attention = item.status === "attention";
  return (
    <article className="relative h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm hover:border-sky-500/60 transition">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
            attention
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-sky-500/10 text-sky-400 border-sky-500/20"
          }`}
        >
          {item.statusLabel || item.status}
        </span>
        <span className="text-xs text-slate-400">{item.date}</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-100">
        <Link href={`/inspecciones/${item.id}`} className="after:absolute after:inset-0 after:rounded-lg focus:outline-none">
          {item.location}
        </Link>
      </h3>
      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.summary}</p>
      <div className="mt-3 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
        <span>
          Resp: <strong className="text-slate-200">{item.inspector}</strong>
        </span>
        <span>
          Hallazgos: <strong className="text-slate-200">{item.findings}</strong>
        </span>
      </div>
    </article>
  );
}
