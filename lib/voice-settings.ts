import type { Collection } from "mongodb";
import { getDb } from "./mongodb.ts";

/**
 * The voice agent's credentials, editable from the admin Settings page instead
 * of only `.env.local`.
 *
 * One document, the same shape as `contact-store.ts` — there is exactly one
 * voice configuration, and a fixed `_id` makes the write an upsert that cannot
 * create a second one.
 *
 * **Outbound and inbound are configured separately, because they are not the
 * same operation.** Outbound is something this app *does* — `placeCall` in
 * `lib/elevenlabs.ts` sends `outboundAgentId` and `outboundPhoneNumberId` to
 * the provider to start a call, so those two plus `outboundCallTransport` are
 * live configuration with a real effect on the next dispatch. Inbound is
 * something this app only *hears about*: a number rings because an agent is
 * attached to it inside the ElevenLabs dashboard, and nothing this repo runs
 * places that attachment. `inboundAgentId` / `inboundPhoneNumberId` exist so
 * that fact has one visible home instead of living only in a comment — see
 * `readVoiceSettingsForAdmin` for why the UI must never claim saving them
 * "configures" inbound the way the outbound fields configure outbound.
 *
 * `apiKey` and `webhookSecret` are **not** split by direction. Both are
 * workspace-level in the provider's own model — one API key dispatches for
 * every agent in the account and lists every conversation regardless of
 * direction, and there is exactly one webhook URL, signed with exactly one
 * secret, receiving both inbound and outbound events. Splitting either would
 * imply a distinction the provider doesn't have.
 *
 * **Every field falls back to the matching environment variable when unset
 * here** — except the two inbound fields, which have no environment variable
 * to fall back to: inbound was never configurable from this repo before this
 * feature, so there is nothing to preserve continuity with. That is not a
 * migration shim to delete later: it is what lets a fresh deployment work
 * from `.env.local` before anyone has opened Settings, and what lets ops
 * rotate a credential by redeploying if the dashboard is ever unreachable. An
 * empty string in this document means "nothing entered in the UI", not
 * "explicitly blank" — `resolveVoiceCredentials` is the only place that
 * distinction is resolved, and every caller in `lib/elevenlabs.ts` goes
 * through it rather than reading `process.env` directly.
 *
 * The API key and webhook secret are stored in plain text, the same trust
 * boundary as the environment variables they can override: whoever can read
 * this database can already place calls and forge webhooks through the app
 * itself, so encrypting the column would protect against a threat the rest of
 * the app doesn't defend against either. What *is* guarded is exposure over
 * HTTP — `readVoiceSettingsForAdmin` never returns either secret, only whether
 * one is set and its last four characters, the same amount Stripe or GitHub
 * shows back for a token you've already saved.
 */

export type CallTransport = "twilio" | "sip";

/** What's actually in the database. Empty means "not set here". */
export type StoredVoiceSettings = {
  apiKey: string;
  webhookSecret: string;
  outboundAgentId: string;
  outboundPhoneNumberId: string;
  outboundCallTransport: CallTransport | "";
  inboundAgentId: string;
  inboundPhoneNumberId: string;
};

/** What a call actually gets placed with, after the environment fallback. Outbound only — see the file doc comment. */
export type VoiceCredentials = {
  apiKey: string;
  webhookSecret: string;
  outboundAgentId: string;
  outboundPhoneNumberId: string;
  outboundCallTransport: CallTransport;
};

export type SettingSource = "database" | "environment" | "unset";

type IdField = { value: string; source: SettingSource };

/** Shaped for the Settings panel: never a secret itself, only enough to recognise it. */
export type VoiceSettingsView = {
  outbound: {
    agentId: IdField;
    phoneNumberId: IdField;
    callTransport: { value: CallTransport; source: SettingSource | "default" };
  };
  /** Reference only — see the file doc comment for why these have no effect on their own. */
  inbound: {
    agentId: IdField;
    phoneNumberId: IdField;
  };
  apiKey: { set: boolean; source: SettingSource; last4: string };
  webhookSecret: { set: boolean; source: SettingSource; last4: string };
  /** Whether outbound dispatch can run right now — the same test `isConfigured()` makes, kept here so one read answers both questions. */
  configured: boolean;
};

/**
 * A PATCH from the Settings form.
 *
 * The five ID/transport fields are not secrets, so the form always shows
 * their real value and a PATCH always carries the field's current state —
 * `""` means "clear the override", the same as leaving the field blank in
 * the UI.
 *
 * `apiKey` and `webhookSecret` are never shown back, so the form cannot send
 * "the current value unless changed" — three states, three shapes:
 * `undefined` (field untouched, leave the stored value alone), a non-empty
 * `string` (set it to this), or `null` (the explicit "remove override"
 * button, distinct from an empty string precisely so a blank secret can never
 * reach here by accident).
 */
export type VoiceSettingsPatch = {
  outboundAgentId?: string;
  outboundPhoneNumberId?: string;
  outboundCallTransport?: CallTransport | "";
  inboundAgentId?: string;
  inboundPhoneNumberId?: string;
  apiKey?: string | null;
  webhookSecret?: string | null;
};

export type VoiceSettingsUpdateResult =
  | { ok: true; settings: VoiceSettingsView }
  | { ok: false; message: string };

const DOC_ID = "voice";

type VoiceSettingsDoc = StoredVoiceSettings & { _id: string };

async function collection(): Promise<Collection<VoiceSettingsDoc>> {
  const db = await getDb();
  return db.collection<VoiceSettingsDoc>("siteSettings");
}

/** Raw read, uncached — admin-only traffic, not worth a cache layer that could hide a just-saved credential. */
export async function readVoiceSettingsUncached(): Promise<StoredVoiceSettings> {
  const doc = await (await collection()).findOne({ _id: DOC_ID });
  return {
    apiKey: doc?.apiKey?.trim() ?? "",
    webhookSecret: doc?.webhookSecret?.trim() ?? "",
    outboundAgentId: doc?.outboundAgentId?.trim() ?? "",
    outboundPhoneNumberId: doc?.outboundPhoneNumberId?.trim() ?? "",
    outboundCallTransport:
      doc?.outboundCallTransport === "sip"
        ? "sip"
        : doc?.outboundCallTransport === "twilio"
          ? "twilio"
          : "",
    inboundAgentId: doc?.inboundAgentId?.trim() ?? "",
    inboundPhoneNumberId: doc?.inboundPhoneNumberId?.trim() ?? "",
  };
}

function envString(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * What `lib/elevenlabs.ts` actually dispatches with. The only place the
 * database value and the environment variable are merged into one answer —
 * every other reader (the Settings view, `isConfigured`) goes through this or
 * through `readVoiceSettingsForAdmin`, never through `process.env` on its own.
 *
 * Outbound fields only. There is nothing for this function to resolve for
 * inbound — see the file doc comment.
 */
export async function resolveVoiceCredentials(): Promise<VoiceCredentials> {
  const stored = await readVoiceSettingsUncached();
  return {
    apiKey: stored.apiKey || envString("ELEVENLABS_API_KEY"),
    webhookSecret: stored.webhookSecret || envString("ELEVENLABS_WEBHOOK_SECRET"),
    outboundAgentId: stored.outboundAgentId || envString("ELEVENLABS_AGENT_ID"),
    outboundPhoneNumberId:
      stored.outboundPhoneNumberId || envString("ELEVENLABS_AGENT_PHONE_NUMBER_ID"),
    outboundCallTransport:
      stored.outboundCallTransport ||
      (process.env.ELEVENLABS_CALL_TRANSPORT === "sip" ? "sip" : "twilio"),
  };
}

function last4(secret: string): string {
  return secret.length > 4 ? secret.slice(-4) : "";
}

function sourceOf(stored: string, env: string): SettingSource {
  if (stored) return "database";
  if (env) return "environment";
  return "unset";
}

/** No environment fallback exists for these — see the file doc comment. */
function idField(stored: string): IdField {
  return { value: stored, source: stored ? "database" : "unset" };
}

function buildView(stored: StoredVoiceSettings): VoiceSettingsView {
  const envApiKey = envString("ELEVENLABS_API_KEY");
  const envWebhookSecret = envString("ELEVENLABS_WEBHOOK_SECRET");
  const envAgentId = envString("ELEVENLABS_AGENT_ID");
  const envPhoneNumberId = envString("ELEVENLABS_AGENT_PHONE_NUMBER_ID");
  const envTransport = process.env.ELEVENLABS_CALL_TRANSPORT === "sip";

  const effectiveApiKey = stored.apiKey || envApiKey;
  const effectiveWebhookSecret = stored.webhookSecret || envWebhookSecret;

  return {
    outbound: {
      agentId: {
        value: stored.outboundAgentId || envAgentId,
        source: sourceOf(stored.outboundAgentId, envAgentId),
      },
      phoneNumberId: {
        value: stored.outboundPhoneNumberId || envPhoneNumberId,
        source: sourceOf(stored.outboundPhoneNumberId, envPhoneNumberId),
      },
      callTransport: {
        value: stored.outboundCallTransport || (envTransport ? "sip" : "twilio"),
        source: stored.outboundCallTransport
          ? "database"
          : envTransport
            ? "environment"
            : "default",
      },
    },
    inbound: {
      agentId: idField(stored.inboundAgentId),
      phoneNumberId: idField(stored.inboundPhoneNumberId),
    },
    apiKey: {
      set: Boolean(effectiveApiKey),
      source: sourceOf(stored.apiKey, envApiKey),
      last4: last4(effectiveApiKey),
    },
    webhookSecret: {
      set: Boolean(effectiveWebhookSecret),
      source: sourceOf(stored.webhookSecret, envWebhookSecret),
      last4: last4(effectiveWebhookSecret),
    },
    configured: Boolean(
      (stored.apiKey || envApiKey) &&
        (stored.outboundAgentId || envAgentId) &&
        (stored.outboundPhoneNumberId || envPhoneNumberId),
    ),
  };
}

/** What the Settings panel reads. */
export async function readVoiceSettingsForAdmin(): Promise<VoiceSettingsView> {
  return buildView(await readVoiceSettingsUncached());
}

const MAX_ID_LENGTH = 200;
const MAX_SECRET_LENGTH = 300;

export async function updateVoiceSettings(
  patch: VoiceSettingsPatch,
): Promise<VoiceSettingsUpdateResult> {
  const set: Record<string, string> = {};

  if (typeof patch.outboundAgentId === "string") {
    set.outboundAgentId = patch.outboundAgentId.trim().slice(0, MAX_ID_LENGTH);
  }
  if (typeof patch.outboundPhoneNumberId === "string") {
    set.outboundPhoneNumberId = patch.outboundPhoneNumberId.trim().slice(0, MAX_ID_LENGTH);
  }
  if (patch.outboundCallTransport === "twilio" || patch.outboundCallTransport === "sip") {
    set.outboundCallTransport = patch.outboundCallTransport;
  } else if (patch.outboundCallTransport === "") {
    set.outboundCallTransport = "";
  }
  if (typeof patch.inboundAgentId === "string") {
    set.inboundAgentId = patch.inboundAgentId.trim().slice(0, MAX_ID_LENGTH);
  }
  if (typeof patch.inboundPhoneNumberId === "string") {
    set.inboundPhoneNumberId = patch.inboundPhoneNumberId.trim().slice(0, MAX_ID_LENGTH);
  }

  if (patch.apiKey === null) {
    set.apiKey = "";
  } else if (typeof patch.apiKey === "string") {
    const trimmed = patch.apiKey.trim();
    if (!trimmed) return { ok: false, message: "The API key cannot be blank." };
    set.apiKey = trimmed.slice(0, MAX_SECRET_LENGTH);
  }

  if (patch.webhookSecret === null) {
    set.webhookSecret = "";
  } else if (typeof patch.webhookSecret === "string") {
    const trimmed = patch.webhookSecret.trim();
    if (!trimmed) return { ok: false, message: "The webhook secret cannot be blank." };
    set.webhookSecret = trimmed.slice(0, MAX_SECRET_LENGTH);
  }

  if (Object.keys(set).length > 0) {
    await (await collection()).updateOne(
      { _id: DOC_ID },
      { $set: set, $setOnInsert: { _id: DOC_ID } },
      { upsert: true },
    );
  }

  return { ok: true, settings: await readVoiceSettingsForAdmin() };
}
