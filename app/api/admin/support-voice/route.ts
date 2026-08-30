import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { publishSupportVoice } from "@/lib/support-voice";
import { readSupportVoiceUncached, updateSupportVoice } from "@/lib/support-voice-store";
import type { SupportVoicePatch } from "@/lib/support-voice-schema";

/**
 * The browser support agent's settings, as seen and edited from Settings.
 *
 * Unlike the voice-agent credentials next to it, nothing here is a secret: the
 * agent id is an identifier, not a key, and the API key this channel dispatches
 * with is the workspace one already managed by `/api/admin/voice-settings`. So
 * GET returns the document as stored rather than a redacted view.
 *
 * The read is uncached deliberately. This is admin-only traffic, and a cache
 * here could show an administrator the value they just replaced — the same
 * reasoning as `readVoiceSettingsUncached`. The public site reads the cached
 * copy through `lib/support-voice.ts`, which this route invalidates on write.
 */

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, settings: await readSupportVoiceUncached() });
  } catch (error) {
    console.error("[support-voice] read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the support agent settings." },
      { status: 503 },
    );
  }
}

/**
 * Reads only the keys actually present in the body.
 *
 * A missing key and a key holding the wrong type are treated the same way —
 * left out of the patch, so the stored value survives. That matches the
 * tolerance `/api/admin/voice-settings` gives its own fields, and it is what
 * keeps a partial submission from blanking everything it did not mention.
 * What it does *not* do is coerce: a string where a boolean belongs is
 * dropped, not read as truthy.
 */
function readPatch(body: Record<string, unknown>): SupportVoicePatch {
  const patch: SupportVoicePatch = {};

  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.agentId === "string") patch.agentId = body.agentId;
  if (typeof body.buttonLabel === "string") patch.buttonLabel = body.buttonLabel;
  if (typeof body.greeting === "string") patch.greeting = body.greeting;
  if (typeof body.mobileEnabled === "boolean") patch.mobileEnabled = body.mobileEnabled;
  if (typeof body.logToInbox === "boolean") patch.logToInbox = body.logToInbox;
  if (typeof body.maxSessionMinutes === "number") {
    patch.maxSessionMinutes = body.maxSessionMinutes;
  }

  // The three closed sets are passed through as-is rather than checked here.
  // The schema owns which values are legal, and repeating the list in this
  // file is how the two drift apart.
  if (typeof body.placement === "string") {
    patch.placement = body.placement as SupportVoicePatch["placement"];
  }
  if (typeof body.visibilityMode === "string") {
    patch.visibilityMode = body.visibilityMode as SupportVoicePatch["visibilityMode"];
  }
  if (typeof body.theme === "string") {
    patch.theme = body.theme as SupportVoicePatch["theme"];
  }

  if (Array.isArray(body.visibilityPaths)) {
    patch.visibilityPaths = body.visibilityPaths.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }

  return patch;
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Malformed request." }, { status: 400 });
  }

  try {
    const result = await updateSupportVoice(readPatch(body));
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    // Only after a successful write. Publishing first would drop the cache and
    // let the public site re-read the *old* document, which is the same stale
    // answer with an extra database round trip attached.
    publishSupportVoice();

    return NextResponse.json({ ok: true, settings: result.settings });
  } catch (error) {
    console.error("[support-voice] write failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the support agent settings." },
      { status: 503 },
    );
  }
}
