"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Expand } from "lucide-react";
import { observeOnce } from "@/lib/reveal";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";
import { Carousel } from "@/components/ui/carousel";
import { Modal } from "@/components/ui/modal";
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
 * The research slide, reproduced from the Harvard/MIT summary card.
 *
 * A light surface on purpose — see `.bx-quote-slide`. Two notes on the source:
 * the figures and the "home service businesses" phrasing are transcribed from
 * the supplied artwork rather than checked against the underlying papers, and
 * the mark is the Harvard Business *School* shield (the only asset in
 * `public/`), while the copy cites Harvard Business *Review*.
 */
/** Where the full paper can be read. Opens in a new tab. */
const HARVARD_URL =
  "https://www.hbs.edu/faculty/Pages/item.aspx?num=39955";

/**
 * The research content itself, at one of two sizes.
 *
 * One component for the card and the dialog rather than two: they are the same
 * document, and the only thing that differs is how much room it has. Splitting
 * them is how the two copies drift apart.
 */
function ResearchBody({ size }: { size: "card" | "dialog" }) {
  const dialog = size === "dialog";

  return (
    <div
      className={
        dialog
          ? "bx-quote-slide bx-quote-slide--dialog px-6 py-10 sm:px-12 sm:py-14"
          : "bx-quote-slide h-full px-8 pb-16 pt-8 sm:px-10 sm:pt-10"
      }
    >
      {/* The lockup is composed rather than a single asset: the supplied PNG is
          the shield on its own, and setting the wordmark as type is what lets
          it read "Review" — the only wordmark asset in `public/` says "School".
          The shield is decorative here because the text beside it already names
          the mark, so `alt=""` keeps a screen reader from hearing it twice. */}
      <div className="bx-quote-slide__lockup">
        <Image
          src="/hbs-logo-dark.png"
          alt=""
          /* The file's real pixel dimensions. CSS drives the rendered size, but
             these set the aspect ratio the box reserves before the image
             loads — wrong numbers here are a visible shift on first paint. */
          width={250}
          height={298}
          className="bx-quote-slide__shield"
        />
        <p className="bx-quote-slide__wordmark">
          Harvard
          <br />
          Business
          <br />
          Review
        </p>
      </div>

      <h3
        className={`bx-quote-slide__title mt-8 text-center leading-tight ${
          dialog
            ? "text-[clamp(1.75rem,3.4vw,2.75rem)]"
            : "text-[clamp(1.25rem,2.4vw,1.75rem)]"
        }`}
      >
        The short life of Online Sales Leads
      </h3>

      <div
        className={`bx-quote-slide__body mt-6 space-y-5 leading-relaxed ${
          dialog ? "text-[clamp(1rem,1.5vw,1.1875rem)]" : "text-[0.9375rem]"
        }`}
      >
        <p>
          Research from Harvard Business Review and MIT shows that{" "}
          <mark className="bx-quote-slide__mark">
            responding to a new lead within 5 minutes makes you 100 times more
            likely to make contact and 21 times more likely to qualify the lead
          </mark>
          .{" "}
          <mark className="bx-quote-slide__mark">
            The average business takes 47 hours to respond
          </mark>{" "}
          — meaning the first responder wins 78% of deals. These lead response
          time statistics, compiled from 8 major studies, prove that
          speed-to-lead is the single biggest factor in conversion rates for
          home service businesses and beyond.
        </p>

        <p>
          <strong>The key stat:</strong> Businesses that respond to leads within
          5 minutes are <strong>100 times more likely</strong> to make contact
          than those that wait 30 minutes (MIT Lead Response Management Study).
          78% of customers buy from the first business to respond. After 5
          minutes, lead quality drops 80% (Harvard Business Review).
        </p>
      </div>

      {/* `stopPropagation` so following the link does not also trip the card's
          open-the-dialog handler behind it. `noopener` because a new tab given
          `window.opener` can navigate this one. */}
      <a
        href={HARVARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bx-quote-slide__cta"
        onClick={(event) => event.stopPropagation()}
      >
        Check In Harvard website
        <ArrowUpRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

/**
 * The research slide as it appears in the card: the same body, made openable.
 *
 * The whole surface takes a click because that is what the box invites, but a
 * div with an `onClick` is invisible to a keyboard — so the expand control is a
 * real button, and it is the thing that carries the accessible name. The div's
 * handler is a convenience on top of it, not the only way in.
 */
function ResearchSlide({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="bx-quote-slide__opener" onClick={onOpen} role="presentation">
      <button
        type="button"
        className="bx-quote-slide__expand"
        aria-label="View the full research"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Expand className="size-4" strokeWidth={1.8} aria-hidden />
      </button>

      <ResearchBody size="card" />
    </div>
  );
}

export function SpeedHook() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const closeResearch = useCallback(() => setResearchOpen(false), []);

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
      {/* The card column is the wider of the two — it carries the research
          slide's paragraphs, which need the measure more than the copy on the
          left does. `minmax(0, …)` on both tracks rather than a bare ratio: a
          grid item's automatic minimum is its content, and the carousel's flex
          track would otherwise push the column past its share. */}
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center lg:gap-16">
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

        {/* The card is now only the frame — `overflow-hidden` so the light
            slide is clipped to its rounded corners. */}
        <Reveal index={2} className="bx-card bx-hairline overflow-hidden">
          <Carousel
            ariaLabel="Speed to lead: the research, and your response time"
            paused={researchOpen}
            slides={[
              {
                id: "research",
                label: "The research",
                tone: "light",
                content: <ResearchSlide onOpen={() => setResearchOpen(true)} />,
              },
              {
                id: "response-time",
                label: "Your response time",
                tone: "dark",
                content: <ResponseTimeSlide counterRef={counterRef} />,
              },
            ]}
          />
        </Reveal>
      </div>

      <Modal
        open={researchOpen}
        onClose={closeResearch}
        title="The short life of Online Sales Leads"
      >
        <ResearchBody size="dialog" />
      </Modal>
    </section>
  );
}

/**
 * The card's own content, unchanged — it is now the second slide rather than
 * the whole card.
 */
function ResponseTimeSlide({
  counterRef,
}: {
  counterRef: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div className="h-full px-8 pb-16 pt-8 sm:px-10 sm:pt-10">
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
                  point.tone === "signal" ? "text-signal" : "text-electric-glow"
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
    </div>
  );
}
