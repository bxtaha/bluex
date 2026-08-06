"use client";

import { useEffect, useRef } from "react";
import { observeOnce } from "@/lib/reveal";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
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

    const TARGET_SECONDS = 300;

    const format = (totalSeconds: number) => {
      const clamped = Math.max(0, Math.round(totalSeconds));
      const minutes = Math.floor(clamped / 60);
      const seconds = clamped % 60;
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };

    // A number readout is the one thing here that is neither transform nor
    // opacity, so it cannot be a CSS transition — it counts on rAF instead.
    // Written straight to textContent, never through state, so a 60fps count
    // does not queue 144 React renders.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      counter.textContent = format(TARGET_SECONDS);
      return;
    }

    let frame = 0;

    const stop = observeOnce(el, () => {
      const started = performance.now();
      const DURATION = 2400;

      const tick = (now: number) => {
        const t = Math.min(1, (now - started) / DURATION);
        // Matches the house ease-out shape: fast départ, long settle.
        const eased = 1 - Math.pow(1 - t, 3);
        counter.textContent = format(eased * TARGET_SECONDS);
        if (t < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    });

    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={ref}
      id="speed"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <Reveal as="p" index={0} className="bx-eyebrow">
            Speed to lead
          </Reveal>
          <SplitText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            The first five minutes decide it.
          </SplitText>

          <Reveal
            as="p"
            index={1}
            className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted"
          >
            A lead who fills in your form is comparing you against three other
            businesses right now. Whoever reaches them while the problem is
            still on their mind gets the conversation — everyone else gets
            voicemail. Most companies take hours to reply. That gap is where the
            money leaks out.
          </Reveal>

          {SOURCED_STAT && (
            <Reveal index={2} className="mt-8 border-l-2 border-electric pl-5">
              <p className="bx-display text-4xl text-ink sm:text-5xl">
                {SOURCED_STAT.value}
              </p>
              <p className="mt-1.5 text-sm text-ink-muted">
                {SOURCED_STAT.claim}
              </p>
              <p className="mt-2 text-xs text-ink-muted/70">
                {SOURCED_STAT.source}
              </p>
            </Reveal>
          )}

          <Reveal index={3} className="mt-9">
            <CallCta>See how fast it is</CallCta>
          </Reveal>
        </div>

        <Reveal index={2} className="bx-card bx-hairline p-8 sm:p-10">
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
              {/* Scales in from the card's own reveal — see .bx-bar-fill */}
              <div className="bx-bar-fill h-full origin-left rounded-full bg-gradient-to-r from-signal via-electric to-electric-glow" />
            </div>

            <ol className="mt-5 flex justify-between gap-2">
              {TIMELINE.map((point, i) => (
                <Reveal as="li" key={point.at} index={i + 1} className="min-w-0">
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
                </Reveal>
              ))}
            </ol>
          </div>

          <p className="mt-9 border-t border-white/8 pt-5 text-sm leading-relaxed text-ink-muted">
            The agent does not get busy, forget, or go home. It answers the 2am
            enquiry exactly as fast as the 2pm one.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
