"use client";

import { useRef } from "react";
import { usePinnedTrack } from "@/components/motion/use-pinned-track";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";

const SERVICES = [
  {
    index: "01",
    title: "AI Voice Automation",
    summary:
      "A lead fills in your form and the phone rings before they've closed the tab.",
    points: [
      "Calls within five minutes, day or night",
      "Qualifies against your own criteria",
      "Books straight into your calendar",
      "Hands you the transcript and the outcome",
    ],
    visual: "voice",
  },
  {
    index: "02",
    title: "Custom Websites & E-commerce",
    summary:
      "Built from scratch around how you actually sell — no templates, no page builders.",
    points: [
      "Designed and coded for your offer",
      "Engineered to load fast on real networks",
      "Storefronts wired to real payments",
      "Structured so the AI agent plugs straight in",
    ],
    visual: "web",
  },
] as const;

function VoiceVisual() {
  // Bars are a fixed pattern rather than random: a stable waveform silhouette
  // reads as a voice trace, and random heights change on every render.
  const bars = [28, 52, 78, 44, 96, 62, 34, 70, 88, 46, 24, 58, 82, 38, 66];
  return (
    <div className="flex h-full items-center justify-center gap-1.5" aria-hidden>
      {bars.map((height, i) => (
        <span
          key={i}
          className="bx-wave-bar w-1.5 rounded-full bg-gradient-to-t from-electric to-electric-glow"
          style={{
            height: `${height}%`,
            opacity: 0.35 + (height / 100) * 0.65,
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

function WebVisual() {
  return (
    <div className="flex h-full items-center justify-center" aria-hidden>
      <div className="w-full max-w-xs rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
        <div className="mb-3 flex gap-1.5">
          {["bg-white/25", "bg-white/15", "bg-white/15"].map((tone, i) => (
            <span key={i} className={`size-2 rounded-full ${tone}`} />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-14 rounded-lg bg-gradient-to-br from-electric/35 to-electric/5" />
          <div className="h-2 w-3/4 rounded-full bg-white/15" />
          <div className="h-2 w-1/2 rounded-full bg-white/10" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 rounded-md bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Reversed is the other section's business: here the panels arrive from
  // the right, which is the direction the copy reads in.
  usePinnedTrack(sectionRef, trackRef);

  return (
    <section
      ref={sectionRef}
      id="services"
      /* `.bx-slider` carries the clipping and the viewport height. Both used to
         be Tailwind utilities here, but the height must only apply while the
         track is actually being scrubbed — see `usePinnedTrack`, which is what
         sets `data-pinned`. */
      className="bx-slider"
    >
      <div className="flex h-full flex-col justify-center">
        <div className="mx-auto mb-8 w-full max-w-[100rem] px-6 sm:px-10 md:mb-14 lg:px-16">
          <Reveal as="p" className="bx-eyebrow">
            What we build
          </Reveal>
          <SplitText
            as="h2"
            className="bx-display mt-3 max-w-2xl text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            Two things, both done properly.
          </SplitText>
        </div>

        <div className="pl-6 sm:pl-10 md:pl-[max(1.5rem,calc((100vw-100rem)/2+4rem))]">
          <div ref={trackRef} className="bx-track">
            {SERVICES.map((service) => (
              <article
                key={service.index}
                className="bx-card bx-hairline bx-lift flex flex-col overflow-hidden p-6 sm:p-9 md:flex-row md:items-center md:gap-10 md:p-11"
              >
                <div className="md:flex-1">
                  <span className="bx-eyebrow text-electric-glow">{service.index}</span>
                  <h3 className="bx-display mt-2 text-[clamp(1.5rem,3.4vw,2.6rem)] text-ink sm:mt-3">
                    {service.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
                    {service.summary}
                  </p>
                  <ul className="mt-4 space-y-2 sm:mt-6 sm:space-y-2.5">
                    {service.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="mt-0.5 size-4 shrink-0 text-electric"
                          aria-hidden
                        >
                          <path
                            d="m5 13 4 4L19 7"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Small on a phone: panels are equal height, so the tallest
                    one sets the box and the longest copy was being clipped by
                    the card's own overflow. The decorative visual is what
                    gives way, not the text. */}
                <div className="mt-4 h-16 shrink-0 sm:mt-8 sm:h-40 md:mt-0 md:h-56 md:w-72">
                  {service.visual === "voice" ? <VoiceVisual /> : <WebVisual />}
                </div>
              </article>
            ))}

            {/* Closing panel. It gives the track guaranteed travel on wide
                screens — two panels alone fit inside a large desktop viewport
                and the pin would have nothing to scrub — and puts a conversion
                point at the moment someone has just read both offers. */}
            <article className="bx-card bx-hairline bx-lift flex flex-col justify-center p-7 text-center sm:p-9 md:p-11">
              <p className="bx-eyebrow">Not sure which?</p>
              <h3 className="bx-display mt-3 text-[clamp(1.6rem,3.4vw,2.6rem)] text-ink">
                Ask the agent yourself.
              </h3>
              <p className="mx-auto mt-3.5 max-w-sm text-sm leading-relaxed text-ink-muted sm:text-base">
                Leave your number and it will call you back in under five
                minutes — the fastest way to see whether this fits.
              </p>
              <div className="mt-7 flex justify-center">
                <CallCta />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
