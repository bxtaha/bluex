import { z } from "zod";
import { parsePathList } from "./support-voice-visibility.ts";

/**
 * The browser-based support agent's settings, and the only validation that
 * counts for them.
 *
 * Separate from `support-voice-store.ts` for the same reason `client-schema.ts`
 * is separate from `client-auth.ts`: this file imports nothing that opens a
 * socket, so `npm test` can pin its behaviour down with literal objects. The
 * store is a thin Mongo wrapper around it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * This is a **third channel**, beside the outbound call the lead form triggers
 * and the inbound call to the published number. It shares the workspace's API
 * key and webhook secret — both are workspace-level in the provider's own
 * model, and `lib/voice-settings.ts` already argues that splitting them per
 * direction would invent a distinction that does not exist. The same holds per
 * channel. What is *not* shared is the agent: a support agent that answers
 * questions is a different prompt from one that chases a lead, so `agentId`
 * lives here.
 *
 * There is no environment-variable fallback for anything in this file. Browser
 * conversations were never configurable from this repo before this feature
 * existed, so there is no continuity to preserve — the same reasoning as the
 * inbound fields in `voice-settings.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type SupportVoicePlacement = "bottom-right" | "bottom-left";
export type SupportVoiceTheme = "light" | "dark" | "site";
export type SupportVoiceVisibilityMode = "all" | "only" | "except";

export type StoredSupportVoice = {
  /** Master switch. Off means nothing is rendered and no SDK is fetched. */
  enabled: boolean;
  agentId: string;
  buttonLabel: string;
  placement: SupportVoicePlacement;
  visibilityMode: SupportVoiceVisibilityMode;
  visibilityPaths: string[];
  /** Blank uses the agent's own first message. */
  greeting: string;
  theme: SupportVoiceTheme;
  mobileEnabled: boolean;
  maxSessionMinutes: number;
  logToInbox: boolean;
};

export const DEFAULT_BUTTON_LABEL = "Customer Support";
export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 60;
const MAX_GREETING_LENGTH = 600;

export const DEFAULT_SUPPORT_VOICE: StoredSupportVoice = {
  enabled: false,
  agentId: "",
  buttonLabel: DEFAULT_BUTTON_LABEL,
  placement: "bottom-right",
  visibilityMode: "all",
  visibilityPaths: [],
  greeting: "",
  theme: "site",
  mobileEnabled: true,
  maxSessionMinutes: 10,
  logToInbox: true,
};

/**
 * What may reach the browser.
 *
 * `agentId` is absent because the client never needs it — it asks
 * `/api/voice/session` for a signed URL and the server looks the agent up. That
 * is not because an agent id is a secret; it is because a value the page does
 * not need is a value that cannot leak. `greeting` is absent for the same
 * reason: it travels with the session response, at the moment it is applied.
 * `enabled` is absent because a disabled widget renders nothing at all, so
 * there is no object to put it in.
 */
export type SupportVoicePublic = Pick<
  StoredSupportVoice,
  | "buttonLabel"
  | "placement"
  | "visibilityMode"
  | "visibilityPaths"
  | "theme"
  | "mobileEnabled"
  | "maxSessionMinutes"
>;

export function toPublicSupportVoice(settings: StoredSupportVoice): SupportVoicePublic {
  return {
    buttonLabel: settings.buttonLabel,
    placement: settings.placement,
    visibilityMode: settings.visibilityMode,
    visibilityPaths: settings.visibilityPaths,
    theme: settings.theme,
    mobileEnabled: settings.mobileEnabled,
    maxSessionMinutes: settings.maxSessionMinutes,
  };
}

export type SupportVoicePatch = Partial<StoredSupportVoice>;

export type SupportVoiceUpdateResult =
  | { ok: true; settings: StoredSupportVoice }
  | { ok: false; message: string };

/**
 * The provider's own two id shapes.
 *
 * Checked because the failure it prevents is expensive and silent: an API key
 * pasted into this field produces a 401 from the provider at the moment a
 * visitor clicks, hours after the save, with nothing on screen connecting the
 * two. Rejecting it at the form is the difference between a typo and an
 * outage nobody can explain.
 */
const AGENT_ID = /^(agent|seng)_[A-Za-z0-9_-]{4,}$/;

const schema = z.object({
  enabled: z.boolean(),

  // Empty is allowed and is how the value is cleared — the same "" means
  // "nothing set here" convention `voice-settings.ts` uses.
  agentId: z
    .string()
    .trim()
    .max(200, "That agent ID is too long.")
    .refine(
      (value) => value === "" || AGENT_ID.test(value),
      "That doesn't look like an agent ID — they start with `agent_`.",
    ),

  // Falls back rather than failing. An empty label renders a button with no
  // words on it, which is worse than quietly using the default.
  buttonLabel: z
    .string()
    .trim()
    .max(40, "That label is too long for a button.")
    .transform((value) => value || DEFAULT_BUTTON_LABEL),

  placement: z.enum(["bottom-right", "bottom-left"]),
  visibilityMode: z.enum(["all", "only", "except"]),

  // Re-normalised on the way in even though the form does it too, because the
  // form is markup and this route is reachable with curl.
  visibilityPaths: z
    .array(z.string())
    .max(200)
    .transform((paths) => parsePathList(paths.join("\n"))),

  greeting: z
    .string()
    .trim()
    .max(MAX_GREETING_LENGTH, `Keep the greeting under ${MAX_GREETING_LENGTH} characters.`),

  theme: z.enum(["light", "dark", "site"]),
  mobileEnabled: z.boolean(),

  // Clamped, not rejected. Somebody typing 0 or 9999 meant "short" or "long",
  // and a form error teaches them the bounds at the cost of losing the rest of
  // their edit.
  maxSessionMinutes: z
    .number()
    .refine(Number.isFinite, "Enter a number of minutes.")
    .transform((value) =>
      Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(value))),
    ),

  logToInbox: z.boolean(),
});

/**
 * Validates a partial update.
 *
 * Partial is the point: the Settings form submits every field it owns, but a
 * caller that sends only `{ enabled: false }` must not have the agent id reset
 * to its default as a side effect. Only the keys actually present are parsed,
 * and only those are returned.
 */
export function validateSupportVoice(
  patch: SupportVoicePatch,
): { ok: true; value: Partial<StoredSupportVoice> } | { ok: false; message: string } {
  const present = Object.keys(patch).filter(
    (key) => patch[key as keyof SupportVoicePatch] !== undefined,
  );

  const parsed = schema.partial().safeParse(
    Object.fromEntries(present.map((key) => [key, patch[key as keyof SupportVoicePatch]])),
  );

  if (!parsed.success) {
    // The first message, not the whole tree: this is shown in a toast under a
    // form, and a caller fixing one field at a time is the normal case.
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Those settings aren't valid." };
  }

  return { ok: true, value: parsed.data };
}
