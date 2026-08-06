"use client";

import { useEffect, useRef } from "react";

/**
 * Vertical page-scroll progress rail on the left edge.
 *
 * The thumb's position is eased toward its target each frame rather than bound
 * to raw scroll, so it glides instead of stepping with every wheel notch.
 *
 * Position and rotation live on two nested elements on purpose: the outer one
 * is written every frame with no transition, the inner one carries the
 * transitioned rotation. On a single element a transition would apply to the
 * per-frame translate too, and the thumb would lag behind its own target.
 */

/** Fraction of the remaining distance covered per frame. Lower = heavier. */
const EASING = 0.12;

/**
 * Pixels of travel before the direction flips. Without a deadzone, sub-pixel
 * scroll noise and the tail of Lenis's own easing flip the arrow repeatedly
 * while the page is effectively still.
 */
const DIRECTION_THRESHOLD = 6;

export function ScrollProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const thumb = thumbRef.current;
    if (!root || !fill || !thumb) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current = 0;
    let frame = 0;
    let lastY = window.scrollY;
    let travel = 0;

    const measure = () => {
      travel = Math.max(0, root.clientHeight - thumb.offsetHeight);
    };

    const readProgress = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

    const tick = () => {
      const y = window.scrollY;

      if (y - lastY > DIRECTION_THRESHOLD) {
        thumb.dataset.direction = "down";
        lastY = y;
      } else if (lastY - y > DIRECTION_THRESHOLD) {
        thumb.dataset.direction = "up";
        lastY = y;
      }

      const target = readProgress();
      current = reduced ? target : current + (target - current) * EASING;
      if (Math.abs(target - current) < 0.0002) current = target;

      fill.style.transform = `scaleY(${current})`;
      thumb.style.transform = `translate3d(0, ${current * travel}px, 0)`;

      frame = requestAnimationFrame(tick);
    };

    measure();
    frame = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={rootRef} className="scroll-progress" aria-hidden>
      <span className="scroll-progress__track" />
      <span ref={fillRef} className="scroll-progress__fill" />
      <span ref={thumbRef} className="scroll-progress__thumb" data-direction="down">
        <span className="scroll-progress__icon">
          <svg viewBox="0 0 24 24" fill="none" className="size-3">
            <path
              d="M12 5v14m0 0-6-6m6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </div>
  );
}
