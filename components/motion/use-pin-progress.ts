"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Maps scroll through a tall container onto a 0→1 progress value and an active
 * step index, for a section that stays put while the page scrolls past it.
 *
 * Pinning here is CSS `position: sticky`, not a JS-driven transform. Sticky is
 * handled on the compositor, cannot desync from the scroll position, and needs
 * no cleanup — a JS pin has to fight for every frame and leaves the layout
 * broken if it throws.
 *
 * The scroll handler is throttled to one measurement per frame and registered
 * passive, so it can never block scrolling.
 */
export function usePinProgress(stepCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || stepCount < 1) return;

    // With reduced motion the steps are all shown expanded and nothing tracks
    // scroll, so there is no work to schedule.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // Distance the container can travel before its bottom reaches the
      // viewport bottom — the span over which the sticky child is pinned.
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;

      const ratio = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(ratio);

      // `min` guards the exact-1.0 case, which would otherwise index past the
      // last step.
      const next = Math.min(stepCount - 1, Math.floor(ratio * stepCount));
      setActiveStep((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    // Deferred rather than called inline: a synchronous setState in an effect
    // body triggers a cascading render.
    schedule();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [stepCount]);

  return { containerRef, activeStep, progress };
}
