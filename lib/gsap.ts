"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Single registration point. Registering the same plugin from several modules
// is harmless but makes it easy to lose track of what is actually loaded, and
// GSAP silently no-ops animations whose plugin was never registered.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };

/** Breakpoint at which the Services section switches from a snap carousel to a
 *  pinned horizontal scrub. Shared so the CSS and the ScrollTrigger agree. */
export const PIN_BREAKPOINT = "(min-width: 768px)";

/** Standard matchMedia conditions for every timeline in the app. */
export const MOTION_QUERIES = {
  desktop: `${PIN_BREAKPOINT} and (prefers-reduced-motion: no-preference)`,
  mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;
