"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { useAppStatus } from "../../lib/pwa/use-app-status";
import { showToast } from "../../lib/pwa/toast";
import {
  checkNotificationSupport,
  dispatchInspectionAlert,
  NotificationPermissionState,
  requestNotificationPermission,
} from "../../lib/notifications/client";
import { clearLocalData, getLocalInspections } from "../../lib/storage/local-store";

const PERMISSION_TEXT: Record<NotificationPermissionState, string> = {
  granted: "Activadas",
  denied: "Bloqueadas en el navegador",
  default: "Sin decidir",
  unsupported: "No disponibles en este navegador",
};

export default function AjustesPage() {
  const { online, offlineReadiness, pendingCount } = useAppStatus();
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    setPermission(checkNotificationSupport() ? (Notification.permission as NotificationPermissionState) : "unsupported");
    setLocalCount(getLocalInspections().length);
  }, []);

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      await dispatchInspectionAlert(
        { title: "Notificaciones activadas", body: "Te avisaremos cuando se envíen tus inspecciones." },
        (msg) => showToast(msg, "info")
      );
    } else if (result === "denied") {
      showToast("Las notificaciones quedaron bloqueadas. Puedes cambiarlo en la configuración del sitio del navegador.", "warning");
    }
  };

  const testNotification = () =>
    dispatchInspectionAlert({ title: "Prueba de aviso", body: "Así se verán los avisos de inspecciones." }, (msg) =>
      showToast(msg, "info")
    );

  const wipe = () => {
    const message =
      pendingCount > 0
        ? `Hay ${pendingCount} inspección(es) sin enviar que se perderán. ¿Borrar todo lo guardado en este dispositivo?`
        : "¿Borrar las inspecciones guardadas en este dispositivo?";
    if (!window.confirm(message)) return;
    clearLocalData();
    setLocalCount(0);
    showToast("Datos locales borrados.", "success");
  };

  const row = "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4";

  return (
    <AppShell activeRoute="/ajustes">
      <div className="space-y-6 max-w-2xl mx-auto">
        <header className="border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Ajustes</h2>
          <p className="text-sm text-slate-400 mt-1">Permisos y estado de la app en este dispositivo.</p>
        </header>

        <section className="bg-slate-800 rounded-xl border border-slate-700 px-5 divide-y divide-slate-700">
          <div className={row}>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 m-0 mb-0.5">Notificaciones</h3>
              <p className="text-xs text-slate-400">Estado: {PERMISSION_TEXT[permission]}</p>
            </div>
            {permission === "granted" ? (
              <button type="button" onClick={testNotification} className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs text-slate-100 hover:bg-slate-700">
                Enviar aviso de prueba
              </button>
            ) : permission === "default" ? (
              <button type="button" onClick={enableNotifications} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white">
                Activar notificaciones
              </button>
            ) : (
              <span className="text-xs text-slate-400">Se mostrarán avisos dentro de la app.</span>
            )}
          </div>

          <div className={row}>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 m-0 mb-0.5">Conexión</h3>
              <p className="text-xs text-slate-400">{online ? "En línea" : "Sin conexión"}</p>
            </div>
          </div>

          <div className={row}>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 m-0 mb-0.5">Modo sin conexión</h3>
              <p className="text-xs text-slate-400">
                {offlineReadiness === "listo"
                  ? "Activo: las páginas que ya visitaste abren sin internet."
                  : offlineReadiness === "comprobando"
                    ? "Comprobando..."
                    : "Aún no activo. Recarga la página una vez con conexión para activarlo."}
              </p>
            </div>
            {offlineReadiness === "no-disponible" && (
              <button type="button" onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg border border-slate-600 text-xs text-slate-100 hover:bg-slate-700">
                Recargar
              </button>
            )}
          </div>

          <div className={row}>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 m-0 mb-0.5">Datos en este dispositivo</h3>
              <p className="text-xs text-slate-400">
                {localCount} inspección(es) guardadas · {pendingCount} sin enviar
              </p>
            </div>
            <button
              type="button"
              onClick={wipe}
              disabled={localCount === 0}
              className="px-3 py-1.5 rounded-lg border border-red-700 text-xs text-red-300 hover:bg-red-950 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Borrar datos locales
            </button>
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Privacidad: las fotos y la ubicación solo se guardan en este dispositivo junto con la inspección. Usa únicamente datos sintéticos.
        </p>
      </div>
    </AppShell>
  );
}
