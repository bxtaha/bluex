"use client";

import { useId, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import type { Faq } from "@/lib/faq";

/**
 * The accordion.
 *
 * The open/close height animation is CSS — a grid row easing between `0fr` and
 * `1fr` — rather than GSAP or Framer Motion. `height: auto` is not animatable,
 * so the usual alternatives are measuring the panel and animating a pixel
 * height (which JS has to redo on every resize and every font swap, and which
 * this page's webfonts would get wrong on first paint) or a max-height guess
 * (which either clips a long answer or eases against dead space, so identical
 * durations read as different speeds). The grid track animates to the content's
 * real height with no measurement at all, and it keeps this section in line
 * with the rest of the page, where reveals are CSS and JS only sets an
 * attribute.
 *
 * One panel at a time: `open` holds an id rather than a set.
 */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <Reveal as="p" className="bx-eyebrow">
          Questions
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          The things people ask before they book.
        </SplitText>
      </div>

      {/* Narrower than the section: a long answer set across the full width of
          a desktop is a punishing measure to read. */}
      <div className="mt-14 max-w-3xl">
        {faqs.map((faq, i) => {
          const isOpen = openId === faq.id;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;

          return (
            <Reveal
              as="div"
              key={faq.id}
              index={i + 1}
              className="bx-faq__row"
              data-open={isOpen}
            >
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  className="bx-faq__trigger"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                >
                  <span className="bx-faq__question">{faq.question}</span>

                  {/* One bar rotates onto the other, so the plus becomes a
                      minus. Two spans rather than swapped icons: swapping would
                      re-render at the halfway point and read as a flicker. */}
                  <span className="bx-faq__icon" aria-hidden>
                    <span className="bx-faq__bar" />
                    <span className="bx-faq__bar bx-faq__bar--vertical" />
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="bx-faq__panel"
                // Hidden from assistive tech and out of the tab order while
                // collapsed: the row is still in the layout at zero height, so
                // without this a screen reader would read every answer.
                inert={!isOpen}
              >
                <div className="bx-faq__panel-inner">
                  <p className="bx-faq__answer">{faq.answer}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
