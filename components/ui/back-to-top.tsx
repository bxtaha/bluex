"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToTop } from "@/lib/lenis";

/**
 * Fixed bottom-right control that returns the page to the top.
 *
 * It doubles as a progress vessel: the water inside rises as the page is
 * scrolled down and drains as it is scrolled back up, so the control shows how
 * far through the page you are as well as offering the way back.
 *
 * Hidden while the hero is on screen, where it would point at where the reader
 * already is. Keyed to the hero element rather than a pixel threshold: the hero
 * is `min-h-dvh` and grows with its content, so any fixed number would be wrong
 * on some viewport.
 *
 * The scroll goes through Lenis rather than `window.scrollTo`, which would
 * fight it while it owns the scroll position. With reduced motion Lenis never
 * starts and the helper falls back to an instant jump, which is wanted there.
 */

/** Fraction of the remaining distance covered per frame. Lower = heavier. */
const EASING = 0.1;

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const waterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = document.getElementById("top");

    // No hero on the page: nothing to hide behind, so just show it. Deferred
    // because a synchronous setState in an effect body cascades a render.
    if (!hero) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const water = waterRef.current;
    if (!water) return;

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
      if (Math.abs(target - current) < 0.0005) current = target;

      // The water block is twice the button's height and starts fully below it,
      // so travelling half its own height raises the surface from the bottom
      // edge to the top.
      water.style.transform = `translate3d(0, ${-current * 50}%, 0)`;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="back-to-top"
      data-visible={visible}
      // Out of the tab order and hidden from assistive tech while off screen,
      // rather than a focus stop pointing at something the user cannot see.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Back to top"
      title="Back to top"
    >
      <span ref={waterRef} className="back-to-top__water" aria-hidden>
        <span className="back-to-top__wave" />
        <span className="back-to-top__wave back-to-top__wave--alt" />
      </span>

      <svg viewBox="0 0 24 24" fill="none" className="back-to-top__icon size-4" aria-hidden>
        <path
          d="M12 19V5m0 0-6 6m6-6 6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
