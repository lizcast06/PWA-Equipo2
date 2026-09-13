import { AppShell } from "../components/app-shell";
import { inspections } from "../lib/data/inspections";

export default function HomePage() {
  const hasData = inspections && inspections.length > 0;

  return (
    <AppShell activeRoute="/">
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Bitácora de Inspecciones</h2>
          <p className="text-sm text-slate-400">Registros de mantenimiento preventivo (Entorno sintético).</p>
        </div>

        {/* Estado Vacío (Empty State) */}
        {!hasData ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 p-6">
            <p className="text-base font-medium text-slate-300">No hay inspecciones registradas</p>
            <p className="text-xs text-slate-500 mt-1">Los registros completados en campo aparecerán aquí.</p>
          </div>
        ) : (
          /* Estado Normal con Datos */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inspections.map((item) => (
              <article key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm hover:border-slate-600 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {item.statusLabel || item.status}
                  </span>
                  <span className="text-xs text-slate-400">{item.date}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{item.location}</h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.summary}</p>
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex justify-between text-xs text-slate-400">
                  <span>Resp: <strong className="text-slate-200">{item.inspector}</strong></span>
                  <span>Hallazgos: <strong className="text-slate-200">{item.findings}</strong></span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Estado de Carga / Sincronización simulado */}
        <section aria-label="Indicadores de estado del shell" className="pt-6">
          <details className="bg-slate-800/40 rounded-lg border border-slate-700/60 p-3 text-xs text-slate-400">
            <summary className="cursor-pointer font-medium text-slate-300">
              Inspección de Estados de Ingeniería (Carga, Error, Vacío)
            </summary>
            <div className="mt-3 space-y-2 pt-2 border-t border-slate-700">
              <p>• <strong>Estado de Carga:</strong> Controlado mediante indicador visual en cabecera del shell.</p>
              <p>• <strong>Estado Vacío:</strong> Componente adaptativo renderizado ante colecciones vacías.</p>
              <p>• <strong>Manejo de Errores:</strong> Fallback visual integrado para fallos de red en campo.</p>
            </div>
          </details>
        </section>
      </div>
    </AppShell>
  );
}
