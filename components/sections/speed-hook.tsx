"use client";

import { useEffect, useRef } from "react";
import { observeOnce } from "@/lib/reveal";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";
import { useReducedMotion } from "@/lib/use-media-query";

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

/**
 * The evidence slide.
 *
 * A light surface on purpose — see `.bx-quote-slide`. It is a citation, not a
 * credential: the publication is named in the sentence and nowhere else. No
 * crest, no wordmark, no link dressed as a badge — a card carrying an
 * institution's mark reads as that institution vouching for this agency, which
 * none of them has done.
 *
 * The two claims are kept apart deliberately. The 7× figure belongs to the HBR
 * article named directly beneath it; the five-minute point rests on a separate
 * body of lead-response research and says so. Letting the Harvard name drift
 * across the rule onto our own speed claim is precisely the overreach the
 * previous version of this card made.
 */
function ResearchBody() {
  return (
    <div className="bx-quote-slide h-full px-8 py-9 sm:px-10 sm:py-10">
      <p className="bx-quote-slide__eyebrow">Why speed wins</p>

      <p className="bx-quote-slide__stat">7×</p>

      <p className="bx-quote-slide__claim">
        Firms that contact a new lead within an hour are nearly seven times more
        likely to have a qualifying conversation than those that wait even 60
        minutes longer — and more than sixty times more likely than those who
        wait a day.
      </p>

      {/* Small and muted so it reads as a citation. Only the article title is
          the link — "Source:" and the publication stay plain text, so the
          underline lands on the thing being cited rather than turning the whole
          line, or the institution's name, into something that looks clickable
          and endorsing. */}
      <p className="bx-quote-slide__source">
        Source: Harvard Business Review,{" "}
        <a
          href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads"
          target="_blank"
          rel="noopener noreferrer"
          className="bx-quote-slide__source-link"
        >
          &ldquo;The Short Life of Online Sales Leads.&rdquo;
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      {/* Set apart by the gap above it, and unattributed to Harvard on
          purpose — see the note at the top of this component. */}
      <p className="bx-quote-slide__support">
        And the first five minutes matter most — separate lead-response research
        shows the odds of qualifying a lead drop sharply once you pass that
        window. Our agent calls before it closes.
      </p>
    </div>
  );
}

export function SpeedHook() {
  const reduced = useReducedMotion();
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
    if (reduced) {
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
  }, [reduced]);

  return (
    <section
      ref={ref}
      id="speed"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      {/* Two columns that say the same thing from opposite ends: the left is
          the claim and the proof of it, the right is the research the claim
          rests on. `minmax(0, …)` rather than bare ratios because a grid item's
          automatic minimum is its content, which can otherwise push a column
          past its share. Top-aligned, not centred — both columns are now
          content-rich and of unequal length, and centring would leave the
          heading floating away from the card it argues with. */}
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16">
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

          {/* The clock, folded into the argument rather than boxed off beside
              it. No card of its own: a second surface here would read as a
              separate widget, and this is the paragraph's evidence. A rule and
              the eyebrow are enough to mark it as a different kind of content
              from the prose above. */}
          <Reveal index={2} className="mt-10 border-t border-white/8 pt-8">
            <p className="bx-eyebrow">Your response time</p>

            {/* tabular-nums keeps the clock from reflowing as digits change.
                Deliberately smaller than the h2 above it — in its own card it
                could be the largest thing on screen, but in this column the
                heading has to stay the hero. */}
            <p className="mt-3 flex items-baseline gap-3">
              <span
                ref={counterRef}
                className="bx-display text-[clamp(2.75rem,7vw,4rem)] tabular-nums text-ink"
              >
                0:00
              </span>
              <span className="text-sm text-ink-muted">
                minutes, every time
              </span>
            </p>

            <div className="mt-8">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
                {/* Scales in from the section's own reveal — see .bx-bar-fill */}
                <div className="bx-bar-fill h-full origin-left rounded-full bg-gradient-to-r from-signal via-electric to-electric-glow" />
              </div>

              <ol className="mt-5 flex justify-between gap-2">
                {TIMELINE.map((point, i) => (
                  <Reveal
                    as="li"
                    key={point.at}
                    index={i + 1}
                    className="min-w-0"
                  >
                    <span
                      className={`bx-display block text-sm ${
                        point.tone === "signal"
                          ? "text-signal"
                          : "text-electric-glow"
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

            <p className="mt-8 max-w-lg text-sm leading-relaxed text-ink-muted">
              The agent does not get busy, forget, or go home. It answers the
              2am enquiry exactly as fast as the 2pm one.
            </p>
          </Reveal>

          <Reveal index={3} className="mt-10">
            <CallCta>See how fast it is</CallCta>
          </Reveal>
        </div>

        {/* The evidence, on its own. The card is only the frame —
            `overflow-hidden` so the light surface is clipped to its corners. */}
        <Reveal index={2} className="bx-card bx-hairline overflow-hidden">
          <ResearchBody />
        </Reveal>
      </div>
    </section>
  );
}
