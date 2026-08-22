import { POST as handler } from "@/app/api/calls/webhook/route";

/**
 * The old post-call webhook path. Deprecated — use `/api/calls/webhook`.
 *
 * Kept alive deliberately, and this is not politeness. The provider's webhook
 * URL lives in their dashboard, not in this repo, so deploying the rename
 * without updating it there would silently drop every call until somebody
 * noticed — the precise opposite of the goal this endpoint exists to serve.
 *
 * Delete this file once the dashboard is confirmed pointing at the new path
 * and the warning below has stopped appearing in the logs.
 */
export async function POST(request: Request) {
  console.warn(
    "[lead/callback] deprecated path used — repoint the ElevenLabs post-call " +
      "webhook at /api/calls/webhook, then delete app/api/lead/callback/",
  );
  return handler(request);
}
