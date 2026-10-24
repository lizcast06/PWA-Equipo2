// Ruta del detalle de una inspección.
// Las sembradas usan /inspecciones/<id> (SSR/CSR de la semana 4); las creadas en el dispositivo
// usan la vista estática /inspecciones/ver?id=<id>, que el Service Worker precachea y abre sin red.
export function inspectionDetailHref(id: string): string {
  return id.startsWith("local-") ? `/inspecciones/ver?id=${encodeURIComponent(id)}` : `/inspecciones/${id}`;
}
