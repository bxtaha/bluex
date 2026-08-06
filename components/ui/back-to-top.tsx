"use client";

import { useEffect, useState } from "react";
import { scrollToTop } from "@/lib/lenis";

/**
 * Fixed bottom-right control that returns the page to the top.
 *
 * Hidden while the hero is on screen, where it would point at where the reader
 * already is. Keyed to the hero element rather than a pixel threshold: the hero
 * is `min-h-dvh` and grows with its content, so any fixed number would be wrong
 * on some viewport.
 *
 * The scroll goes through Lenis rather than `window.scrollTo`, which would
 * fight it while it owns the scroll position. With reduced motion Lenis never
 * starts and the helper falls back to an instant jump, which is the wanted
 * behaviour there anyway.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

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
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
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
