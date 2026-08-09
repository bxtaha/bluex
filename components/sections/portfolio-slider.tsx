"use client";

import { useRef, type ReactNode } from "react";
import { usePinnedTrack } from "@/components/motion/use-pinned-track";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

/**
 * The shell "Selected work" rides in: the pinned section, the heading, and the
 * track the project cards sit in.
 *
 * Only this part is a client component. The cards themselves arrive as
 * `children` from a server component, so every client name, description and
 * link is still in the HTML the crawler gets — this is the section that has to
 * be believable, and a list of live sites that populates after a fetch is the
 * one thing that would make it look like stock screenshots.
 *
 * The track runs the opposite way to "What we build": panels arrive from the
 * left edge rather than the right. That means the reader starts at the track's
 * right-hand end, so the cards are laid out in reverse — `--track-order` on
 * each card, applied by `.bx-track--mirror` — and the first project is the one
 * nearest that end. The markup stays in the admin's own order for anything that
 * reads it rather than looks at it.
 */
export function PortfolioSlider({
  children,
  footnote,
}: {
  children: ReactNode;
  footnote: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  usePinnedTrack(sectionRef, trackRef, { reverse: true });

  return (
    <section ref={sectionRef} id="work" className="bx-slider">
      <div className="flex h-full flex-col justify-center">
        {/* Set against the right edge, which is the end of the track the
            reader starts at — the heading and the first project meet on the
            same side rather than the copy sitting opposite the panel it
            introduces. `ml-auto` on a `max-w-2xl` block rather than
            `text-right` alone, so the measure stays the same as every other
            section heading and only its position changes. */}
        <div className="mx-auto mb-8 w-full max-w-[100rem] px-6 sm:px-10 md:mb-12 lg:px-16">
          <div className="ml-auto max-w-2xl text-right">
            <Reveal as="p" className="bx-eyebrow">
              Selected work
            </Reveal>
            <SplitText
              as="h2"
              className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
            >
              Sites that are live right now.
            </SplitText>
            <Reveal
              as="p"
              index={1}
              className="mt-4 text-base leading-relaxed text-ink-muted"
            >
              Every one of these is in production. Click through and see for
              yourself.
            </Reveal>
          </div>
        </div>

        {/* Same gutter as the services track, so the two sliders start their
            travel from the same line down the page. */}
        <div className="pl-6 sm:pl-10 md:pl-[max(1.5rem,calc((100vw-100rem)/2+4rem))]">
          <div ref={trackRef} className="bx-track bx-track--mirror">
            {children}
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-[100rem] px-6 sm:px-10 lg:px-16">
          <Reveal as="p" index={2} className="text-sm text-ink-muted">
            {footnote}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
