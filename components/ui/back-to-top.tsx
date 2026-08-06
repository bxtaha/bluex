"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToTop } from "@/lib/lenis";

/**
 * Appears once the page has been scrolled past a viewport height and returns to
 * the top when pressed.
 *
 * The scroll goes through Lenis rather than `window.scrollTo`, which would
 * fight it while it owns the scroll position. With reduced motion Lenis never
 * starts and the helper falls back to an instant jump, which is the wanted
 * behaviour there anyway.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const evaluate = () => {
      frameRef.current = 0;
      const past = window.scrollY > window.innerHeight;
      setVisible((prev) => (prev === past ? prev : past));
    };

    const schedule = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(evaluate);
    };

    // Deferred rather than called inline: a synchronous setState in an effect
    // body triggers a cascading render.
    schedule();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="back-to-top"
      data-visible={visible}
      // Hidden from the tab order and from assistive tech while off screen, so
      // it is never a focus stop pointing at something the user cannot see.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Back to top"
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
