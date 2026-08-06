"use client";

import { useEffect, useRef } from "react";

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

export function ScrollProgress() {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current = 0;
    let frame = 0;

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

    const tick = () => {
      const target = readProgress();
      current = reduced ? target : current + (target - current) * EASING;
      if (Math.abs(target - current) < 0.0002) current = target;

      fill.style.transform = `scaleX(${current})`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="scroll-progress" aria-hidden>
      <span ref={fillRef} className="scroll-progress__fill" />
    </div>
  );
}
