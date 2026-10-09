# Integración de Capacidades del Dispositivo, Privacidad y Fallback

## 1. Principio de Mínimo Privilegio y Activación por Usuario
El acceso a hardware periférico (cámara) y telemetría de ubicación (geolocalización) nunca se ejecuta de forma anticipada ni automática durante el montaje de vistas. La solicitud de permisos responde estrictamente a un gesto deliberado del usuario (Click-to-Action).

## 2. Estrategia de Degradación Elegante (Fallback Funcional)
- **Captura Fotográfica (`src/lib/device/camera.ts`):** Ante la ausencia de `navigator.mediaDevices.getUserMedia` o en navegadores webview que bloquean el stream nativo, el sistema activa un elemento `<input type="file" accept="image/*" capture="environment">`, permitiendo adjuntar evidencia fotográfica desde el carrete o capturador nativo del SO sin interrumpir el flujo.
- **Geolocalización (`src/lib/device/geolocation.ts`):** Si el inspector rechaza el permiso de ubicación o expira el tiempo de espera (timeout), la app provee coordenadas sintéticas predefinidas correspondientes al campus de la Universidad Tecnológica de Tehuacán (`18.4633, -97.3916`) con la bandera booleana `synthetic: true`.
- **Notificaciones Push (`src/lib/notifications/client.ts`):** Si el navegador no soporta Web Notifications o el permiso se encuentra en estado `denied`, el sistema deriva la alerta hacia un banner interactivo in-app, garantizando que el usuario visualice el cambio de estado de su inspección.

## 3. Privacidad y Ausencia de PII / Secretos
Las pruebas y artefactos utilizan exclusivamente datos sintéticos. No se recopilan metadatos EXIF no autorizados ni identificadores biométricos. La solución prescinde de claves privadas y tokens remotos en el código fuente.