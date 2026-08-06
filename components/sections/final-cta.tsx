"use client";

import { useRef } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { CallCta } from "@/components/ui/call-cta";
import { ScrollBell } from "@/components/ui/scroll-bell";

export function FinalCta() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section ref={sectionRef} className="relative">
      {/* Same shape as the how-it-works section: a container taller than the
          viewport gives the scroll budget, and a sticky child holds the
          content still while that budget is spent — which is what turns
          scrolling into the bell's timeline rather than just moving the page. */}
      <div className="lg:h-[220vh] border-red-500 border-solid">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center">
          <div className="relative w-full overflow-hidden px-6 py-28 sm:px-10 md:py-36 lg:py-38">
            {/* Glow anchored behind the headline so the closing section reads
                as the brightest point on the page. */}
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
                Leave your number and you’ll hear the whole thing working within
                five minutes. That is the pitch and the demo at the same time.
              </Reveal>
            </div>

            {/* Centred beneath the copy. Its vertical position and opacity are
                driven by scroll progress through this section. */}
            <ScrollBell sectionRef={sectionRef} />

            {/* Last thing in the section, under the bell — the closing action
                someone reaches after the whole page. */}
            <Reveal index={2} className="mt-24 flex justify-center sm:mt-32">
              <CallCta />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
