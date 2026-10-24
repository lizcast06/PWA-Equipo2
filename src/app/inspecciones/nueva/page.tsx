"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { inspections } from "../../../lib/data/inspections";
import { createFileInputFallback, requestCameraStream } from "../../../lib/device/camera";
import { GeolocationResolution, obtainLocation } from "../../../lib/device/geolocation";
import { saveNewInspection } from "../../../lib/storage/local-store";
import { showToast } from "../../../lib/pwa/toast";
import { InspectionFormErrors, validateInspectionInput } from "../../../lib/validation/inspection";

const KNOWN_LABS = Array.from(new Set(inspections.map((item) => item.location)));
const OTHER_LAB = "__otro__";
const MAX_PHOTO_SIDE = 800;

// Reduce la foto para que quepa en el almacenamiento local del dispositivo.
function downscale(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function downscaleDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(downscale(img, img.naturalWidth, img.naturalHeight));
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

type FormErrors = InspectionFormErrors;

export default function NuevaInspeccionPage() {
  const router = useRouter();
  const [lab, setLab] = useState(KNOWN_LABS[0] ?? OTHER_LAB);
  const [otherLab, setOtherLab] = useState("");
  const [inspector, setInspector] = useState("");
  const [findings, setFindings] = useState("0");
  const [summary, setSummary] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [geo, setGeo] = useState<GeolocationResolution | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const openFilePicker = () => {
    const input = createFileInputFallback(async (dataUrl) => setPhoto(await downscaleDataUrl(dataUrl)));
    input?.click();
  };

  const openCamera = async () => {
    const mediaStream = await requestCameraStream();
    if (mediaStream) {
      setStream(mediaStream);
    } else {
      // Sin permiso o sin cámara: se usa el selector de archivos (en celular abre la cámara nativa).
      showToast("No se pudo abrir la cámara aquí. Elige o toma la foto con el selector del dispositivo.", "warning");
      openFilePicker();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setPhoto(downscale(video, video.videoWidth, video.videoHeight));
    setStream(null);
  };

  const addLocation = async () => {
    setLocating(true);
    const result = await obtainLocation();
    setGeo(result);
    setLocating(false);
  };

  const validate = (): FormErrors =>
    validateInspectionInput({
      location: lab === OTHER_LAB ? otherLab : lab,
      inspector,
      findings,
      summary,
    });

  // Tras el primer intento de envío, los errores se actualizan mientras se corrige.
  useEffect(() => {
    if (submitted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, lab, otherLab, inspector, findings, summary]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast("Revisa los campos marcados en rojo.", "error");
      return;
    }

    setSaving(true);
    try {
      const record = saveNewInspection({
        location: lab === OTHER_LAB ? otherLab : lab,
        inspector,
        findings: Number(findings),
        summary,
        photo,
        coords: geo?.coords,
      });
      showToast(
        navigator.onLine
          ? "Inspección guardada. Enviando..."
          : "Sin conexión: la inspección quedó guardada en este dispositivo y se enviará al volver la señal.",
        navigator.onLine ? "success" : "warning"
      );
      router.push(`/inspecciones/${record.id}`);
    } catch {
      setSaving(false);
      showToast("No hay espacio suficiente en el dispositivo. Quita la foto o libera datos en Ajustes.", "error");
    }
  };

  const inputClass =
    "w-full rounded-lg bg-slate-900 border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500";
  const borderFor = (field: keyof FormErrors) => (errors[field] ? "border-red-500" : "border-slate-700");

  return (
    <AppShell activeRoute="/inspecciones/nueva">
      <div className="space-y-6 max-w-2xl mx-auto">
        <nav aria-label="Ruta de navegación">
          <Link href="/inspecciones" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
            &larr; Volver al catálogo
          </Link>
        </nav>

        <header className="border-b border-slate-700 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Nueva inspección</h2>
          <p className="text-sm text-slate-400 mt-1">
            Funciona aunque no haya internet: se guarda en este dispositivo y se envía sola al recuperar la conexión.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate className="space-y-5 bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="space-y-1.5">
            <label htmlFor="lab" className="text-sm font-medium text-slate-200">Laboratorio</label>
            <select id="lab" value={lab} onChange={(e) => setLab(e.target.value)} className={`${inputClass} ${borderFor("location")}`}>
              {KNOWN_LABS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value={OTHER_LAB}>Otro laboratorio...</option>
            </select>
            {lab === OTHER_LAB && (
              <input
                aria-label="Nombre del laboratorio"
                value={otherLab}
                onChange={(e) => setOtherLab(e.target.value)}
                placeholder="Ej. Laboratorio de Química"
                className={`${inputClass} ${borderFor("location")} mt-2`}
              />
            )}
            {errors.location && <p className="text-xs text-red-400">{errors.location}</p>}
          </div>

          <div className="grid sm:grid-cols-[1fr_8rem] gap-4">
            <div className="space-y-1.5">
              <label htmlFor="inspector" className="text-sm font-medium text-slate-200">Responsable</label>
              <input
                id="inspector"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder="Ej. Técnica D"
                autoComplete="off"
                className={`${inputClass} ${borderFor("inspector")}`}
              />
              {errors.inspector && <p className="text-xs text-red-400">{errors.inspector}</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="findings" className="text-sm font-medium text-slate-200">Hallazgos</label>
              <input
                id="findings"
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className={`${inputClass} ${borderFor("findings")}`}
              />
              {errors.findings && <p className="text-xs text-red-400">{errors.findings}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="summary" className="text-sm font-medium text-slate-200">Descripción</label>
            <textarea
              id="summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="¿Qué se revisó y qué se encontró?"
              className={`${inputClass} ${borderFor("summary")}`}
            />
            {errors.summary && <p className="text-xs text-red-400">{errors.summary}</p>}
          </div>

          {/* Evidencia fotográfica */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-200">Foto de evidencia (opcional)</legend>
            {stream ? (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black max-h-80" />
                <div className="flex gap-2">
                  <button type="button" onClick={capturePhoto} className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white">
                    Capturar
                  </button>
                  <button type="button" onClick={() => setStream(null)} className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-200 hover:bg-slate-700">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : photo ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="Vista previa de la evidencia" className="w-full max-h-64 object-contain rounded-lg border border-slate-700 bg-slate-950" />
                <button type="button" onClick={() => setPhoto(undefined)} className="text-xs text-red-300 hover:text-red-200">
                  Quitar foto
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={openCamera} className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-700">
                  📷 Tomar foto
                </button>
                <button type="button" onClick={openFilePicker} className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-700">
                  Elegir de la galería
                </button>
              </div>
            )}
          </fieldset>

          {/* Ubicación */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-200">Ubicación (opcional)</legend>
            {geo?.coords ? (
              <div className="text-xs rounded-lg border border-slate-700 bg-slate-900/50 p-3 space-y-1">
                <p className="text-slate-200">
                  {geo.coords.latitude.toFixed(4)}, {geo.coords.longitude.toFixed(4)}
                  <span className="text-slate-400"> (±{Math.round(geo.coords.accuracy)} m)</span>
                </p>
                {geo.coords.synthetic && (
                  <p className="text-amber-300">
                    {geo.status === "DENIED"
                      ? "No diste permiso de ubicación; se usa la ubicación aproximada del campus."
                      : "No se pudo obtener tu ubicación; se usa la ubicación aproximada del campus."}
                  </p>
                )}
                <button type="button" onClick={() => setGeo(null)} className="text-red-300 hover:text-red-200">Quitar ubicación</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={addLocation}
                disabled={locating}
                className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-60"
              >
                {locating ? "Obteniendo ubicación..." : "📍 Agregar mi ubicación"}
              </button>
            )}
          </fieldset>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-700">
            <Link href="/inspecciones" className="text-center px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-200 hover:bg-slate-700">
              Cancelar
            </Link>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar inspección"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
