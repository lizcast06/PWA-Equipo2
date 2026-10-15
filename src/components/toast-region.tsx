"use client";

import React, { useEffect, useState } from "react";
import { TOAST_EVENT, ToastMessage } from "../lib/pwa/toast";

interface ActiveToast extends ToastMessage {
  id: number;
}

const TONE_CLASSES: Record<ToastMessage["tone"], string> = {
  info: "bg-slate-800 border-slate-600 text-slate-100",
  success: "bg-emerald-950 border-emerald-700 text-emerald-100",
  warning: "bg-amber-950 border-amber-700 text-amber-100",
  error: "bg-red-950 border-red-700 text-red-100",
};

export function ToastRegion() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    let nextId = 0;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastMessage>).detail;
      const id = ++nextId;
      setToasts((current) =>
        current.some((toast) => toast.message === detail.message) ? current : [...current, { ...detail, id }]
      );
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed z-[60] bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm space-y-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${TONE_CLASSES[toast.tone]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
