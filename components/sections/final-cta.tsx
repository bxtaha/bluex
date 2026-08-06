"use client";

import { useEffect, useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";
import { BellNotify } from "@/components/ui/bell-notify";
import { observeOnce } from "@/lib/reveal";

export function FinalCta() {
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bellRef.current;
    if (!el) return;
    // Same shared observer every other reveal uses, so the bell drops in step
    // with the section rather than on a timer of its own.
    return observeOnce(el, () => el.setAttribute("data-revealed", "true"));
  }, []);

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
      </div>

      {/* The bell carries the CTA. Its scene is sized entirely off font-size,
          so the responsive steps set that rather than a width — and the
          container height is stepped alongside it, since the artwork plus the
          CTA hanging ~24em below it cannot be measured from content. */}
      <div
        ref={bellRef}
        className="bell-drop mx-auto mt-10 h-[260px] w-full max-w-3xl sm:mt-12 sm:h-[320px] lg:h-[400px]"
      >
        <BellNotify
          size={300}
          className="[font-size:1.9px]! sm:[font-size:2.35px]! lg:[font-size:2.9px]!"
          action={<CallCta />}
        />
      </div>
    </section>
  );
}
