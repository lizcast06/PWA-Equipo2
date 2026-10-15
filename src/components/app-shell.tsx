"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { registerServiceWorker } from "../lib/pwa/register-service-worker";
import { useAppStatus } from "../lib/pwa/use-app-status";
import { showToast } from "../lib/pwa/toast";
import { syncPendingInspections } from "../lib/storage/local-store";
import { dispatchInspectionAlert } from "../lib/notifications/client";
import { ToastRegion } from "./toast-region";

interface AppShellProps {
  children: React.ReactNode;
  activeRoute?: string;
  isSyncing?: boolean;
}

const NAV_ITEMS = [
  { href: "/inspecciones", label: "Inspecciones", match: (path: string) => path === "/" || (path.startsWith("/inspecciones") && path !== "/inspecciones/nueva") },
  { href: "/inspecciones/nueva", label: "Nueva", match: (path: string) => path === "/inspecciones/nueva" },
  { href: "/pendientes", label: "Pendientes", match: (path: string) => path.startsWith("/pendientes") },
  { href: "/ajustes", label: "Ajustes", match: (path: string) => path.startsWith("/ajustes") },
];

export function AppShell({ children, activeRoute = "/", isSyncing = false }: AppShellProps) {
  const pathname = usePathname() || activeRoute;
  const { online, offlineReadiness, pendingCount } = useAppStatus();
  const [autoSyncing, setAutoSyncing] = useState(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Sincronización automática al abrir la app y al recuperar la conexión.
  useEffect(() => {
    if (!online || pendingCount === 0) return;
    let active = true;
    setAutoSyncing(true);
    syncPendingInspections()
      .then(async (result) => {
        if (!active || result.skipped) return;
        if (result.processed > 0) {
          const body =
            result.processed === 1
              ? "1 inspección guardada sin conexión ya se envió."
              : `${result.processed} inspecciones guardadas sin conexión ya se enviaron.`;
          // Notificación del sistema si hay permiso; el aviso en pantalla se muestra siempre.
          await dispatchInspectionAlert({ title: "Sincronización completa", body }).catch(() => undefined);
          showToast(body, "success");
        }
        if (result.failed > 0) {
          showToast(`${result.failed} inspección(es) no se pudieron enviar. Revisa Pendientes.`, "error");
        }
      })
      .finally(() => active && setAutoSyncing(false));
    return () => {
      active = false;
    };
  }, [online, pendingCount]);

  const syncing = isSyncing || autoSyncing;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <header className="sticky top-0 z-50 bg-slate-800/90 backdrop-blur border-b border-slate-700 px-4 py-3" role="banner">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center space-x-3 min-w-0">
            <img src="/icon-192.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg shadow" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-none mb-1">Inspecciones UTT</h1>
              <span className="text-xs text-slate-400">Bitácora de laboratorios</span>
            </div>
          </Link>

          <nav aria-label="Navegación principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-xs px-3 py-1.5 rounded-md transition ${
                      item.match(pathname) ? "bg-sky-500/15 text-sky-300 font-semibold" : "text-slate-300 hover:bg-slate-700/60"
                    }`}
                  >
                    {item.label}
                    {item.href === "/pendientes" && pendingCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 shrink-0" aria-live="polite">
            {syncing && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Sincronizando...
              </span>
            )}
            <ConnectionBadge online={online} readiness={offlineReadiness} />
          </div>
        </div>
      </header>

      {!online && (
        <div role="status" className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs text-center px-4 py-2">
          Estás sin conexión. Puedes seguir registrando inspecciones: se guardan en este dispositivo y se envían al volver la señal.
        </div>
      )}

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6" role="main">
        {children}
      </main>

      <nav className="sticky bottom-0 z-50 bg-slate-800 border-t border-slate-700 px-2 py-2 md:hidden" role="navigation" aria-label="Navegación móvil">
        <ul className="flex justify-around items-center">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.match(pathname) ? "page" : undefined}
                className={`relative text-xs flex flex-col items-center px-3 py-1 ${
                  item.match(pathname) ? "text-sky-400 font-semibold" : "text-slate-400"
                }`}
              >
                <span>{item.label}</span>
                {item.href === "/pendientes" && pendingCount > 0 && (
                  <span className="absolute -top-1 right-0 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="bg-slate-950 border-t border-slate-800 py-3 text-center text-xs text-slate-500" role="contentinfo">
        <p>PWA Inspecciones de Laboratorio · Datos Sintéticos · UTT 2026</p>
      </footer>

      <ToastRegion />
    </div>
  );
}

function ConnectionBadge({ online, readiness }: { online: boolean; readiness: "comprobando" | "listo" | "no-disponible" }) {
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
        Sin conexión
      </span>
    );
  }
  if (readiness === "listo") {
    return (
      <span
        title="El Service Worker está activo: las páginas visitadas funcionan sin internet."
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        Listo sin conexión
      </span>
    );
  }
  if (readiness === "comprobando") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600">
        En línea
      </span>
    );
  }
  return (
    <span
      title="El modo sin conexión aún no está activo en este navegador. Recarga la página o revisa Ajustes."
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
      Offline no activo
    </span>
  );
}
