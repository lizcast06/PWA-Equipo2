// Mínimo privilegio (semana 9, riesgo R2, diapositiva 9).
// Regla que aplica el "servidor" (simulatedRemoteSync) antes de aceptar o entregar una inspección.
// El cliente puede ocultar botones, pero quien decide es esta función.
//
// | Rol        | Registrar propia | Ver ajenas          | Aprobar             |
// |------------|------------------|---------------------|---------------------|
// | inspector  | sí               | no                  | no                  |
// | supervisor | sí               | sí, solo su `scope` | sí, solo su `scope` |
// | visitante  | no               | no                  | no                  |
// | sin sesión | 401              | 401                 | 401                 |

import type { StoredInspection } from "../storage/schema";
import type { SyntheticUser } from "./session";

export type AccessAction = "create" | "read" | "approve";

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; status: 401 | 403; error: string };

export const ACCESS_ERRORS = {
  noSession: "Inicia sesión en Ajustes para enviar o consultar inspecciones.",
  visitor: "El rol visitante no puede registrar ni consultar inspecciones.",
  notOwner: "Solo puedes enviar o consultar tus propias inspecciones.",
  outOfScope: "Este laboratorio no está en el alcance asignado a tu supervisión.",
  cannotApprove: "Solo un supervisor puede aprobar inspecciones de su alcance.",
} as const;

type AccessRecord = Pick<StoredInspection, "ownerId" | "location">;

const deny = (status: 401 | 403, error: string): AccessDecision => ({ allowed: false, status, error });

export function authorize(user: SyntheticUser | undefined, action: AccessAction, record: AccessRecord): AccessDecision {
  if (!user) return deny(401, ACCESS_ERRORS.noSession);
  if (user.role === "visitante") return deny(403, ACCESS_ERRORS.visitor);

  // Sin ownerId no hay dueño comprobable: nadie es "dueño" de un registro anónimo.
  const isOwner = Boolean(record.ownerId) && record.ownerId === user.id;
  const inScope = user.role === "supervisor" && (user.scope ?? []).includes(record.location);

  switch (action) {
    case "create":
      // Nadie registra a nombre de otra persona, ni un supervisor.
      return isOwner ? { allowed: true } : deny(403, ACCESS_ERRORS.notOwner);
    case "read":
      if (isOwner || inScope) return { allowed: true };
      return deny(403, user.role === "supervisor" ? ACCESS_ERRORS.outOfScope : ACCESS_ERRORS.notOwner);
    case "approve":
      if (user.role !== "supervisor") return deny(403, ACCESS_ERRORS.cannotApprove);
      return inScope ? { allowed: true } : deny(403, ACCESS_ERRORS.outOfScope);
  }
}
