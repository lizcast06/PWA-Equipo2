"use client";

import { useEffect, useState } from "react";
import { getPendingQueue, STORE_CHANGED_EVENT } from "../storage/local-store";

export type OfflineReadiness = "comprobando" | "listo" | "no-disponible";

export interface AppStatus {
  online: boolean;
  offlineReadiness: OfflineReadiness;
  pendingCount: number;
}

// Estado real de la app: conexión del navegador, si el Service Worker
// ya controla la página (modo offline disponible) y registros pendientes.
export function useAppStatus(): AppStatus {
  const [online, setOnline] = useState(true);
  const [offlineReadiness, setOfflineReadiness] = useState<OfflineReadiness>("comprobando");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const updatePending = () => setPendingCount(getPendingQueue().length);

    updateOnline();
    updatePending();

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener(STORE_CHANGED_EVENT, updatePending);
    window.addEventListener("storage", updatePending);

    let cancelled = false;
    const updateReadiness = () => {
      if (cancelled) return;
      setOfflineReadiness(navigator.serviceWorker?.controller ? "listo" : "no-disponible");
    };

    if (!("serviceWorker" in navigator)) {
      setOfflineReadiness("no-disponible");
    } else {
      navigator.serviceWorker.ready.then(updateReadiness);
      navigator.serviceWorker.addEventListener("controllerchange", updateReadiness);
      // Si el registro falla, `ready` nunca resuelve: se marca como no disponible.
      const timer = window.setTimeout(updateReadiness, 4000);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        window.removeEventListener("online", updateOnline);
        window.removeEventListener("offline", updateOnline);
        window.removeEventListener(STORE_CHANGED_EVENT, updatePending);
        window.removeEventListener("storage", updatePending);
        navigator.serviceWorker.removeEventListener("controllerchange", updateReadiness);
      };
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener(STORE_CHANGED_EVENT, updatePending);
      window.removeEventListener("storage", updatePending);
    };
  }, []);

  return { online, offlineReadiness, pendingCount };
}
