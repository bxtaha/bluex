import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_CONTACT,
  readContactSettingsUncached,
  type ContactSettings,
} from "./contact-store.ts";

/**
 * The Next-facing half of the contact settings — the same split as pricing and
 * FAQ, for the same reason: `contact-store.ts` has no framework imports, so a
 * script or a job can read it without a bundler.
 */

export const CONTACT_TAG = "contact-settings";

export {
  DEFAULT_CONTACT,
  updateContactSettings,
  type ContactSettings,
  type ContactSettingsInput,
} from "./contact-store.ts";

const readContactSettings = unstable_cache(
  readContactSettingsUncached,
  ["contact-settings"],
  { tags: [CONTACT_TAG] },
);

/**
 * Both calls, for the reason written up in `lib/pricing.ts`: the tag drops the
 * cached read, `revalidatePath` marks the prerendered `/` stale. Either alone
 * looks like it works and does not.
 */
export function publishContact(): void {
  revalidateTag(CONTACT_TAG, "max");
  revalidatePath("/");
}

/** What the public section renders. Never throws. */
export async function getContactSettings(): Promise<ContactSettings> {
  try {
    return await readContactSettings();
  } catch (error) {
    console.error("[contact] falling back to defaults:", error);
    return DEFAULT_CONTACT;
  }
}
