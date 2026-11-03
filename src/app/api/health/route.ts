import { APP_VERSION, GIT_SHA } from "../../../lib/version";

// Health check del release: lo usan HEALTHCHECK de Docker, el smoke test y el runbook.
// `no-store`: siempre debe reflejar el servidor que responde (el Service Worker excluye /api/).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", version: APP_VERSION, commit: GIT_SHA },
    { headers: { "Cache-Control": "no-store" } }
  );
}
