"use client";

const CHIPS = [
  "5-minute response",
  "24/7 AI answering",
  "100% custom build",
  "No templates",
  "Calls, qualifies, books",
  "Built by developers",
];

const REGIONS = "Built for teams in the UAE, Saudi Arabia, Qatar, Canada & Australia";

function Chip({ label }: { label: string }) {
  return (
    <li className="flex shrink-0 items-center gap-2.5 rounded-full bg-white/[0.04] px-5 py-2.5 text-sm whitespace-nowrap text-ink ring-1 ring-white/10">
      <span className="size-1.5 shrink-0 rounded-full bg-electric" aria-hidden />
      {label}
    </li>
  );
}

/**
 * Continuously scrolling stat chips.
 *
 * The track holds two identical copies of the list and translates by exactly
 * -50%, so the moment the first copy leaves the viewport the second is in the
 * position the first started from — the loop has no visible seam. The copy is
 * aria-hidden so the labels are not announced twice.
 */
export function TrustStrip() {
  return (
    <section
      aria-label="What we promise"
      className="relative border-y border-white/8 py-8 md:py-10"
    >
      <p className="mb-6 px-6 text-center text-xs tracking-wide text-ink-muted sm:px-10">
        {REGIONS}
      </p>

      {/* Fades the chips out at both edges so they dissolve rather than being
          sliced off by the viewport. */}
      <div className="bx-marquee">
        <div className="bx-marquee__track">
          <ul className="bx-marquee__group">
            {CHIPS.map((chip) => (
              <Chip key={chip} label={chip} />
            ))}
          </ul>
          <ul className="bx-marquee__group" aria-hidden>
            {CHIPS.map((chip) => (
              <Chip key={`${chip}-copy`} label={chip} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
