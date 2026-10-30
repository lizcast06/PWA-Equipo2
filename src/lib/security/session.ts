// Sesión sintética de la PWA (semana 9). No hay backend real: los usuarios y roles son
// datos de prueba que permiten modelar mínimo privilegio y limpieza al cerrar sesión.

export type Role = "inspector" | "supervisor" | "visitante";

export interface SyntheticUser {
  id: string;
  name: string;
  role: Role;
  /** Laboratorios que un supervisor puede revisar (alcance asignado). */
  scope?: string[];
}

export const SYNTHETIC_USERS: readonly SyntheticUser[] = [
  { id: "inspector-a", name: "Técnica A", role: "inspector" },
  { id: "inspector-b", name: "Técnico B", role: "inspector" },
  {
    id: "supervisor-1",
    name: "Supervisora C",
    role: "supervisor",
    scope: ["Laboratorio de Redes", "Laboratorio de Electrónica"],
  },
  { id: "visitante", name: "Visitante", role: "visitante" },
];

const SESSION_KEY = "utt_pwa_inspections_db:session";

export const SESSION_CHANGED_EVENT = "inspecciones:session-changed";

export function findUser(id: string | null | undefined): SyntheticUser | undefined {
  return SYNTHETIC_USERS.find((user) => user.id === id);
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getCurrentUser(): SyntheticUser | undefined {
  if (!storageAvailable()) return undefined;
  try {
    return findUser(localStorage.getItem(SESSION_KEY));
  } catch {
    return undefined;
  }
}

export function setCurrentUser(id: string): SyntheticUser {
  const user = findUser(id);
  if (!user) throw new Error(`Usuario sintético desconocido: ${id}`);
  if (storageAvailable()) {
    localStorage.setItem(SESSION_KEY, user.id);
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
  }
  return user;
}

/** Quita solo la sesión. La limpieza de datos locales al cerrar sesión vive en local-store. */
export function clearCurrentUser(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}
