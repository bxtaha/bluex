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

/**
 * How the conversation was held, as distinct from which way it went.
 *
 * Deliberately *not* a third `CallDirection`. Direction is a telephony
 * concept — it answers "who dialled whom" — and "outbound" is meaningless for
 * somebody who clicked a button on the website. Modelling the browser channel
 * as a direction would also have meant touching every branch that already
 * switches on one, including the usage aggregation, to teach them a value that
 * answers a different question.
 *
 * A web conversation is `direction: "inbound"`, which is true in the sense
 * that matters: the visitor came to us.
 */
export type CallChannel = "phone" | "web";

/**
 * The structured fields the agent was asked to collect during the call.
 *
 * Empty strings rather than optionals, so every consumer reads the same shape
 * whether the agent collected nothing or everything.
 */
export type CollectedFields = {
  name: string;
  email: string;
  phone: string;
  company: string;
  serviceInterest: string;
};

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

  /**
   * Did this conversation reach the other end at all?
   *
   * A different question from `callSuccessful`, which grades a conversation
   * that happened. This one asks whether one happened. The provider creates a
   * conversation record the moment a dispatch is accepted and only then hands
   * off to the carrier, so a refusal downstream leaves a real record for a call
   * that never rang — indistinguishable from a completed call by every other
   * field here, `analysis` included.
   */
  connected: boolean;
  /** The provider's reason it never connected. Empty when it did. */
  failureReason: string;

  /**
   * Whether the payload carries a `phone_call` block.
   *
   * The one honest signal that separates a browser conversation from a phone
   * one: nothing was dialled, so there is no telephony metadata. Reported here
   * rather than inferred downstream from an empty number, because "" is also
   * what a withheld caller ID looks like and those are different situations.
   */
  hasPhoneCall: boolean;

  collected: CollectedFields;
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

/**
 * Digits only. The join key between a call and the person on the other end.
 *
 * A `+` prefix means the string is already international, so its digits are
 * kept as-is. Otherwise a single leading `0` is a national trunk prefix
 * (`07123 456789`), not part of the subscriber number, so it is stripped —
 * but that is the most this function can safely do. Turning `7123456789`
 * into the same key as `447123456789` needs a country code, and this site
 * never collects one: guessing would silently merge two different people's
 * numbers, which is worse than leaving the two forms unresolved. The honest
 * fix lives upstream, in `validateLead` (lib/lead.ts), which now requires a
 * leading `+` on every number a person types into this site — a call this
 * function still receives without one is the provider's own report, already
 * in E.164, or a legacy record from before that requirement existed.
 */
export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+")) return digits;
  return digits.replace(/^0+/, "");
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
    // Only an explicit "failed" counts, and it is read from `status` rather
    // than from the presence of `metadata.error` — that key is sent on every
    // conversation and is simply null on the ones that worked, so testing for
    // it would mark every real call as failed. Unrecognised and missing states
    // both mean "connected" so that a renamed status loses the failure
    // reporting rather than silently discarding genuine contact.
    connected: text(data, "status") !== "failed",
    failureReason: text(pick(metadata, "error"), "reason"),
    hasPhoneCall: phone !== null && typeof phone === "object",
    collected: parseCollected(analysis),
  };
}

/**
 * The fields the agent collected, out of `analysis.data_collection_results`.
 *
 * The provider's shape is `{ [key]: { value, json_schema, rationale } }` where
 * every key is whatever whoever configured the agent typed into the dashboard.
 * That means there is no canonical spelling to match on, so a handful of
 * obvious ones map to each field — collecting nothing because the agent's
 * author wrote `full_name` instead of `name` is a silent failure, and this is
 * the cheapest possible guard against it.
 *
 * Unrecognised keys are ignored rather than stored. This is a lead's contact
 * details, not a general-purpose bag, and every consumer downstream expects
 * exactly these five.
 */
export function parseCollected(analysis: unknown): CollectedFields {
  const results = pick(analysis, "data_collection_results");

  const read = (...keys: string[]): string => {
    for (const key of keys) {
      const entry = pick(results, key);
      if (entry === null) continue;

      const value = pick(entry, "value");
      // A number is an ordinary thing to receive: the provider types the field
      // from the JSON schema the agent was given. Null means the agent was
      // asked and did not get an answer, which is absence, not the word.
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  };

  return {
    name: read("name", "full_name", "customer_name", "caller_name"),
    email: read("email", "email_address"),
    phone: read("phone", "phone_number", "telephone"),
    company: read("company", "business", "company_name", "business_name"),
    serviceInterest: read("service_interest", "service", "interest", "enquiry_type"),
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
