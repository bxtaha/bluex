import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_SUPPORT_VOICE,
  type StoredSupportVoice,
} from "./support-voice-schema.ts";
import { readSupportVoiceUncached } from "./support-voice-store.ts";

/**
 * The Next-facing half of the support-voice settings.
 *
 * Same split as `contact.ts` / `contact-store.ts`, for the same reason: the
 * store imports no framework, so a script or a job can read it without a
 * bundler, and everything that knows about caching lives here.
 */

export const SUPPORT_VOICE_TAG = "support-voice-settings";

export {
  DEFAULT_SUPPORT_VOICE,
  DEFAULT_BUTTON_LABEL,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  toPublicSupportVoice,
  type StoredSupportVoice,
  type SupportVoicePatch,
  type SupportVoicePlacement,
  type SupportVoicePublic,
  type SupportVoiceTheme,
  type SupportVoiceVisibilityMode,
} from "./support-voice-schema.ts";

const readSupportVoice = unstable_cache(
  readSupportVoiceUncached,
  ["support-voice-settings"],
  { tags: [SUPPORT_VOICE_TAG] },
);

/**
 * Both calls, and neither is redundant — the reasoning is written up in
 * `lib/pricing.ts` and it cost real time to learn. The tag drops the cached
 * read; `revalidatePath` marks the prerendered `/` stale. Either one alone
 * looks like it works: the tag alone leaves the prerendered page serving the
 * old markup, and the path alone leaves the cached read serving the old values
 * into the new render.
 *
 * This is what makes "changes take effect on the public site without a
 * redeploy" true rather than aspirational.
 */
export function publishSupportVoice(): void {
  revalidateTag(SUPPORT_VOICE_TAG, "max");
  revalidatePath("/");
}

/**
 * What the layout reads on every render of the public site. Never throws.
 *
 * A settings read that can take the marketing site down is a worse outcome
 * than a support button that fails to appear, so an unreachable database
 * returns the defaults — and the default is `enabled: false`, which means the
 * failure mode is "no button", not "a button that cannot connect".
 */
export async function getSupportVoice(): Promise<StoredSupportVoice> {
  try {
    return { ...DEFAULT_SUPPORT_VOICE, ...(await readSupportVoice()) };
  } catch (error) {
    console.error("[support-voice] falling back to defaults:", error);
    return DEFAULT_SUPPORT_VOICE;
  }
}
