"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { BellNotify } from "@/components/ui/bell-notify";

/**
 * The bell, centred, entering and leaving on scroll through one section.
 *
 * Progress is read from the target section's own bounding box, never document
 * scroll, so nothing above or below it on the page can shift the reading.
 *
 * Position is eased toward its target each frame rather than bound to raw
 * scroll. Binding 1:1 twitches on every wheel notch and steps visibly under
 * Lenis's smoothing; chasing the target keeps it gliding and lets it settle.
 */

/** Fraction of the remaining distance covered per frame. Lower = heavier. */
const EASING = 0.09;

/**
 * Progress is not mapped straight onto travel. The bell descends into place
 * over the first slice and then stays: once it has arrived it never leaves,
 * so reaching the bottom of the section cannot take it away.
 *
 * It still comes and goes, because the mapping is a pure function of scroll
 * position rather than a one-shot trigger — scrolling back up runs the
 * descent in reverse and lifts it out again.
 */
const ENTER_END = 0.36;

/** Distance travelled above the resting position, as a fraction of bell height. */
const TRAVEL = 1.45;

function mapPosition(p: number) {
  if (p >= ENTER_END) return { offset: 0, opacity: 1 };
  const t = p / ENTER_END;
  return { offset: -TRAVEL * (1 - t), opacity: Math.min(1, t / 0.4) };
}

export function ScrollBell({
  sectionRef,
  action,
  className = "",
}: {
  sectionRef: RefObject<HTMLElement | null>;
  action?: ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const wrap = wrapRef.current;
    if (!section || !wrap) return;

    // Movement tied to scrolling is the whole point of the element, so with
    // reduced motion it simply rests in place rather than animating.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      wrap.style.opacity = "1";
      wrap.style.transform = "none";
      return;
    }

    let current = 0;
    let frame = 0;
    let running = false;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;

      if (rect.height > viewport) {
        // Tall section: how far the viewport has travelled through it.
        return Math.min(1, Math.max(0, -rect.top / (rect.height - viewport)));
      }
      // Shorter than the viewport, so it can never be scrolled "through" —
      // progress runs from the moment it enters to the moment it leaves.
      return Math.min(
        1,
        Math.max(0, (viewport - rect.top) / (viewport + rect.height)),
      );
    };

    const tick = () => {
      const target = readProgress();
      current += (target - current) * EASING;
      if (Math.abs(target - current) < 0.0002) current = target;

      const { offset, opacity } = mapPosition(current);
      wrap.style.transform = `translate3d(0, ${offset * 100}%, 0)`;
      wrap.style.opacity = String(opacity);

      if (running) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    // Scoped to the section: outside it there is nothing to track, and the
    // loop must not keep running down the rest of the page.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    visibility.observe(section);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (section.getBoundingClientRect().bottom > 0) start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(frame);
    };
  }, [sectionRef]);

  return (
    <div ref={wrapRef} className={`scroll-bell ${className}`}>
      <BellNotify size={300} action={action} disableToggle interactive={false} />
    </div>
  );
}
