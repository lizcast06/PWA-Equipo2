import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { inspections } from "../../lib/data/inspections";

export default function InspeccionesCatalogoSSRPage() {
  const catalog = Array.isArray(inspections) ? inspections : [];
  const hasData = catalog.length > 0;
  const loadError = !Array.isArray(inspections)
    ? "El origen sintético de inspecciones no devolvió una colección válida."
    : null;

  return (
    <AppShell activeRoute="/inspecciones">
      <div className="space-y-6">
        <header className="border-b border-slate-700 pb-4">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SSR (Server-Side Rendered)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-2">
            Catálogo de inspecciones
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Listado renderizado en el servidor con datos sintéticos. El HTML llega con el contenido
            ya resuelto; no hay hidratación de tarjetas.
          </p>
        </header>

        {loadError && (
          <div
            role="alert"
            className="p-6 bg-red-950/40 rounded-xl border border-red-800 text-center space-y-2"
          >
            <h3 className="text-sm font-semibold text-red-300">Error de renderizado SSR</h3>
            <p className="text-xs text-red-400">{loadError}</p>
          </div>
        )}

        {!loadError && !hasData && (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 p-6">
            <p className="text-base font-medium text-slate-300">No hay inspecciones registradas</p>
            <p className="text-xs text-slate-500 mt-1">
              El servidor resolvió la consulta y la colección sintética está vacía.
            </p>
          </div>
        )}

        {!loadError && hasData && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((item) => (
              <li key={item.id}>
                <article className="h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-sm hover:border-slate-600 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {item.statusLabel || item.status}
                    </span>
                    <span className="text-xs text-slate-400">{item.date}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">{item.location}</h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.summary}</p>
                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex justify-between items-center text-xs text-slate-400">
                    <span>
                      Resp: <strong className="text-slate-200">{item.inspector}</strong>
                    </span>
                    <Link
                      href={`/inspecciones/${item.id}`}
                      className="text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Ver detalle CSR
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
