import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_FAQS,
  readVisibleFaqsUncached,
  withFallbackIds,
  type Faq,
} from "./faq-store.ts";

/**
 * The Next-facing half of FAQs: caching, and the read the public section uses.
 * Everything touching Mongo lives in `faq-store.ts`.
 */

export const FAQ_TAG = "faqs";

export {
  DEFAULT_FAQS,
  createFaq,
  deleteFaq,
  listAllFaqs,
  reorderFaqs,
  seedFaqs,
  updateFaq,
  type Faq,
  type FaqInput,
} from "./faq-store.ts";

const readVisibleFaqs = unstable_cache(readVisibleFaqsUncached, ["faqs-visible"], {
  tags: [FAQ_TAG],
});

/**
 * Publishes a change to the live site. Every mutation route calls this.
 *
 * Both calls are needed. `revalidateTag` clears the cached database read, but
 * `/` is prerendered, so without `revalidatePath` visitors keep being served
 * HTML rendered before the edit existed — measured on the pricing section,
 * where the tag alone left a saved change invisible on the page.
 */
export function publishFaqs(): void {
  revalidateTag(FAQ_TAG, "max");
  revalidatePath("/");
}

/** What the public section renders. Never throws. */
export async function getVisibleFaqs(): Promise<Faq[]> {
  try {
    const faqs = await readVisibleFaqs();
    return faqs.length > 0 ? faqs : withFallbackIds(DEFAULT_FAQS);
  } catch (error) {
    console.error("[faq] falling back to defaults:", error);
    return withFallbackIds(DEFAULT_FAQS);
  }
}
