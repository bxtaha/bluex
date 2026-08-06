"use client";

import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-6 py-28 sm:px-10 md:py-36">
      {/* Glow anchored behind the headline so the closing section reads as the
          brightest point on the page. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[54rem] max-w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(46,107,255,0.32), transparent)",
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-3xl text-center">
        <Reveal as="p" className="bx-eyebrow">
          Ready when you are
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-4 text-[clamp(2.25rem,6.5vw,5rem)] text-ink"
        >
          Let the agent call you first.
        </SplitText>
        <Reveal
          as="p"
          index={1}
          className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg"
        >
          Leave your number and you’ll hear the whole thing working within five
          minutes. That is the pitch and the demo at the same time.
        </Reveal>
        <Reveal index={2} className="mt-10 flex justify-center">
          <CallCta />
        </Reveal>
      </div>
    </section>
  );
}
