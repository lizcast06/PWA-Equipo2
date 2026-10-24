import { Suspense } from "react";
import { LoadingState } from "../../../components/loading-state";
import InspeccionDetalleCSRPage from "../[id]/page";

// Vista de detalle para inspecciones creadas en el dispositivo: /inspecciones/ver?id=<id>.
// Es una página estática (el id va en la consulta), así el Service Worker la precachea una
// sola vez y el detalle abre sin conexión para cualquier inspección local.
export default function VerInspeccionPage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando inspección..." description="Buscando el registro seleccionado" />}>
      <InspeccionDetalleCSRPage />
    </Suspense>
  );
}
