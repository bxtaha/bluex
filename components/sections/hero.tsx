"use client";

import { useEffect, useRef } from "react";
import KineticGrid from "@/components/ui/kinetic-grid";
import { Reveal } from "@/components/motion/reveal";
import { TextRoll } from "@/components/ui/text-roll";
import { CallCta } from "@/components/ui/call-cta";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";

const STATS = [
  { value: "< 5 min", label: "Callback time" },
  { value: "24/7", label: "Always answering" },
  { value: "100%", label: "Custom built" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.matchMedia();

    // Entrance is handled by the shared reveal system. GSAP is kept here only
    // for the scroll-linked drift, which needs a scrubbed timeline the CSS
    // reveal system has no equivalent for.
    ctx.add(MOTION_QUERIES.motion, () => {
      const drift = gsap.to(el.querySelector("[data-hero-content]"), {
        y: -60,
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "bottom 90%",
          end: "bottom 25%",
          scrub: true,
        },
      });

      return () => {
        drift.scrollTrigger?.kill();
        drift.kill();
      };
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 pt-28 pb-16 sm:px-10"
    >
      <KineticGrid />

      {/* Fades the grid into the page bottom so the section boundary is a
          gradient rather than a hard canvas edge. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-b from-transparent to-void" />

      <div
        data-hero-content
        className="relative z-10 mx-auto w-full max-w-5xl text-center"
      >
        <Reveal className="mx-auto inline-flex items-center gap-2.5 rounded-full bg-white/5 px-4 py-1.5 text-xs text-ink-muted ring-1 ring-white/10 backdrop-blur-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-electric opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-electric-glow" />
          </span>
          AI voice agents · Web &amp; e-commerce
        </Reveal>

        <TextRoll
          as="h1"
          delay={150}
          className="bx-display mt-7 text-[clamp(2.5rem,8vw,6.5rem)] text-ink"
        >
          Every lead called back in five minutes.
        </TextRoll>

        {/* Index 1, not 6. This paragraph is the page's largest contentful
            paint, and a reveal index is a delay before it is painted at all —
            six of them held the headline metric back by about 450ms for
            choreography nobody was waiting on. It now arrives while the
            headline's words are still landing, which reads fine and is the
            difference between a fast page and one that measures slow. */}
        <Reveal
          as="p"
          index={1}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
        >
          We build the websites that bring you leads and the AI voice agents that
          call them before your competitors even open the email.
        </Reveal>

        <Reveal
          index={2}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          {/* Not magnetic: the button sits beside a static one, and only one of
              the pair drifting toward the cursor reads as the layout shifting. */}
          <CallCta magnetic={false} />
          <a href="#services" className="bx-btn bx-btn--ghost bx-lift">
            See what we build
          </a>
        </Reveal>

        <Reveal
          as="dl"
          index={3}
          className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4 border-t border-white/8 pt-7"
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="bx-display block text-xl text-ink sm:text-2xl">
                  {stat.value}
                </span>
                <span className="mt-1 block text-[0.7rem] tracking-wide text-ink-muted sm:text-xs">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
