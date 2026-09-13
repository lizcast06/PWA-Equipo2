import React from "react";

interface AppShellProps {
  children: React.ReactNode;
  activeRoute?: string;
  isSyncing?: boolean;
}

export function AppShell({ children, activeRoute = "/", isSyncing = false }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <header className="sticky top-0 z-50 bg-slate-800/90 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between" role="banner">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow">
            LAB
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">Inspecciones UTT</h1>
            <span className="text-xs text-slate-400">PWA Shell · Semana 2</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isSyncing && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              Sincronizando...
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Modo Shell
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6" role="main">
        {children}
      </main>

      <nav className="sticky bottom-0 z-50 bg-slate-800 border-t border-slate-700 px-6 py-2 md:hidden" role="navigation" aria-label="Navegación móvil">
        <ul className="flex justify-around items-center">
          <li>
            <a href="/" className={`text-xs flex flex-col items-center ${activeRoute === "/" ? "text-sky-400 font-semibold" : "text-slate-400"}`}>
              <span>Inspecciones</span>
            </a>
          </li>
          <li>
            <a href="#pendientes" className="text-xs flex flex-col items-center text-slate-400">
              <span>Pendientes</span>
            </a>
          </li>
          <li>
            <a href="#config" className="text-xs flex flex-col items-center text-slate-400">
              <span>Ajustes</span>
            </a>
          </li>
        </ul>
      </nav>

      <footer className="bg-slate-950 border-t border-slate-800 py-3 text-center text-xs text-slate-500" role="contentinfo">
        <p>PWA Inspecciones de Laboratorio · Datos Sintéticos · UTT 2026</p>
      </footer>
    </div>
  );
}
