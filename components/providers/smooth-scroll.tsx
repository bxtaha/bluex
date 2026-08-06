"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setLenis } from "@/lib/lenis";

/** Clearance for the fixed header so anchored sections aren't tucked under it. */
const HEADER_OFFSET = 88;

/**
 * Lenis and ScrollTrigger both want to own the scroll position. Left alone they
 * run on separate clocks and drift, which shows up as pinned sections lagging a
 * frame behind the content. Driving Lenis from GSAP's ticker puts both on one
 * clock; `lagSmoothing(0)` stops GSAP from trying to "catch up" after a slow
 * frame, which would otherwise jump the scrub.
 *
 * Renders nothing — it only installs the loop.
 */
export function SmoothScroll() {
  useEffect(() => {
    // Honour the OS setting: momentum scrolling is itself a motion effect, and
    // some people find it nauseating. Native scroll is the accessible default.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch devices already have good native momentum; overriding it makes
      // the page feel laggy and breaks the browser's own overscroll handling.
      syncTouch: false,
    });

    // Published so programmatic scrolling elsewhere routes through this
    // instance rather than fighting it with a native call.
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Lenis owns the scroll position, so the browser's native hash jump lands
    // at a location Lenis does not know about and gets immediately overridden.
    // Anchor clicks are intercepted and handed to Lenis instead.
    const onAnchorClick = (event: MouseEvent) => {
      // Let modified clicks (new tab, download, middle-click) behave natively.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href?.startsWith("#") || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -HEADER_OFFSET });
      // Keep the URL in step so the link is still shareable and the back
      // button behaves, without triggering the native jump we just prevented.
      window.history.pushState(null, "", href);
    };

    document.addEventListener("click", onAnchorClick);

    return () => {
      setLenis(null);
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // restore GSAP's default
      lenis.destroy();
    };
  }, []);

  return null;
}
