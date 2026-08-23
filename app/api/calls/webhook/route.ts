import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/elevenlabs";
import { recordConversation } from "@/lib/call-intake";

/**
 * Where every call comes back — inbound and outbound alike.
 *
 * Set this as the post-call webhook in the ElevenLabs dashboard:
 *
 *     https://bluex.agency/api/calls/webhook
 *
 * Public, unauthenticated, and it writes down what a customer said, so the
 * signature check runs first and a request that fails it is refused rather
 * than logged and accepted.
 */

export async function POST(request: Request) {
  // Read as text, not JSON. The signature covers the exact bytes sent, and
  // re-serialising a parsed object produces different ones often enough to
  // matter — a failure that looks nothing like its cause.
  const raw = await request.text();

  const verified = verifyWebhook(
    raw,
    request.headers.get("elevenlabs-signature"),
  );
  if (!verified.ok) {
    console.error("[calls/webhook] rejected:", verified.reason);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await recordConversation(payload, "webhook");

    if (result.reason === "unparseable") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // A duplicate is a success. The provider retries on anything else, and
    // retrying a call we already hold would loop forever.
    return NextResponse.json({ ok: true, stored: result.stored });
  } catch (error) {
    // 5xx on purpose: the provider retries on one, and losing a transcript to
    // a transient database blip is exactly what retries are for.
    console.error("[calls/webhook] could not record:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
