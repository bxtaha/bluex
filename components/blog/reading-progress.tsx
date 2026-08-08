"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-media-query";

/**
 * A hairline that fills across the top of the viewport as the post is read.
 *
 * Deliberately not the site's `ScrollProgress`, which is pinned to the bottom
 * and measures the whole document. This measures the *article* — progress
 * through the thing being read, not through a page that also contains a header,
 * three related posts and a footer. On a long post with a short tail the two
 * differ by a good fraction of the bar, and the one that matters to a reader is
 * this one.
 *
 * Written straight to `style.transform` inside a rAF loop, never through React
 * state: this updates on every frame of every scroll, and a re-render per frame
 * is how a reading indicator becomes the reason a page feels slow.
 */

/** Fraction of the remaining distance covered per frame. Lower = heavier. */
const EASING = 0.14;

export function ReadingProgress({
  targetId,
}: {
  /** The element to measure. Usually the `<article>`. */
  targetId: string;
}) {
  const reduced = useReducedMotion();
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    let current = 0;
    let frame = 0;

    const read = () => {
      const target = document.getElementById(targetId);
      if (!target) return 0;

      const top = target.offsetTop;
      // The last screenful of the article is already visible when its bottom
      // reaches the bottom of the viewport, so the readable distance ends
      // there. Measuring to the article's end instead leaves the bar short of
      // full at the last word.
      const distance = target.offsetHeight - window.innerHeight;
      if (distance <= 0) return window.scrollY > top ? 1 : 0;

      return Math.min(1, Math.max(0, (window.scrollY - top) / distance));
    };

    const tick = () => {
      const target = read();
      current = reduced ? target : current + (target - current) * EASING;
      if (Math.abs(target - current) < 0.0002) current = target;

      fill.style.transform = `scaleX(${current})`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, targetId]);

  return (
    <div className="bx-reading-progress" aria-hidden>
      <span ref={fillRef} className="bx-reading-progress__fill" />
    </div>
  );
}
