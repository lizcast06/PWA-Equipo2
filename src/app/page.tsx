import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { InspectionCard } from "../components/inspection-card";
import { LocalInspections } from "../components/local-inspections";
import { inspections } from "../lib/data/inspections";

export default function HomePage() {
  const hasData = inspections && inspections.length > 0;

  return (
    <AppShell activeRoute="/">
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Inspecciones de laboratorio</h2>
            <p className="text-sm text-slate-400">
              Bitácora de mantenimiento preventivo. Los datos mostrados son sintéticos.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/inspecciones/nueva"
              className="whitespace-nowrap inline-flex items-center justify-center px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white shadow"
            >
              + Nueva inspección
            </Link>
            <Link
              href="/inspecciones"
              className="whitespace-nowrap inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm font-medium text-slate-200"
            >
              Ver catálogo
            </Link>
          </div>
        </div>

        <LocalInspections />

        {/* Estado Vacío (Empty State) */}
        {!hasData ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 p-6">
            <p className="text-base font-medium text-slate-300">No hay inspecciones registradas</p>
            <p className="text-xs text-slate-500 mt-1">Los registros completados en campo aparecerán aquí.</p>
          </div>
        ) : (
          <section aria-label="Inspecciones recientes" className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Inspecciones recientes</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inspections.map((item) => (
                <InspectionCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

const errorIntencionalParaCI = true;
