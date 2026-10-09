export interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  source: "MEDIA_DEVICES" | "INPUT_FALLBACK" | "UNAVAILABLE";
  error?: string;
}

export async function requestCameraStream(): Promise<MediaStream | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 } },
      audio: false,
    });
  } catch {
    return null;
  }
}

export function createFileInputFallback(onSelected: (dataUrl: string) => void): HTMLInputElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onSelected(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  return input;
}