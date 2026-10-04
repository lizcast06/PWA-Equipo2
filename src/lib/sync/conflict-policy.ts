import { StoredInspection } from "../storage/schema";

export interface ConflictResolutionResult {
  resolvedRecord: StoredInspection;
  source: "LOCAL" | "REMOTE";
  hasConflict: boolean;
}

export function resolveConflict(
  local: StoredInspection,
  remote: StoredInspection
): ConflictResolutionResult {
  if (local.version > remote.version) {
    return { resolvedRecord: local, source: "LOCAL", hasConflict: true };
  }

  if (remote.version > local.version) {
    return { resolvedRecord: remote, source: "REMOTE", hasConflict: true };
  }

  // Si las versiones son iguales, desempatar por timestamp Last-Write-Wins
  if (local.updatedAt >= remote.updatedAt) {
    return { resolvedRecord: local, source: "LOCAL", hasConflict: false };
  }

  return { resolvedRecord: remote, source: "REMOTE", hasConflict: false };
}