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
 * **Every field falls back to the matching environment variable when unset
 * here.** That is not a migration shim to delete later: it is what lets a
 * fresh deployment work from `.env.local` before anyone has opened Settings,
 * and what lets ops rotate a credential by redeploying if the dashboard is
 * ever unreachable. An empty string in this document means "nothing entered
 * in the UI", not "explicitly blank" — `resolveVoiceCredentials` is the only
 * place that distinction is resolved, and every caller in `lib/elevenlabs.ts`
 * goes through it rather than reading `process.env` directly.
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
  agentId: string;
  phoneNumberId: string;
  webhookSecret: string;
  callTransport: CallTransport | "";
};

/** What a call actually gets placed with, after the environment fallback. */
export type VoiceCredentials = {
  apiKey: string;
  agentId: string;
  phoneNumberId: string;
  webhookSecret: string;
  callTransport: CallTransport;
};

export type SettingSource = "database" | "environment" | "unset";

/** Shaped for the Settings panel: never the secret itself, only enough to recognise it. */
export type VoiceSettingsView = {
  agentId: { value: string; source: SettingSource };
  phoneNumberId: { value: string; source: SettingSource };
  callTransport: {
    value: CallTransport;
    source: SettingSource | "default";
  };
  apiKey: { set: boolean; source: SettingSource; last4: string };
  webhookSecret: { set: boolean; source: SettingSource; last4: string };
  /** Same test `isConfigured()` used to make alone — kept here so one read answers both questions. */
  configured: boolean;
};

/**
 * A PATCH from the Settings form.
 *
 * `agentId`, `phoneNumberId` and `callTransport` are not secrets, so the form
 * always shows their real value and a PATCH always carries the field's
 * current state — `""` on those three means "clear the override", the same as
 * leaving the field blank in the UI.
 *
 * `apiKey` and `webhookSecret` are never shown back, so the form cannot send
 * "the current value unless changed" — three states, three shapes:
 * `undefined` (field untouched, leave the stored value alone), a non-empty
 * `string` (set it to this), or `null` (the explicit "remove override" button,
 * distinct from an empty string precisely so a blank secret can never reach
 * here by accident).
 */
export type VoiceSettingsPatch = {
  agentId?: string;
  phoneNumberId?: string;
  callTransport?: CallTransport | "";
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
    agentId: doc?.agentId?.trim() ?? "",
    phoneNumberId: doc?.phoneNumberId?.trim() ?? "",
    webhookSecret: doc?.webhookSecret?.trim() ?? "",
    callTransport: doc?.callTransport === "sip" ? "sip" : doc?.callTransport === "twilio" ? "twilio" : "",
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
 */
export async function resolveVoiceCredentials(): Promise<VoiceCredentials> {
  const stored = await readVoiceSettingsUncached();
  return {
    apiKey: stored.apiKey || envString("ELEVENLABS_API_KEY"),
    agentId: stored.agentId || envString("ELEVENLABS_AGENT_ID"),
    phoneNumberId: stored.phoneNumberId || envString("ELEVENLABS_AGENT_PHONE_NUMBER_ID"),
    webhookSecret: stored.webhookSecret || envString("ELEVENLABS_WEBHOOK_SECRET"),
    callTransport: stored.callTransport || (process.env.ELEVENLABS_CALL_TRANSPORT === "sip" ? "sip" : "twilio"),
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

function buildView(stored: StoredVoiceSettings): VoiceSettingsView {
  const envApiKey = envString("ELEVENLABS_API_KEY");
  const envWebhookSecret = envString("ELEVENLABS_WEBHOOK_SECRET");
  const envAgentId = envString("ELEVENLABS_AGENT_ID");
  const envPhoneNumberId = envString("ELEVENLABS_AGENT_PHONE_NUMBER_ID");
  const envTransport = process.env.ELEVENLABS_CALL_TRANSPORT === "sip";

  const effectiveApiKey = stored.apiKey || envApiKey;
  const effectiveWebhookSecret = stored.webhookSecret || envWebhookSecret;

  return {
    agentId: {
      value: stored.agentId || envAgentId,
      source: sourceOf(stored.agentId, envAgentId),
    },
    phoneNumberId: {
      value: stored.phoneNumberId || envPhoneNumberId,
      source: sourceOf(stored.phoneNumberId, envPhoneNumberId),
    },
    callTransport: {
      value: stored.callTransport || (envTransport ? "sip" : "twilio"),
      source: stored.callTransport ? "database" : envTransport ? "environment" : "default",
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
        (stored.agentId || envAgentId) &&
        (stored.phoneNumberId || envPhoneNumberId),
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

  if (typeof patch.agentId === "string") {
    set.agentId = patch.agentId.trim().slice(0, MAX_ID_LENGTH);
  }
  if (typeof patch.phoneNumberId === "string") {
    set.phoneNumberId = patch.phoneNumberId.trim().slice(0, MAX_ID_LENGTH);
  }
  if (patch.callTransport === "twilio" || patch.callTransport === "sip") {
    set.callTransport = patch.callTransport;
  } else if (patch.callTransport === "") {
    set.callTransport = "";
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
