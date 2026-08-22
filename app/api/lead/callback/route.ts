import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/elevenlabs";
import { recordCallOutcome, type TranscriptTurn } from "@/lib/lead-store";
import type { Lead } from "@/lib/lead-store";

/**
 * Where the call comes back.
 *
 * ElevenLabs posts here when a conversation ends, carrying the transcript, a
 * summary and its own verdict on whether the call did what it was for. That is
 * written onto the lead the call belongs to, matched by conversation id.
 *
 * This is the URL to paste into the provider's post-call webhook setting:
 *
 *     https://<your-host>/api/lead/callback
 *
 * It is public, unauthenticated, and it writes words into a record of what a
 * customer said — so the signature check below is the first thing that runs and
 * a request that fails it is refused, not logged and accepted.
 */

export async function POST(request: Request) {
  // Read as text, not JSON. The signature is computed over the exact bytes
  // sent; re-serialising a parsed object produces different bytes often enough
  // to matter, and the resulting failure looks like a wrong secret.
  const raw = await request.text();

  const verified = verifyWebhook(
    raw,
    request.headers.get("elevenlabs-signature"),
  );
  if (!verified.ok) {
    console.error("[lead-callback] rejected:", verified.reason);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const data = pick(payload, "data");
  const conversationId = text(data, "conversation_id");
  if (!conversationId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const analysis = pick(data, "analysis");
  const metadata = pick(data, "metadata");

  let matched: boolean;
  try {
    matched = await recordCallOutcome(conversationId, {
      transcript: parseTranscript(pick(data, "transcript")),
      summary: text(analysis, "transcript_summary"),
      durationSeconds: number(metadata, "call_duration_secs"),
      callSuccessful: parseVerdict(text(analysis, "call_successful")),
    });
  } catch (error) {
    // A 5xx is the honest answer: the provider retries on one, and losing a
    // transcript to a transient database blip is exactly what retries are for.
    console.error("[lead-callback] could not record outcome:", error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (!matched) {
    // Not an error. Calls placed from the provider's own dashboard while
    // testing the agent have no lead here, and answering 4xx would make it
    // retry a call that will never match.
    console.warn("[lead-callback] no lead for conversation:", conversationId);
  }

  return NextResponse.json({ ok: true, matched });
}

/* ── Payload parsing ─────────────────────────────────────────────────────────
   Written defensively rather than with a schema: this is a third-party payload
   whose shape we do not control, and a missing summary field should cost the
   summary, not the whole transcript. */

function pick(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return null;
  return (value as Record<string, unknown>)[key] ?? null;
}

function text(value: unknown, key: string): string {
  const found = pick(value, key);
  return typeof found === "string" ? found : "";
}

function number(value: unknown, key: string): number {
  const found = pick(value, key);
  return typeof found === "number" && Number.isFinite(found) ? found : 0;
}

function parseTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): TranscriptTurn => {
      const message = text(entry, "message");
      return {
        role: text(entry, "role") === "user" ? "user" : "agent",
        message,
        at: number(entry, "time_in_call_secs"),
      };
    })
    // Agent turns arrive with a null message when the agent was interrupted
    // mid-sentence; they are noise in a transcript nobody can act on.
    .filter((turn) => turn.message.trim().length > 0);
}

function parseVerdict(value: string): Lead["callSuccessful"] {
  return value === "success" || value === "failure" ? value : "unknown";
}
