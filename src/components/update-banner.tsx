"use client";

import React from "react";

interface UpdateBannerProps {
  /** Se llama solo cuando la persona pulsa el botón. El banner nunca recarga por sí mismo. */
  onUpdate: () => void;
  updating?: boolean;
}

// Aviso de versión nueva del Service Worker (semana 10). La actualización recarga la página,
// así que se pide confirmación: lo guardado está en localStorage y se conserva, pero lo que
// esté escrito en un formulario sin guardar se perdería.
export function UpdateBanner({ onUpdate, updating = false }: UpdateBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-banner"
      className="bg-sky-500/15 border-b border-sky-500/30 text-sky-100 text-xs px-4 py-2"
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-3">
        <p>
          <strong>Hay una versión nueva.</strong> Guarda lo que estés capturando y pulsa Actualizar; tus inspecciones guardadas se conservan.
        </p>
        <button
          type="button"
          onClick={onUpdate}
          disabled={updating}
          className="px-3 py-1 rounded-md bg-sky-500 text-slate-900 font-semibold disabled:opacity-60"
        >
          {updating ? "Actualizando..." : "Actualizar"}
        </button>
      </div>
    </div>
  );
}
