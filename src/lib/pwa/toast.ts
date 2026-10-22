// Avisos dentro de la app. Es el canal de respaldo cuando las
// notificaciones del sistema no están permitidas o no existen.
export const TOAST_EVENT = "inspecciones:toast";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

export function showToast(message: string, tone: ToastTone = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: { message, tone } }));
}
