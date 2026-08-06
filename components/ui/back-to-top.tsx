"use client";

import { scrollToTop } from "@/lib/lenis";

/**
 * Fixed bottom-right control that returns the page to the top.
 *
 * Always present rather than appearing past a scroll threshold, so it reads as
 * a permanent affordance rather than something that comes and goes.
 *
 * The scroll goes through Lenis rather than `window.scrollTo`, which would
 * fight it while it owns the scroll position. With reduced motion Lenis never
 * starts and the helper falls back to an instant jump, which is the wanted
 * behaviour there anyway.
 */
export function BackToTop() {
  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="back-to-top"
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
