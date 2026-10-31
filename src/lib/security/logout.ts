// Cerrar sesión con limpieza local (semana 9, riesgo R3: tableta extraviada o compartida).
// Al terminar la sesión no debe quedar en el dispositivo nada de lo que capturó esa persona:
// inspecciones, cola de sincronización, copia del remoto simulado, sesión ni respuestas
// guardadas en la caché dinámica del Service Worker. El shell estático (HTML/JS/íconos sin
// datos personales) se conserva para que la app siga abriendo sin conexión.

import { DB_CONFIG } from "../storage/schema";
import { clearLocalData, getLocalInspections, getPendingQueue } from "../storage/local-store";
import { clearCurrentUser } from "./session";

/** Prefijo de las cachés dinámicas del Service Worker (ver public/sw.js). */
export const RUNTIME_CACHE_PREFIX = "pwa-inspecciones-runtime-";

export interface LogoutResult {
  /** Inspecciones que había en el dispositivo y se eliminaron. */
  removedInspections: number;
  /** De esas, cuántas no se habían enviado y se perdieron. */
  unsentLost: number;
  /** Cachés dinámicas eliminadas. */
  clearedCaches: string[];
}

/** Inspecciones capturadas que aún no llegan al servidor (para advertir antes de cerrar sesión). */
export function countUnsentInspections(): number {
  return getPendingQueue().length;
}

export async function logout(): Promise<LogoutResult> {
  const removedInspections = getLocalInspections().length;
  const unsentLost = countUnsentInspections();

  clearLocalData();

  // Cualquier otra llave de la app que se agregue en el futuro también se elimina.
  if (typeof localStorage !== "undefined") {
    const appPrefix = `${DB_CONFIG.name}:`;
    Object.keys(localStorage)
      .filter((key) => key.startsWith(appPrefix))
      .forEach((key) => localStorage.removeItem(key));
  }
  clearCurrentUser();

  const clearedCaches: string[] = [];
  if (typeof caches !== "undefined") {
    const names = await caches.keys();
    for (const name of names.filter((cacheName) => cacheName.startsWith(RUNTIME_CACHE_PREFIX))) {
      if (await caches.delete(name)) clearedCaches.push(name);
    }
  }

  return { removedInspections, unsentLost, clearedCaches };
}
