"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-media-query";
import { onExtentChange, scrollProgress } from "@/lib/scroll-extent";

/**
 * Whole-page scroll progress, pinned to the bottom of the viewport.
 *
 * Styled to match the rail inside the how-it-works section — a hairline track
 * with a solid electric fill growing from the left — so the page-level and
 * section-level progress read as the same idea at two scales.
 *
 * The fill is eased toward its target each frame rather than bound to raw
 * scroll, so it glides instead of stepping with every wheel notch.
 */

/** Fraction of the remaining distance covered per frame. Lower = heavier. */
const EASING = 0.12;

/** Close enough to the target that another frame would not change a pixel. */
const SETTLED = 0.0002;

export function ScrollProgress() {
  const reduced = useReducedMotion();
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    const write = (value: number) => {
      fill.style.transform = `scaleX(${value})`;
    };

    // No easing to run, so no frames to schedule — the same shape the nav dock
    // uses under this preference.
    if (reduced) {
      const onScroll = () => write(scrollProgress());
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      const unsubscribe = onExtentChange(onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        unsubscribe();
      };
    }

    let current = scrollProgress();
    let frame = 0;
    let running = false;
    write(current);

    /**
     * Runs only while the fill still has distance to cover.
     *
     * This used to re-arm unconditionally, which meant one animation frame
     * every 16ms for the entire life of the page — including at rest, where
     * every frame wrote the identical `scaleX`, and including under reduced
     * motion, where there was nothing to ease. It is the last always-on rAF
     * loop on the page; the nav dock and the back-to-top button had both
     * already been taught to stop, and this is the same pattern.
     */
    const tick = () => {
      const target = scrollProgress();
      current += (target - current) * EASING;

      if (Math.abs(target - current) < SETTLED) {
        current = target;
        write(current);
        running = false;
        return;
      }

      write(current);
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", wake, { passive: true });
    // The denominator can change without the reader scrolling — a resize, a
    // font swapping, a pin spacer appearing. Now that the loop stops when
    // settled, nothing else would repaint the bar.
    const unsubscribe = onExtentChange(wake);

    return () => {
      window.removeEventListener("scroll", wake);
      unsubscribe();
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div className="scroll-progress" aria-hidden>
      <span ref={fillRef} className="scroll-progress__fill" />
    </div>
  );
}
