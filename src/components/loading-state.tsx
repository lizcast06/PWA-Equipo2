import React from "react";

interface LoadingStateProps {
  message?: string;
  description?: string;
}

export function LoadingState({
  message = "Cargando datos...",
  description = "Consultando registros sintéticos de laboratorio en curso",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-8 bg-slate-800/60 rounded-xl border border-slate-700 text-center my-6 space-y-4 animate-fade-in"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{message}</h3>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
      <span className="sr-only">Procesando información</span>
    </div>
  );
}