import { getVisibleTiers } from "@/lib/pricing";
import { PricingCards } from "@/components/sections/pricing-cards";

/**
 * Pricing.
 *
 * A server component so the tiers are read on the server and arrive in the
 * HTML — no loading state, no flash of an empty grid, and nothing about the
 * database reaching the browser. The interactive half is `PricingCards`, which
 * is where the CTAs live.
 */
export async function Pricing() {
  const tiers = await getVisibleTiers();

  // Nothing visible is a deliberate state — an admin can hide every tier — and
  // an empty heading with no cards under it looks broken.
  if (tiers.length === 0) return null;

  return <PricingCards tiers={tiers} />;
}
