"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { observeOnce } from "@/lib/reveal";
import { cn } from "@/lib/utils";

/**
 * Text whose characters roll over on hover: each one lifts out behind a
 * clipping edge while an identical copy rises into its place.
 *
 * Built on the same word masks as `SplitText`, so a heading gets both — the
 * words rise once on entrance, and the characters roll on hover afterwards.
 * The two never fight because they animate different elements: the entrance
 * moves the word, the roll moves the characters inside it.
 *
 * The stagger runs on CSS transitions rather than an animation library. It is
 * a transform and a delay per character, which is what `transition-delay`
 * already does, and the delay index is passed the same way every other
 * staggered thing on this page passes it. Only that index is set here — the
 * 35ms it is multiplied by lives with the rest of the timing, in globals.css.
 *
 * Splitting text into spans hides it from assistive technology as a sentence —
 * screen readers announce a pile of fragments. The whole string is therefore
 * exposed once via `aria-label` and every piece is marked `aria-hidden`, so the
 * heading still reads as one phrase.
 *
 * That handles screen readers and does nothing for crawlers, which was a real
 * bug. The roll needs two copies of every character — the one leaving and the
 * one arriving — and rendering both as elements put both in the HTML. A
 * text-based crawler concatenates text nodes and ignores `aria-hidden`
 * entirely, so the `<h1>` of the home page read
 * `"EveryEvery leadlead calledcalled backback inin fivefive minutes.minutes."`
 * to every SEO tool that looked at it.
 *
 * So the arriving copy is not an element any more. Each character carries its
 * own glyph in `data-char` and the replacement is drawn by a `::after` reading
 * `content: attr(data-char)` (see `.bx-roll__char` in globals.css). Generated
 * content is not in the DOM: it renders, it animates, and `textContent` never
 * sees it. One copy in the markup, two on screen.
 */

export function TextRoll({
  children,
  as: Tag = "h1",
  className,
  /** Delay before the entrance's first word, in ms. */
  delay = 0,
  /**
   * Roll outward from the middle of the string rather than left to right. The
   * index is taken across the whole phrase, not per word, so the wave crosses
   * word boundaries as one movement.
   */
  center = true,
}: {
  children: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  center?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeOnce(el, () => el.setAttribute("data-revealed", "true"));
  }, []);

  // Split on single spaces rather than /\s+/ so the offsets below still match
  // the original string's indices.
  const words = children.split(" ").filter(Boolean);
  const middle = (children.length - 1) / 2;

  // Where each word starts in the original phrase. Derived rather than carried
  // in a running total: a headline is a handful of words, and the quadratic
  // cost of that is nothing next to a counter that mutates mid-render.
  const starts = words.map((_, i) =>
    words.slice(0, i).reduce((n, w) => n + w.length + 1, 0),
  );

  return React.createElement(
    Tag,
    {
      ref,
      "aria-label": children,
      className: cn("bx-split bx-rolltext", className),
      style: { "--split-delay": `${delay}ms` } as React.CSSProperties,
    },
    words.map((word, i) => {
      const start = starts[i];
      const chars = Array.from(word);

      return (
        <React.Fragment key={`${word}-${i}`}>
          {i > 0 ? " " : null}
          <span
            className="bx-word"
            aria-hidden
            style={{ "--word-i": i } as React.CSSProperties}
          >
            <span className="bx-word__inner">
              {chars.map((char, j) => {
                const index = start + j;
                return (
                  <span
                    key={j}
                    className="bx-roll__char"
                    // The replacement glyph. Read back by `content: attr()`
                    // rather than rendered, so it costs nothing in the HTML.
                    data-char={char}
                    style={
                      {
                        "--roll-i": center
                          ? Math.abs(index - middle)
                          : index,
                      } as React.CSSProperties
                    }
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          </span>
        </React.Fragment>
      );
    }),
  );
}
