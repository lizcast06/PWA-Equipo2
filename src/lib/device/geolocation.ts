export interface SyntheticCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  synthetic: boolean;
}

export interface GeolocationResolution {
  success: boolean;
  coords?: SyntheticCoordinates;
  status: "ACQUIRED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT";
  error?: string;
}

// Coordenadas sintéticas de respaldo para la Universidad Tecnológica de Tehuacán
const SYNTHETIC_CAMPUS_FALLBACK: SyntheticCoordinates = {
  latitude: 18.4633,
  longitude: -97.3916,
  accuracy: 15,
  synthetic: true,
};

export async function obtainLocation(options?: PositionOptions): Promise<GeolocationResolution> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      success: true,
      coords: SYNTHETIC_CAMPUS_FALLBACK,
      status: "UNAVAILABLE",
      error: "Geolocation API no soportada. Usando fallback sintético.",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            synthetic: false,
          },
          status: "ACQUIRED",
        });
      },
      (geoError) => {
        let status: GeolocationResolution["status"] = "UNAVAILABLE";
        if (geoError.code === geoError.PERMISSION_DENIED) status = "DENIED";
        if (geoError.code === geoError.TIMEOUT) status = "TIMEOUT";

        resolve({
          success: true, // Mantiene el flujo útil mediante degradación elegante
          coords: SYNTHETIC_CAMPUS_FALLBACK,
          status,
          error: geoError.message,
        });
      },
      { timeout: 8000, maximumAge: 60000, ...options }
    );
  });
}