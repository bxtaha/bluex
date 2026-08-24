import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  readVoiceSettingsForAdmin,
  updateVoiceSettings,
  type VoiceSettingsPatch,
} from "@/lib/voice-settings";

/**
 * The voice agent's credentials, as seen and edited from Settings.
 *
 * GET never returns `apiKey` or `webhookSecret` themselves — see
 * `readVoiceSettingsForAdmin` for what it sends instead and why. PATCH is the
 * only way either secret leaves the browser, and only when the admin actually
 * types a new one.
 */

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, settings: await readVoiceSettingsForAdmin() });
  } catch (error) {
    console.error("[voice-settings] read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the voice agent settings." },
      { status: 503 },
    );
  }
}

function readSecretField(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const patch: VoiceSettingsPatch = {};
  if (typeof body.outboundAgentId === "string") patch.outboundAgentId = body.outboundAgentId;
  if (typeof body.outboundPhoneNumberId === "string") {
    patch.outboundPhoneNumberId = body.outboundPhoneNumberId;
  }
  if (
    body.outboundCallTransport === "twilio" ||
    body.outboundCallTransport === "sip" ||
    body.outboundCallTransport === ""
  ) {
    patch.outboundCallTransport = body.outboundCallTransport;
  }
  if (typeof body.inboundAgentId === "string") patch.inboundAgentId = body.inboundAgentId;
  if (typeof body.inboundPhoneNumberId === "string") {
    patch.inboundPhoneNumberId = body.inboundPhoneNumberId;
  }
  // `undefined` here means "field absent from the request", which
  // `readSecretField` also returns for anything that isn't a string or
  // `null` — so a garbled value is silently left alone rather than rejected,
  // the same tolerance `typeof body.outboundAgentId === "string"` above gives
  // the non-secret fields.
  const apiKey = readSecretField(body.apiKey);
  if (apiKey !== undefined) patch.apiKey = apiKey;
  const webhookSecret = readSecretField(body.webhookSecret);
  if (webhookSecret !== undefined) patch.webhookSecret = webhookSecret;

  try {
    const result = await updateVoiceSettings(patch);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, settings: result.settings });
  } catch (error) {
    console.error("[voice-settings] save failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the voice agent settings." },
      { status: 503 },
    );
  }
}
