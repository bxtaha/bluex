import { Marquee } from "@/components/motion/marquee";

const CHIPS = [
  "5-minute response",
  "24/7 AI answering",
  "100% custom build",
  "No templates",
  "Calls, qualifies, books",
  "Built by developers",
];

const REGIONS = "Built for teams in the UAE, Saudi Arabia, Qatar, Canada & Australia";

export function TrustStrip() {
  return (
    <section
      aria-label="What we promise"
      className="relative border-y border-white/8 py-8 md:py-10"
    >
      <p className="mb-6 px-6 text-center text-xs tracking-wide text-ink-muted sm:px-10">
        {REGIONS}
      </p>

      <Marquee
        items={CHIPS}
        renderItem={(chip) => (
          <span className="flex items-center gap-2.5 rounded-full bg-white/[0.04] px-5 py-2.5 text-sm whitespace-nowrap text-ink ring-1 ring-white/10">
            <span className="size-1.5 shrink-0 rounded-full bg-electric" aria-hidden />
            {chip}
          </span>
        )}
      />
    </section>
  );
}
