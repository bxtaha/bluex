"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";
import { RevealText } from "@/components/ui/reveal-text";

const STEPS = [
  {
    time: "0:00",
    title: "The lead submits",
    body: "Someone fills in your form, at any hour. The agent picks it up immediately — no queue, no inbox, nobody to be available.",
  },
  {
    time: "0:04",
    title: "Hermes calls them",
    body: "Our voice agent dials out while they are still on your site and the problem is still fresh in their mind.",
  },
  {
    time: "0:05",
    title: "It qualifies the conversation",
    body: "A real conversation against your criteria: budget, timeline, what they actually need. Not a phone tree.",
  },
  {
    time: "0:09",
    title: "The meeting is booked",
    body: "It lands in your calendar, and you get the transcript and outcome before you have picked up your phone.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      const steps = gsap.utils.toArray<HTMLElement>("[data-step]", el);

      const tweens = steps.map((step) =>
        gsap.from(step, {
          opacity: 0,
          y: 32,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 82%", once: true },
        }),
      );

      // The rail fills as the steps are read, so the sequence has a visible
      // through-line rather than four disconnected cards.
      const rail = el.querySelector("[data-rail]");
      const railTween =
        rail &&
        gsap.fromTo(
          rail,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: el.querySelector("[data-steps]"),
              start: "top 70%",
              end: "bottom 75%",
              scrub: 0.5,
            },
          },
        );

      return () => {
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        railTween?.scrollTrigger?.kill();
        railTween?.kill();
      };
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <p className="bx-eyebrow">How the agent works</p>
        <RevealText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Nine minutes from form to booked meeting.
        </RevealText>
        <p className="mt-5 text-base leading-relaxed text-ink-muted">
          Speed is the whole advantage. A lead who hears from you first has
          usually stopped shopping by the time anyone else replies — and most
          businesses take hours.
        </p>
      </div>

      <div data-steps className="relative mt-16 md:mt-20">
        {/* Rail sits behind the markers, hidden on mobile where the layout is
            a simple stack. */}
        <div
          className="absolute left-[7.5rem] top-2 bottom-2 hidden w-px bg-white/10 md:block"
          aria-hidden
        >
          <div
            data-rail
            className="h-full w-full origin-top bg-gradient-to-b from-electric to-electric-glow"
          />
        </div>

        <ol className="space-y-10 md:space-y-14">
          {STEPS.map((step) => (
            <li
              key={step.time}
              data-step
              className="relative md:grid md:grid-cols-[7.5rem_auto_1fr] md:items-start md:gap-x-8"
            >
              <span className="bx-display block text-sm text-electric md:pt-1 md:text-right md:text-base">
                {step.time}
              </span>

              <span
                className="absolute left-0 top-8 hidden size-2.5 -translate-x-[calc(50%-7.5rem)] rounded-full bg-electric-glow ring-4 ring-void md:block"
                aria-hidden
              />

              <div className="mt-2 md:col-start-3 md:mt-0">
                <h3 className="bx-display text-xl text-ink sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
