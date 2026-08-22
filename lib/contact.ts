import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_CONTACT,
  readContactSettingsUncached,
  type ContactSettings,
} from "./contact-store.ts";

/**
 * The Next-facing half of the contact settings — the same split as pricing and
 * pricing, for the same reason: `contact-store.ts` has no framework imports, so a
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

/**
 * What the public section renders. Never throws.
 *
 * Spread over the defaults rather than returned directly, and that is not
 * belt-and-braces — it is the fix for a real crash. A cache entry is JSON
 * written by whichever version of this code was running when it was stored, so
 * after a field is *added* to `ContactSettings` the cache keeps serving objects
 * that predate it. TypeScript cannot see that: it types the return of
 * `readContactSettings` from today's source while the value came from
 * yesterday's. Adding `phone` took the whole home page down with
 * "Cannot read properties of undefined (reading 'trim')" until this line
 * existed, and the next field added would have done it again.
 */
export async function getContactSettings(): Promise<ContactSettings> {
  try {
    return { ...DEFAULT_CONTACT, ...(await readContactSettings()) };
  } catch (error) {
    console.error("[contact] falling back to defaults:", error);
    return DEFAULT_CONTACT;
  }
}
