"use client";

import { Check } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { useLeadForm } from "@/components/providers/lead-form-provider";
import { scrollToSection } from "@/lib/lenis";
import type { PricingTier } from "@/lib/pricing";

/**
 * The pricing grid.
 *
 * Client-side only because of the CTAs: one opens the shared lead-form dialog,
 * the rest scroll to the contact section. Everything else here is the same
 * material as the other sections — `bx-card bx-hairline bx-lift`, the eyebrow,
 * and `Reveal` for the staggered entrance, so the cards behave like the ones
 * above them rather than merely resembling them.
 */
export function PricingCards({ tiers }: { tiers: PricingTier[] }) {
  const { open } = useLeadForm();

  return (
    <section
      id="pricing"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <Reveal as="p" className="bx-eyebrow">
          Pricing
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Priced around what it&apos;s worth to you.
        </SplitText>
      </div>

      {/* `items-stretch` so a featured card with one extra line does not leave
          its neighbours short — every card fills the row's height and the CTAs
          line up along the bottom. */}
      <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <Reveal
            as="div"
            key={tier.id}
            index={i + 1}
            className={`bx-card bx-hairline bx-lift flex flex-col p-7 sm:p-8 ${
              tier.featured ? "bx-tier--featured" : ""
            }`}
          >
            {tier.featured && (
              <span className="bx-tier__badge">Most popular</span>
            )}

            <p className="bx-eyebrow">
              {String(i + 1).padStart(2, "0")}
            </p>

            <h3 className="bx-display mt-3 text-2xl text-ink sm:text-[1.75rem]">
              {tier.name}
            </h3>

            {tier.tagline && (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                {tier.tagline}
              </p>
            )}

            {/* Blank is a valid, deliberate state — the section's whole premise
                is that there is no list price — so nothing is reserved for it. */}
            {tier.priceAnchor && (
              <p className="bx-display mt-6 text-xl text-ink sm:text-2xl">
                {tier.priceAnchor}
              </p>
            )}

            {tier.features.length > 0 && (
              <ul className="mt-7 space-y-3.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-electric/12 text-electric ring-1 ring-electric/20"
                      aria-hidden
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span className="text-sm leading-relaxed text-ink-muted">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* `mt-auto` pins the CTA to the bottom of whichever card is
                tallest, so the row of buttons reads as one line. */}
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() =>
                  tier.ctaAction === "lead-form" ? open() : scrollToSection("contact")
                }
                className={
                  tier.featured ? "bx-tier__cta--primary" : "bx-tier__cta"
                }
              >
                {tier.ctaLabel}
              </button>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal
        as="p"
        index={tiers.length + 1}
        className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-muted"
      >
        Every project is scoped individually. Book a call and you&apos;ll get a
        fixed quote — no retainers you didn&apos;t ask for.
      </Reveal>
    </section>
  );
}
