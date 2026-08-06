"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";
import { RevealText } from "@/components/ui/reveal-text";

/**
 * Outcome framing rather than performance claims.
 *
 * Deliberately no percentages or client counts: inventing them on an agency's
 * own site is a liability, and unsourced numbers are the first thing a serious
 * buyer checks. Each entry is written so a real figure can replace the `stat`
 * line as soon as there is one to report.
 */
const OUTCOMES = [
  {
    stat: "Never again",
    title: "A lead goes unanswered",
    body: "Every enquiry gets a call, including the ones that arrive at 2am on a Sunday. Nothing sits in an inbox until Monday.",
  },
  {
    stat: "First",
    title: "Voice they hear is yours",
    body: "Most businesses reply in hours. Reaching someone while they are still comparing options is the difference between a conversation and a voicemail.",
  },
  {
    stat: "Every call",
    title: "Written down and scored",
    body: "Transcript, qualification and outcome for each one. You stop guessing which leads are worth chasing.",
  },
  {
    stat: "Zero",
    title: "Hours spent chasing",
    body: "Your calendar fills with meetings that are already qualified, so your time goes to the pitch instead of the follow-up.",
  },
];

export function Outcomes() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      const tween = gsap.from(el.querySelectorAll("[data-outcome]"), {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
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
      id="outcomes"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <p className="bx-eyebrow">What you get</p>
        <RevealText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Your site stops being a brochure.
        </RevealText>
        <p className="mt-5 text-base leading-relaxed text-ink-muted">
          It becomes the thing that answers, qualifies and books — the best
          salesperson you have, working every hour you are not.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {OUTCOMES.map((outcome) => (
          <article
            key={outcome.title}
            data-outcome
            className="bx-card bx-hairline p-7 sm:p-8"
          >
            <p className="bx-display text-2xl text-electric sm:text-3xl">
              {outcome.stat}
            </p>
            <h3 className="bx-display mt-2 text-lg text-ink sm:text-xl">
              {outcome.title}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {outcome.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
