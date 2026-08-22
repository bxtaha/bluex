/**
 * Turns a provider conversation object into something this codebase can store.
 *
 * Pure on purpose — no network, no database. The webhook and the reconciliation
 * sync both hand payloads to this function, and keeping it free of both means
 * its behaviour can be pinned down with a literal object rather than a live
 * call that nobody in this timezone can place.
 *
 * Written defensively throughout. This is a third-party shape we do not
 * control: a missing summary should cost the summary, not the transcript.
 */

export type CallDirection = "inbound" | "outbound";

export type TranscriptTurn = {
  role: "agent" | "user";
  message: string;
  /** Seconds from the start of the call. */
  at: number;
};

export type ParsedCall = {
  conversationId: string;
  /** Null when the payload did not say. The caller decides — see call-intake. */
  direction: CallDirection | null;
  counterpartyNumber: string;
  agentId: string;
  callSuccessful: "success" | "failure" | "unknown";
  startedAt: Date;
  durationSeconds: number;
  transcript: TranscriptTurn[];
  summary: string;
};

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

/** Digits only. The join key between a call and the person on the other end. */
export function phoneKey(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Accepts either shape the provider sends.
 *
 * The webhook wraps the conversation in `data`; fetching one by id returns it
 * unwrapped. Unwrapping here rather than at each call site means the two
 * delivery paths cannot drift into parsing the same conversation differently.
 */
export function parseConversation(payload: unknown): ParsedCall | null {
  const data = pick(payload, "data") ?? payload;

  const conversationId = text(data, "conversation_id");
  if (!conversationId) return null;

  const metadata = pick(data, "metadata");
  const analysis = pick(data, "analysis");
  const phone = pick(metadata, "phone_call");

  const startedUnix = number(metadata, "start_time_unix_secs");

  return {
    conversationId,
    direction: parseDirection(text(phone, "direction")),
    counterpartyNumber: text(phone, "external_number"),
    agentId: text(data, "agent_id"),
    callSuccessful: parseVerdict(text(analysis, "call_successful")),
    // Falls back to now rather than to the epoch: a call filed under 1970 sorts
    // to the bottom of the archive forever and is effectively lost.
    startedAt: startedUnix > 0 ? new Date(startedUnix * 1000) : new Date(),
    durationSeconds: number(metadata, "call_duration_secs"),
    transcript: parseTranscript(pick(data, "transcript")),
    summary: text(analysis, "transcript_summary"),
  };
}

function parseDirection(value: string): CallDirection | null {
  if (value === "inbound" || value === "outbound") return value;
  // Deliberately not a guess. `call-intake` resolves this from whether a lead
  // already claims the conversation, which cannot be wrong.
  return null;
}

function parseVerdict(value: string): ParsedCall["callSuccessful"] {
  return value === "success" || value === "failure" ? value : "unknown";
}

function parseTranscript(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): TranscriptTurn => ({
      role: text(entry, "role") === "user" ? "user" : "agent",
      message: text(entry, "message"),
      at: number(entry, "time_in_call_secs"),
    }))
    // An interrupted agent turn arrives with a null message. It is noise in a
    // transcript nobody can act on.
    .filter((turn) => turn.message.trim().length > 0);
}
