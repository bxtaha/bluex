/* Server Component: it renders client children (Reveal, SplitText) but has
   no state, effects or handlers of its own, so none of it needs to ship to
   the browser. */
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

const PHASES = [
  {
    step: "01",
    title: "Discovery",
    duration: "Week 1",
    body: "We work out how leads actually reach you today, where they go cold, and what a booked meeting is worth. That decides everything we build.",
  },
  {
    step: "02",
    title: "Build",
    duration: "Weeks 2–4",
    body: "Site and agent are built in parallel. You see working software as it lands, not a slide deck describing it.",
  },
  {
    step: "03",
    title: "Launch",
    duration: "Week 5",
    body: "We go live, watch the first real calls together and tune what the agent says until it sounds like your business.",
  },
  {
    step: "04",
    title: "Ongoing",
    duration: "From week 6",
    body: "Transcripts, outcomes and conversion tracked monthly. The agent keeps getting sharper as we learn what your buyers ask.",
  },
];

export function Process() {
  return (
    <section
      id="process"
      className="relative border-y border-white/8 bg-white/[0.015]"
    >
      <div className="mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        <div className="max-w-2xl">
          <Reveal as="p" className="bx-eyebrow">
            Process
          </Reveal>
          <SplitText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            Five weeks, start to live.
          </SplitText>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((phase, i) => (
            <Reveal
              as="li"
              key={phase.step}
              index={i + 1}
              className="flex flex-col bg-void p-7 lg:p-8"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="bx-display text-3xl text-electric">
                  {phase.step}
                </span>
                <span className="text-[0.7rem] tracking-wide text-ink-muted">
                  {phase.duration}
                </span>
              </div>
              {/* The `<ol>` already says these are four ordered steps; an `h3`
                  each said it a second time and worse. It also collided with
                  the pricing tier of the same name — "Launch" appeared twice
                  in the outline, which is the duplicate heading text Seobility
                  flagged. */}
              <p className="bx-display mt-5 text-xl text-ink">{phase.title}</p>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                {phase.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
