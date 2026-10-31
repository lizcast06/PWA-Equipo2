// Minimización de datos (semana 9, riesgo R1, diapositiva 15).
// La finalidad de la ubicación es saber en qué parte del campus se hizo la inspección, no
// seguir a la persona: "ubicación precisa no requerida → no almacenar". Se guardan 2 decimales
// (≈ 1.1 km) y se descarta la precisión del GPS (`accuracy`).

/** Decimales que se conservan en latitud y longitud (≈ 1 km). */
export const LOCATION_DECIMALS = 2;

export interface RawCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  synthetic?: boolean;
}

export interface MinimizedLocation {
  latitude: number;
  longitude: number;
  /** true si se usó la ubicación de respaldo del campus (permiso negado o sin GPS). */
  synthetic: boolean;
  /** Siempre true: lo guardado es aproximado a propósito. */
  approximate: true;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** true si el número no tiene más decimales de los permitidos. */
export function hasAllowedPrecision(value: number, decimals = LOCATION_DECIMALS): boolean {
  return Number.isFinite(value) && Number(value.toFixed(decimals)) === value;
}

// Se construye un objeto nuevo con solo los campos permitidos: lo que no está en la lista
// (accuracy, altitude, heading, timestamp...) no llega al almacenamiento.
export function minimizeLocation(coords: RawCoordinates): MinimizedLocation {
  return {
    latitude: roundTo(coords.latitude, LOCATION_DECIMALS),
    longitude: roundTo(coords.longitude, LOCATION_DECIMALS),
    synthetic: Boolean(coords.synthetic),
    approximate: true,
  };
}
