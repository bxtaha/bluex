"use client";

import { usePinProgress } from "@/components/motion/use-pin-progress";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

const STEPS = [
  {
    time: "0 min",
    title: "The lead submits",
    body: "Someone fills in your form, at any hour. The agent picks it up immediately — no queue, no inbox, nobody who has to be available.",
  },
  {
    time: "4 min",
    title: "Hermes calls them",
    body: "Our voice agent dials out while they are still on your site and the problem is still fresh in their mind.",
  },
  {
    time: "5 min",
    title: "It qualifies the conversation",
    body: "A real conversation against your criteria: budget, timeline, what they actually need. Not a phone tree.",
  },
  {
    time: "9 min",
    title: "The meeting is booked",
    body: "It lands in your calendar, and you get the transcript and outcome before you have picked up your phone.",
  },
];

export function HowItWorks() {
  const { containerRef, activeStep, progress } = usePinProgress(STEPS.length);

  return (
    <section id="how-it-works" className="relative">
      {/* Outer container is taller than the viewport; the child sticks to the
          top and the extra height becomes the scroll budget for stepping
          through. Pinning is desktop-only — on a phone four expanded steps do
          not fit in 100vh, so it falls back to a normal stack. */}
      <div ref={containerRef} className="md:h-[280vh]">
        <div className="md:sticky md:top-0 md:flex md:h-dvh md:items-center">
          <div className="mx-auto w-full max-w-[100rem] px-6 py-24 sm:px-10 md:py-0 lg:px-16">
            <div className="md:grid md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-center md:gap-16 lg:gap-24">
              <div>
                <p className="bx-eyebrow">How the agent works</p>
                <SplitText
                  as="h2"
                  className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
                >
                  Nine minutes from form to booked meeting.
                </SplitText>
                <Reveal
                  as="p"
                  index={1}
                  className="mt-5 max-w-md text-base leading-relaxed text-ink-muted"
                >
                  Speed is the whole advantage. A lead who hears from you first
                  has usually stopped shopping by the time anyone else replies —
                  and most businesses take hours.
                </Reveal>

                {/* Progress readout, desktop only: it is the affordance that
                    explains why the page stopped scrolling. */}
                <div
                  className="mt-10 hidden h-px w-full max-w-md bg-white/10 md:block"
                  aria-hidden
                >
                  <div
                    className="h-full origin-left bg-electric transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </div>
              </div>

              <ol className="mt-14 space-y-3 md:mt-0 md:space-y-4">
                {STEPS.map((step, i) => {
                  const isActive = i === activeStep;
                  return (
                    <li
                      key={step.time}
                      // Inactive steps dim on desktop where one is always
                      // active. On mobile every step stays fully legible.
                      className={`border-l-2 pl-5 transition-[opacity,border-color] duration-500 md:pl-6 ${
                        isActive
                          ? "border-electric md:opacity-100"
                          : "border-white/12 md:opacity-40"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span className="bx-display text-sm text-electric-glow">
                        {step.time}
                      </span>
                      {/* Step label inside an ordered list, not a subsection
                          heading — see `process.tsx`. */}
                      <p className="bx-display mt-1 text-xl text-ink sm:text-2xl">
                        {step.title}
                      </p>

                      {/* Descriptions always occupy their space and only their
                          opacity changes. Collapsing them would animate
                          layout, which shifts every step below and is exactly
                          what the "transform and opacity only" rule exists to
                          prevent. The step reads as opening because it
                          brightens, not because the box grows. */}
                      <p
                        className={`pt-2.5 text-sm leading-relaxed text-ink-muted transition-opacity duration-500 ease-out sm:text-base ${
                          isActive ? "md:opacity-100" : "md:opacity-0"
                        }`}
                      >
                        {step.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
