"use client";

import { useEffect, useRef } from "react";
import { gsap, MOTION_QUERIES } from "@/lib/gsap";
import { RevealText } from "@/components/ui/reveal-text";
import { CallCta } from "@/components/ui/call-cta";

/**
 * Optional sourced statistic.
 *
 * Left null on purpose. The research on speed-to-lead is real, but putting a
 * specific multiplier on your own agency's site without a citation you have
 * checked is a liability — it is the first thing a serious buyer verifies.
 *
 * To enable it, fill this in with a figure and source you have confirmed:
 *
 *   const SOURCED_STAT = {
 *     value: "21x",
 *     claim: "more likely to qualify a lead",
 *     source: "Lead Response Management Study, Oldroyd et al.",
 *   };
 *
 * The section renders the qualitative version until then, with no gap where
 * the number would sit.
 */
const SOURCED_STAT: { value: string; claim: string; source: string } | null = null;

// Plain minute labels rather than M:SS — "0:09" next to a clock counting to
// 5:00 reads as nine seconds, which is not the claim.
const TIMELINE = [
  { at: "0 min", label: "Lead submits", tone: "signal" },
  { at: "4 min", label: "Agent calls", tone: "electric" },
  { at: "9 min", label: "Meeting booked", tone: "electric" },
] as const;

export function SpeedHook() {
  const ref = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const counter = counterRef.current;
    if (!el || !counter) return;

    const format = (totalSeconds: number) => {
      const clamped = Math.max(0, Math.round(totalSeconds));
      const minutes = Math.floor(clamped / 60);
      const seconds = clamped % 60;
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };

    const ctx = gsap.matchMedia();

    ctx.add(MOTION_QUERIES.motion, () => {
      // Tween a plain object and write the formatted value out, rather than
      // animating text directly — GSAP cannot interpolate "0:00" as a number,
      // and the padded seconds have to be recomputed on every tick.
      const clock = { seconds: 0 };

      const countUp = gsap.to(clock, {
        seconds: 300,
        duration: 2.4,
        ease: "power2.out",
        onUpdate: () => {
          counter.textContent = format(clock.seconds);
        },
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });

      const marks = gsap.from(el.querySelectorAll("[data-mark]"), {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });

      const bar = gsap.from(el.querySelector("[data-bar-fill]"), {
        scaleX: 0,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });

      return () => {
        [countUp, marks, bar].forEach((tween) => {
          tween.scrollTrigger?.kill();
          tween.kill();
        });
      };
    });

    // Reduced motion: show the finished value rather than a stuck 0:00.
    ctx.add(MOTION_QUERIES.reduced, () => {
      counter.textContent = format(300);
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      id="speed"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <p className="bx-eyebrow">Speed to lead</p>
          <RevealText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            The first five minutes decide it.
          </RevealText>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
            A lead who fills in your form is comparing you against three other
            businesses right now. Whoever reaches them while the problem is
            still on their mind gets the conversation — everyone else gets
            voicemail. Most companies take hours to reply. That gap is where the
            money leaks out.
          </p>

          {SOURCED_STAT && (
            <div className="mt-8 border-l-2 border-electric pl-5">
              <p className="bx-display text-4xl text-ink sm:text-5xl">
                {SOURCED_STAT.value}
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">
                {SOURCED_STAT.claim}
              </p>
              <p className="mt-2 text-xs text-ink-muted/70">
                {SOURCED_STAT.source}
              </p>
            </div>
          )}

          <div className="mt-9">
            <CallCta>See how fast it is</CallCta>
          </div>
        </div>

        <div className="bx-card bx-hairline p-8 sm:p-10">
          <p className="bx-eyebrow">Your response time</p>

          {/* tabular-nums keeps the clock from reflowing as digits change */}
          <p className="mt-4 flex items-baseline gap-3">
            <span
              ref={counterRef}
              className="bx-display text-[clamp(3.5rem,11vw,6rem)] tabular-nums text-ink"
            >
              0:00
            </span>
            <span className="text-sm text-ink-muted">minutes, every time</span>
          </p>

          <div className="mt-10">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                data-bar-fill
                className="h-full origin-left rounded-full bg-gradient-to-r from-signal via-electric to-electric-glow"
              />
            </div>

            <ol className="mt-5 flex justify-between gap-2">
              {TIMELINE.map((point) => (
                <li key={point.at} data-mark className="min-w-0">
                  <span
                    className={`bx-display block text-sm ${
                      point.tone === "signal" ? "text-signal" : "text-electric"
                    }`}
                  >
                    {point.at}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">
                    {point.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-9 border-t border-white/8 pt-5 text-sm leading-relaxed text-ink-muted">
            The agent does not get busy, forget, or go home. It answers the 2am
            enquiry exactly as fast as the 2pm one.
          </p>
        </div>
      </div>
    </section>
  );
}
