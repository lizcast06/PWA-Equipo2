export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface DispatchNotificationResult {
  dispatched: boolean;
  channel: "PUSH_SERVICE_WORKER" | "NOTIFICATION_API" | "IN_APP_FALLBACK";
  permission: NotificationPermissionState;
}

export function checkNotificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!checkNotificationSupport()) {
    return "unsupported";
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

export async function dispatchInspectionAlert(
  payload: NotificationPayload,
  onFallbackUi?: (msg: string) => void
): Promise<DispatchNotificationResult> {
  if (!checkNotificationSupport()) {
    if (onFallbackUi) onFallbackUi(`${payload.title}: ${payload.body}`);
    return { dispatched: true, channel: "IN_APP_FALLBACK", permission: "unsupported" };
  }

  const currentPermission = Notification.permission as NotificationPermissionState;

  if (currentPermission === "granted") {
    // Si hay Service Worker activo, preferir registration.showNotification
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || "/icons/icon-192.png",
          data: payload.data,
        });
        return { dispatched: true, channel: "PUSH_SERVICE_WORKER", permission: "granted" };
      }
    }

    new Notification(payload.title, { body: payload.body, icon: payload.icon });
    return { dispatched: true, channel: "NOTIFICATION_API", permission: "granted" };
  }

  // Si el permiso fue denegado o no otorgado, degradar a banner in-app
  if (onFallbackUi) {
    onFallbackUi(`[Alerta Local] ${payload.title}: ${payload.body}`);
  }
  return { dispatched: false, channel: "IN_APP_FALLBACK", permission: currentPermission };
}