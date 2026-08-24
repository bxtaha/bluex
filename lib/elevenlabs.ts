import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveVoiceCredentials } from "./voice-settings.ts";

/**
 * The voice agent, over HTTP.
 *
 * ElevenLabs' Agents Platform holds the prompt, the model, the voice and the
 * telephony, so placing a call is one request rather than a self-hosted
 * orchestrator. This file is the whole integration: dispatch out, signature
 * verification for the webhook back.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Nothing here is required for the site to run. With the credentials unset the
 * form still validates, the lead is still stored, and `isConfigured()` reports
 * false so the UI and the dashboard can say so plainly instead of implying a
 * call went out. That honesty is the point — a lead silently not called looks
 * identical to a lead called successfully, and only one of them costs money.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The credentials themselves — API key, agent id, phone number id, transport,
 * webhook secret — are no longer read from `process.env` in this file at all.
 * `lib/voice-settings.ts` owns them: an admin can set each one from the
 * Settings panel, and `resolveVoiceCredentials()` there falls back to the
 * matching environment variable for whichever ones are not. Every function
 * below calls it fresh rather than caching the result, which is also why
 * they're all async now even where the HTTP call itself is not — a credential
 * saved from the dashboard has to take effect on the next request, not the
 * next deploy.
 *
 * The endpoint shapes below track the provider's published API, and that API
 * has been renamed once already (this product was "Conversational AI"). If
 * dispatch starts returning 404, check the current docs before assuming the
 * credentials are wrong.
 */

const API_BASE = "https://api.elevenlabs.io/v1/convai";

/**
 * Which telephony the agent's number is attached to.
 *
 * A number imported from Twilio and a number provisioned through ElevenLabs'
 * own SIP trunk are dialled through different endpoints, and getting it wrong
 * returns a 404 that reads like a missing agent. A property of the account
 * rather than of the site, same as the rest of the credentials — see
 * `lib/voice-settings.ts`.
 */
function outboundPath(transport: "twilio" | "sip"): string {
  return transport === "sip"
    ? `${API_BASE}/sip-trunk/outbound-call`
    : `${API_BASE}/twilio/outbound-call`;
}

/** Long enough for the provider to accept the job, short enough not to hang a form submit. */
const DISPATCH_TIMEOUT_MS = 10_000;

export type CallRequest = {
  toNumber: string;
  /** Merged into the agent's prompt as `{{name}}`, `{{business}}` and so on. */
  variables: Record<string, string>;
};

export type CallResult =
  | { ok: true; conversationId: string; callSid: string }
  | { ok: false; reason: string };

export async function isConfigured(): Promise<boolean> {
  const credentials = await resolveVoiceCredentials();
  return Boolean(
    credentials.apiKey && credentials.outboundAgentId && credentials.outboundPhoneNumberId,
  );
}

/**
 * Places the call.
 *
 * Never throws. Every failure — unreachable, refused, timed out, malformed —
 * comes back as `{ ok: false, reason }`, because the caller's job is to write
 * that reason onto the lead and carry on, not to decide which class of network
 * error deserves a stack trace.
 */
export async function placeCall(request: CallRequest): Promise<CallResult> {
  const {
    apiKey,
    outboundAgentId: agentId,
    outboundPhoneNumberId: phoneNumberId,
    outboundCallTransport: callTransport,
  } = await resolveVoiceCredentials();

  if (!apiKey || !agentId || !phoneNumberId) {
    return { ok: false, reason: "ElevenLabs credentials are not set." };
  }

  let response: Response;
  try {
    response = await fetch(outboundPath(callTransport), {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number: request.toNumber,
        // What turns a generic script into a call that opens with the caller's
        // own name and business. The agent's prompt reads these as `{{name}}`.
        conversation_initiation_client_data: {
          dynamic_variables: request.variables,
        },
      }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "TimeoutError"
        ? "The voice provider did not respond in time."
        : "Could not reach the voice provider.";
    console.error("[elevenlabs] dispatch threw:", error);
    return { ok: false, reason };
  }

  const body = await readJson(response);

  if (!response.ok) {
    // The provider's own message is far more useful than "502" — it is the
    // difference between a wrong agent id and an empty balance, and it is what
    // gets shown in the dashboard.
    const detail = extractError(body) || `HTTP ${response.status}`;
    console.error("[elevenlabs] dispatch refused:", response.status, detail);
    return { ok: false, reason: detail };
  }

  const conversationId = stringField(body, "conversation_id");
  if (!conversationId) {
    // A 200 with no conversation id means the call is un-trackable: the
    // post-call webhook would arrive with nothing to match it against.
    return { ok: false, reason: "The provider returned no conversation id." };
  }

  return {
    ok: true,
    conversationId,
    callSid: stringField(body, "callSid") || stringField(body, "call_sid"),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function stringField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

/** Pulls a human-readable message out of the several shapes the API returns. */
function extractError(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const record = body as Record<string, unknown>;

  if (typeof record.message === "string") return record.message;

  const detail = record.detail;
  if (typeof detail === "string") return detail;
  if (typeof detail === "object" && detail !== null) {
    const message = (detail as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return "";
}

/* ── Reading conversations back ──────────────────────────────────────────── */

/**
 * Recent conversation ids, newest first.
 *
 * Ids only. The list endpoint does not carry transcripts, and pretending it
 * might would mean two shapes to parse for one kind of object — so the sync
 * fetches each one properly rather than storing half a record.
 */
export async function listConversations(
  pageSize = 50,
): Promise<{ ok: true; ids: string[] } | { ok: false; reason: string }> {
  const { apiKey } = await resolveVoiceCredentials();
  if (!apiKey) return { ok: false, reason: "ElevenLabs credentials are not set." };

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE}/conversations?page_size=${Math.min(pageSize, 100)}`,
      {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      },
    );
  } catch (error) {
    console.error("[elevenlabs] list threw:", error);
    return { ok: false, reason: "Could not reach the voice provider." };
  }

  const body = await readJson(response);
  if (!response.ok) {
    return { ok: false, reason: extractError(body) || `HTTP ${response.status}` };
  }

  const rows = pickArray(body, "conversations");
  const ids = rows
    .map((row) => stringField(row, "conversation_id"))
    .filter((id) => id.length > 0);

  return { ok: true, ids };
}

export async function getConversation(
  id: string,
): Promise<{ ok: true; payload: unknown } | { ok: false; reason: string }> {
  const { apiKey } = await resolveVoiceCredentials();
  if (!apiKey) return { ok: false, reason: "ElevenLabs credentials are not set." };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(id)}`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[elevenlabs] fetch threw:", error);
    return { ok: false, reason: "Could not reach the voice provider." };
  }

  const body = await readJson(response);
  if (!response.ok) {
    return { ok: false, reason: extractError(body) || `HTTP ${response.status}` };
  }
  return { ok: true, payload: body };
}

function pickArray(body: unknown, key: string): unknown[] {
  if (typeof body !== "object" || body === null) return [];
  const value = (body as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

/* ── Webhook verification ────────────────────────────────────────────────── */

/**
 * Whether a post-call webhook really came from ElevenLabs.
 *
 * The endpoint is public and it writes transcripts onto leads, so without this
 * anyone who learns the URL can put words in a caller's mouth. The signature
 * header carries a timestamp and an HMAC of `timestamp.body`, both of which
 * matter: the HMAC proves the sender holds the secret, and the timestamp is
 * what stops a genuine, correctly-signed payload from being replayed forever.
 *
 * Takes the raw body text, not a parsed object. `JSON.stringify(JSON.parse(x))`
 * is not reliably `x` — key order and number formatting both survive the round
 * trip only by luck — and a signature computed over re-serialised JSON fails
 * for reasons that look nothing like the actual cause.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 30 * 60,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { webhookSecret: secret } = await resolveVoiceCredentials();
  if (!secret) return { ok: false, reason: "No webhook secret configured." };
  if (!signatureHeader) return { ok: false, reason: "Missing signature." };

  // `t=1700000000,v0=abc…`
  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const index = part.indexOf("=");
      return index === -1
        ? ([part.trim(), ""] as const)
        : ([part.slice(0, index).trim(), part.slice(index + 1).trim()] as const);
    }),
  );

  const timestamp = parts.get("t");
  const provided = parts.get("v0");
  if (!timestamp || !provided) {
    return { ok: false, reason: "Malformed signature." };
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: "Signature timestamp is outside tolerance." };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  // Length-checked first: `timingSafeEqual` throws on a length mismatch rather
  // than returning false, and a thrown comparison is still a failed one.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Signature does not match." };
  }

  return { ok: true };
}
