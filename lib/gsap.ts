"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Single registration point. Registering the same plugin from several modules
// is harmless but makes it easy to lose track of what is actually loaded, and
// GSAP silently no-ops animations whose plugin was never registered.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // Mobile browsers fire a resize when the address bar collapses, which would
  // refresh every ScrollTrigger and jolt the pinned section mid-scroll. The
  // viewport has not really changed, so the event is ignored.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, SplitText };

/** Standard matchMedia conditions for every timeline in the app. */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;
