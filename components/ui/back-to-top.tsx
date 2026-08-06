"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToTop } from "@/lib/lenis";

/**
 * Fixed bottom-right control that returns the page to the top, with an
 * animated water fill for a background.
 *
 * The level tracks page scroll and eases toward it, so it settles a beat after
 * scrolling stops. The surface is two wave layers that slide continuously, and
 * scrolling quickly slops them higher before they calm again.
 *
 * Everything is written straight to `style.transform` from one rAF loop —
 * never through React state, which would re-render the tree on every frame —
 * and only transform is touched, so no frame triggers layout.
 */

/** Per-frame approach rate for the water level. Lower = more lag. */
const LEVEL_EASING = 0.08;

/** Per-frame approach rate for the wave height. */
const SLOSH_EASING = 0.12;

/** Smoothing on raw scroll delta before it drives the slosh. */
const VELOCITY_EASING = 0.25;

/** Scroll px per frame that produces full slosh. */
const VELOCITY_AT_FULL_SLOSH = 26;

/** Extra wave height at full slosh, as a multiple of the calm baseline. */
const MAX_SLOSH = 1.5;

/** One wave tile, repeated twice across the SVG so a -50% slide is seamless. */
const WAVE_PATH =
  "M0,10 C16.7,0 33.3,0 50,10 C66.7,20 83.3,20 100,10 " +
  "C116.7,0 133.3,0 150,10 C166.7,20 183.3,20 200,10 L200,24 L0,24 Z";

function WaveLayer({ className }: { className: string }) {
  return (
    <span className={className}>
      <span className="btt-wave__slide">
        <svg
          viewBox="0 0 200 24"
          preserveAspectRatio="none"
          className="btt-wave__svg"
          aria-hidden
        >
          <path d={WAVE_PATH} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const waterRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLSpanElement>(null);
  const frontRef = useRef<HTMLSpanElement>(null);

  // Show/hide keyed to the hero, unchanged.
  useEffect(() => {
    const hero = document.getElementById("top");

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

  useEffect(() => {
    const water = waterRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    if (!water || !back || !front) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

    // The water block is twice the button's height and parked fully below it,
    // so travelling half its own height raises the surface from the bottom
    // edge to the top.
    const applyLevel = (value: number) =>
      `translate3d(0, ${-value * 50}%, 0)`;

    if (reduced) {
      // Flat surface, no easing: the level is set once and on each scroll,
      // straight to its target.
      const set = () => {
        water.style.transform = applyLevel(readProgress());
      };
      set();
      window.addEventListener("scroll", set, { passive: true });
      window.addEventListener("resize", set, { passive: true });
      return () => {
        window.removeEventListener("scroll", set);
        window.removeEventListener("resize", set);
      };
    }

    let level = 0;
    let velocity = 0;
    let slosh = 1;
    let lastY = window.scrollY;
    let frame = 0;

    const tick = () => {
      const y = window.scrollY;
      const delta = Math.abs(y - lastY);
      lastY = y;

      // Smooth the raw per-frame delta first, or a single fast wheel tick
      // spikes the waves and drops them again within a few frames.
      velocity += (delta - velocity) * VELOCITY_EASING;

      // The ratio is clamped to 1 before scaling, not to MAX_SLOSH — clamping
      // afterwards would let a fast scroll reach 1 + MAX_SLOSH² and throw the
      // crest well past the top of the button.
      const ratio = Math.min(1, velocity / VELOCITY_AT_FULL_SLOSH);
      const targetSlosh = 1 + ratio * MAX_SLOSH;
      slosh += (targetSlosh - slosh) * SLOSH_EASING;

      const target = readProgress();
      level += (target - level) * LEVEL_EASING;
      if (Math.abs(target - level) < 0.0005) level = target;

      water.style.transform = applyLevel(level);

      // Amplitude is scaleY on the layer that holds the sliding tile, never on
      // the tile itself — that one carries the CSS slide animation, and a
      // transform written here would overwrite it every frame.
      back.style.transform = `scaleY(${slosh * 1.25})`;
      front.style.transform = `scaleY(${slosh})`;

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="back-to-top"
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Back to top"
      title="Back to top"
    >
      <span ref={waterRef} className="btt-water" aria-hidden>
        <span ref={backRef} className="btt-wave btt-wave--back">
          <WaveLayer className="btt-wave__body" />
        </span>
        <span ref={frontRef} className="btt-wave btt-wave--front">
          <WaveLayer className="btt-wave__body" />
        </span>
      </span>

      <svg viewBox="0 0 24 24" fill="none" className="btt-icon size-4" aria-hidden>
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
