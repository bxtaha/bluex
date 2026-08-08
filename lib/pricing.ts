import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_TIERS,
  readVisibleTiersUncached,
  withFallbackIds,
  type PricingTier,
} from "./pricing-store.ts";

/**
 * The Next-facing half of pricing: caching, and the read the public section
 * uses. Everything that touches Mongo lives in `pricing-store.ts`, which has no
 * framework imports so the seed script can use it from plain Node.
 */

export const PRICING_TAG = "pricing-tiers";

// Re-exported so routes and components have one import to reach for.
export {
  DEFAULT_TIERS,
  createTier,
  deleteTier,
  listAllTiers,
  reorderTiers,
  seedTiers,
  updateTier,
  type CtaAction,
  type PricingTier,
  type TierInput,
} from "./pricing-store.ts";

/**
 * Cached read, tagged so the admin mutations can drop it.
 *
 * This is what keeps the marketing page statically generated: a bare `find()`
 * in a server component makes the whole route dynamic, and this page's LCP
 * budget was won by removing exactly that kind of per-request work. An edit
 * still appears immediately, because every write invalidates the tag.
 */
const readVisibleTiers = unstable_cache(
  readVisibleTiersUncached,
  ["pricing-tiers-visible"],
  { tags: [PRICING_TAG] },
);

/**
 * Publishes a change to the live site. Every mutation route calls this.
 *
 * Both calls are needed, which is worth writing down because dropping either
 * looks like it works. `revalidateTag` clears the cached database read — but
 * `/` is prerendered at build time, so the visitor is served HTML that was
 * rendered before the edit existed and never re-reads anything. Measured: with
 * the tag alone, a saved price anchor did not appear on the page at all.
 * `revalidatePath` is what marks that prerendered HTML stale so the next
 * request rebuilds it.
 */
export function publishPricing(): void {
  revalidateTag(PRICING_TAG, "max");
  revalidatePath("/");
}

/** What the public section renders. Never throws — see DEFAULT_TIERS. */
export async function getVisibleTiers(): Promise<PricingTier[]> {
  try {
    const tiers = await readVisibleTiers();
    return tiers.length > 0 ? tiers : withFallbackIds(DEFAULT_TIERS);
  } catch (error) {
    // A marketing page with a hole in it because Atlas is having a moment is
    // worse than one showing the shipped defaults.
    console.error("[pricing] falling back to defaults:", error);
    return withFallbackIds(DEFAULT_TIERS);
  }
}
