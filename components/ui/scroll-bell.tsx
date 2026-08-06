"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { BellNotify } from "@/components/ui/bell-notify";
import { useReducedMotion } from "@/lib/use-media-query";

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

/**
 * Fraction of the remaining distance covered in one 60Hz frame. Lower =
 * heavier. Converted to the real elapsed time each frame, so a 120Hz display
 * does not arrive twice as fast as a 60Hz one.
 */
const EASING = 0.09;

/** The frame length `EASING` is expressed against, in ms. */
const FRAME_MS = 1000 / 60;

/** Longest step the smoothing will honour, in ms. Covers a backgrounded tab. */
const MAX_STEP_MS = 64;

/**
 * Progress is not mapped straight onto travel. The bell descends into place
 * over the first slice and then stays: once it has arrived it never leaves,
 * so reaching the bottom of the section cannot take it away.
 *
 * It still comes and goes, because the mapping is a pure function of scroll
 * position rather than a one-shot trigger — scrolling back up runs the
 * descent in reverse and lifts it out again.
 *
 * 0.85 of one screen of scrolling, so the bell settles just before the
 * section's top reaches the top of the viewport.
 */
const ENTER_END = 0.85;

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
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const wrap = wrapRef.current;
    if (!section || !wrap) return;

    // Movement tied to scrolling is the whole point of the element, so with
    // reduced motion it simply rests in place rather than animating.
    if (reduced) {
      wrap.style.opacity = "1";
      wrap.style.transform = "none";
      return;
    }

    let current = 0;
    let frame = 0;
    let running = false;

    /**
     * How far the section's leading edge has come from the bottom of the
     * viewport to the top of it. One formula, and a denominator that is always
     * exactly one screen.
     *
     * This used to branch on whether the section was taller than the viewport,
     * with a different denominator on each side. Crossing that boundary moved
     * progress discontinuously: on a 360x790 phone the closing section is 788px
     * tall, so a URL bar collapsing by 4px flipped progress from 0.25 to 0 and
     * the bell vanished mid-scroll. The tall branch was also degenerate near
     * the boundary — its denominator is `height - viewport`, which was 2px
     * there, so the entire descent happened within two pixels of scrolling.
     */
    const readProgress = () => {
      const viewport = window.innerHeight;
      if (viewport <= 0) return 0;
      const { top } = section.getBoundingClientRect();
      return Math.min(1, Math.max(0, (viewport - top) / viewport));
    };

    let last = 0;

    const tick = (now: number) => {
      // Scaled by real elapsed time. A fixed fraction per frame means a 120Hz
      // display takes half as long to arrive as a 60Hz one — the same easing
      // constant, twice the speed. Raising it to the number of 60Hz frames
      // that actually passed makes the curve the same wherever it runs.
      const step = Math.min(MAX_STEP_MS, now - last);
      last = now;
      const rate = 1 - Math.pow(1 - EASING, step / FRAME_MS);

      const target = readProgress();
      current += (target - current) * rate;
      if (Math.abs(target - current) < 0.0002) current = target;

      const { offset, opacity } = mapPosition(current);
      wrap.style.transform = `translate3d(0, ${offset * 100}%, 0)`;
      wrap.style.opacity = String(opacity);

      if (running) frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
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
  }, [sectionRef, reduced]);

  return (
    <div ref={wrapRef} className={`scroll-bell ${className}`}>
      {/* Interactive, as on bluex_v2: clicking the bell turns its light on and
          off. It was made inert only while it served as a decorative rail
          thumb, which it no longer is. */}
      {/* `size` is only the fallback: the real scale comes from `--bell-size`
          on .scroll-bell, which shrinks the bell on phones. */}
      <BellNotify size={300} action={action} />
    </div>
  );
}
