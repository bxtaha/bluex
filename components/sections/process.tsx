"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";
import { RevealText } from "@/components/ui/reveal-text";

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
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      const tween = gsap.from(el.querySelectorAll("[data-phase]"), {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="process"
      className="relative border-y border-white/8 bg-white/[0.015]"
    >
      <div className="mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16">
        <div className="max-w-2xl">
          <p className="bx-eyebrow">Process</p>
          <RevealText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            Five weeks, start to live.
          </RevealText>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((phase) => (
            <li
              key={phase.step}
              data-phase
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
              <h3 className="bx-display mt-5 text-xl text-ink">{phase.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                {phase.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
