// Registro del Service Worker y actualización controlada (semana 10).
//
// Flujo:
// 1. El navegador descarga una versión nueva de /sw.js y la instala (precache completo).
// 2. Como ya hay una versión controlando la página, la nueva queda "en espera"
//    (`registration.waiting`). Aquí se detecta y se avisa a la interfaz con `onUpdateReady`.
// 3. Nada cambia hasta que la persona pulsa "Actualizar": `applyServiceWorkerUpdate` envía
//    { type: "SKIP_WAITING" } al worker en espera, este toma el control y la página se
//    recarga UNA sola vez al recibir `controllerchange`.
//
// Así no se recarga la página a mitad de una captura ni se mezclan archivos JS de dos versiones.

export const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

export interface RegisterOptions {
  /** Se llama cuando hay una versión nueva instalada y esperando a que la persona la acepte. */
  onUpdateReady?: (registration: ServiceWorkerRegistration) => void;
}

export async function registerServiceWorker(options: RegisterOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  let registration: ServiceWorkerRegistration | null;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
  } catch (error) {
    // Sin conexión `register` falla al descargar /sw.js, pero el registro existente sigue
    // ahí y puede tener una versión esperando: el aviso no debe desaparecer al navegar offline.
    console.error("PWA: Fallo al registrar el Service Worker:", error);
    registration = (await navigator.serviceWorker.getRegistration("/").catch(() => undefined)) ?? null;
  }
  if (!registration) return null;
  const current = registration;
  const notify = () => options.onUpdateReady?.(current);

  // Caso A: al abrir la app ya había una versión esperando (se instaló en una visita anterior).
  if (current.waiting && navigator.serviceWorker.controller) {
    notify();
  }

  // Caso B: la versión nueva se instala mientras la app está abierta.
  current.addEventListener("updatefound", () => {
    const installingWorker = current.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener("statechange", () => {
      // Sin `controller` es la primera instalación: se activa sola y no hay nada que avisar.
      // Si el precache falla, el estado pasa a "redundant" y nunca llega aquí: no hay aviso.
      if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
        notify();
      }
    });
  });

  return current;
}

/**
 * Aplica la versión en espera. Solo se llama cuando la persona pulsa "Actualizar".
 * Devuelve false si ya no había ninguna versión esperando.
 */
export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration): boolean {
  const waiting = registration.waiting;
  if (!waiting) return false;

  // El listener se agrega aquí, y no al registrar, para que la primera instalación
  // (clients.claim() también dispara controllerchange) nunca recargue la página.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  waiting.postMessage(SKIP_WAITING_MESSAGE);
  return true;
}
