"use client";

import { useEffect, useRef, type RefObject } from "react";
import { BellNotify } from "@/components/ui/bell-notify";

/**
 * The bell as a scroll-progress thumb for one section.
 *
 * Progress is measured from the target section's own bounding box, never from
 * document scroll position, so the indicator is unaffected by anything above
 * or below it on the page and needs no knowledge of the rest of the document.
 *
 * The position is eased toward its target rather than bound to raw scroll.
 * Binding 1:1 makes the bell twitch on every wheel notch and, under Lenis's
 * smoothed scrolling, produces visible stepping; a per-frame approach keeps it
 * gliding and settles naturally when scrolling stops.
 */

/** Fraction of remaining distance covered per frame. Lower = heavier. */
const EASING = 0.09;

/** Below this, the bell has arrived and the loop can idle. */
const SETTLE_EPSILON = 0.0002;

export function BellScrollIndicator({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const rail = railRef.current;
    const bell = bellRef.current;
    if (!section || !rail || !bell) return;

    // Hidden outright with reduced motion: the whole point of the element is
    // movement tied to scrolling, which is the exact thing being opted out of.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let target = 0;
    let current = 0;
    let frame = 0;
    let running = false;
    let travelPx = 0;

    const measureRail = () => {
      // The bell is translated within the rail, so its own travel is the rail
      // height minus the bell it has to fit inside.
      travelPx = Math.max(0, rail.clientHeight - bell.offsetHeight);
    };

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;

      if (rect.height > viewport) {
        // Tall section: progress is how far through it the viewport has moved.
        const span = rect.height - viewport;
        return Math.min(1, Math.max(0, -rect.top / span));
      }

      // Shorter than the viewport, so it can never be "scrolled through".
      // Progress runs from the moment it enters to the moment it leaves.
      const span = viewport + rect.height;
      return Math.min(1, Math.max(0, (viewport - rect.top) / span));
    };

    const tick = () => {
      target = readProgress();
      current += (target - current) * EASING;

      const delta = Math.abs(target - current);
      if (delta < SETTLE_EPSILON) current = target;

      bell.style.transform = `translate3d(0, ${current * travelPx}px, 0)`;

      // Keep animating while the section is on screen: the target moves with
      // scroll, so idling on `delta` alone would stall mid-travel.
      if (running) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      measureRail();
      rail.dataset.active = "true";
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
      rail.dataset.active = "false";
    };

    // The rail exists only while its section does. Outside it there is nothing
    // to indicate, and the loop must not keep running down the rest of the page.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    visibility.observe(section);

    const resizeObserver = new ResizeObserver(measureRail);
    resizeObserver.observe(rail);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (section.getBoundingClientRect().bottom > 0) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(frame);
    };
  }, [sectionRef]);

  return (
    <div ref={railRef} className="bell-rail" data-active="false" aria-hidden>
      <span className="bell-rail__line" />
      <div ref={bellRef} className="bell-rail__thumb">
        <BellNotify size={150} interactive={false} disableToggle />
      </div>
    </div>
  );
}
