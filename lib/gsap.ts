"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Single registration point. Registering the same plugin from several modules
// is harmless but makes it easy to lose track of what is actually loaded, and
// GSAP silently no-ops animations whose plugin was never registered.
//
// GSAP's SplitText used to be registered here and was never called: every
// `<SplitText>` on the page is components/motion/split-text, which splits at
// render and animates in CSS. The plugin was being downloaded and registered
// on every visit to do nothing.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Mobile browsers fire a resize when the address bar collapses, which would
  // refresh every ScrollTrigger and jolt the pinned section mid-scroll. The
  // viewport has not really changed, so the event is ignored.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

/** Standard matchMedia conditions for every timeline in the app. */
export const MOTION_QUERIES = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;
