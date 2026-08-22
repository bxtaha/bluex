import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isConfigured, placeCall } from "@/lib/elevenlabs";
import {
  getLead,
  recordDispatch,
  recordDispatchFailure,
} from "@/lib/lead-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

/**
 * Call this lead, or call them again.
 *
 * The manual counterpart to the automatic dispatch in `/api/lead` — for the
 * ones that failed while the provider was down, and for the ones that were
 * stored before any credentials existed. Deliberately not idempotent: pressing
 * it twice rings the person twice, because that is what the button says it
 * does, and `attempts` on the lead records how many times it has been pressed.
 */
export async function POST(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let lead;
  try {
    lead = await getLead(id);
  } catch (error) {
    console.error("[leads] could not read lead:", error);
    return NextResponse.json(
      { ok: false, message: "Could not reach the database." },
      { status: 503 },
    );
  }

  if (!lead) {
    return NextResponse.json(
      { ok: false, message: "No such lead." },
      { status: 404 },
    );
  }

  if (!isConfigured()) {
    // 409, not 500: the request was fine and the server is fine — the account
    // simply has no voice agent attached yet, and the fix is an env var.
    return NextResponse.json(
      {
        ok: false,
        message:
          "The voice agent is not configured. Set the ElevenLabs keys to place calls.",
      },
      { status: 409 },
    );
  }

  const call = await placeCall({
    toNumber: lead.phone,
    variables: {
      name: lead.name,
      business: lead.business || "your business",
      email: lead.email,
      source: lead.source,
    },
  });

  if (!call.ok) {
    await recordDispatchFailure(lead.id, call.reason);
    // The provider's own reason, passed through rather than flattened into
    // "something went wrong" — this screen is for the person who can fix it.
    return NextResponse.json(
      { ok: false, message: call.reason },
      { status: 502 },
    );
  }

  await recordDispatch(lead.id, {
    conversationId: call.conversationId,
    callSid: call.callSid,
  });

  return NextResponse.json({ ok: true, lead: await getLead(lead.id) });
}
