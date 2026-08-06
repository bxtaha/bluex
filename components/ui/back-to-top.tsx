"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scrollToTop } from "@/lib/lenis";

/**
 * Fixed bottom-right control that returns the page to the top, with an
 * animated water fill for a background and droplets that spill out of it.
 *
 * The level tracks page scroll and eases toward it, so it settles a beat after
 * scrolling stops. The surface is two wave layers sliding on a seamless tile,
 * and scroll velocity slops them higher before they calm again.
 *
 * Everything runs off one rAF loop and is written straight to `style.transform`
 * — never through React state, which would re-render on every frame — and only
 * transform and opacity are touched, so no frame triggers layout.
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

// ── Droplets ────────────────────────────────────────────────────────────────

/** Fixed pool. Nodes are made once and reused; emission never touches the DOM. */
const POOL_SIZE = 18;

/** Scroll px per frame below which the surface is calm and nothing is thrown. */
const EMIT_THRESHOLD = 7;

/** Droplets per frame per unit of velocity above the threshold. */
const EMIT_RATE = 0.05;

/** Downward acceleration, px per frame squared. */
const GRAVITY = 0.34;

/** Frames of squash before a droplet fades out. */
const SQUASH_FRAMES = 7;

/**
 * Horizontal bounds in button-local px. Kept tight on the right because the
 * button sits within ~16px of the viewport edge at the smallest offset, and a
 * fixed element crossing that edge can raise a scrollbar.
 */
const X_MIN = -32;
const X_MAX = 56;

/**
 * Where a droplet lands, in button-local px below the top edge. Without this
 * they keep accelerating for their whole life and are still alive hundreds of
 * pixels below the viewport — invisible, but never reading as having landed.
 */
const LANDING_OFFSET = 16;

type Droplet = {
  el: HTMLSpanElement;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  life: number;
  max: number;
};

function WaveLayer() {
  return (
    <span className="btt-wave__body">
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
  const splashRef = useRef<HTMLSpanElement>(null);
  /** Set by the effect; called on click for the one-off burst. */
  const burstRef = useRef<(() => void) | null>(null);

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
    const splash = splashRef.current;
    if (!water || !back || !front || !splash) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

    // The water block is twice the button's height and parked fully below it,
    // so travelling half its own height raises the surface from the bottom
    // edge to the top.
    const applyLevel = (value: number) => `translate3d(0, ${-value * 50}%, 0)`;

    if (reduced) {
      // Flat surface, no droplets, no loop: the level is set straight to its
      // target on each scroll.
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

    // ── Pool ────────────────────────────────────────────────────────────────
    const pool: Droplet[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = document.createElement("span");
      el.className = "btt-drop";
      el.style.opacity = "0";
      splash.appendChild(el);
      pool.push({
        el,
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        vr: 0,
        size: 3,
        life: 0,
        max: 0,
      });
    }

    const width = splash.clientWidth || 44;
    const height = splash.clientHeight || 44;
    const landingY = height + LANDING_OFFSET;

    let level = 0;

    const spawn = (strong: boolean) => {
      const drop = pool.find((d) => !d.alive);
      if (!drop) return; // pool exhausted — drop the emission rather than grow

      // Along the crest, wherever the surface currently sits.
      const surfaceY = height * (1 - level);
      drop.x = width * (0.2 + Math.random() * 0.6);
      drop.y = surfaceY;

      const power = strong ? 1 : 0.55;
      drop.vx = (Math.random() - 0.5) * (strong ? 5 : 2) ;
      drop.vy = -(1.8 + Math.random() * 2.6) * (strong ? 1.55 : power + 0.45);
      drop.rot = Math.random() * 360;
      drop.vr = (Math.random() - 0.5) * 14;
      drop.size = 2 + Math.random() * (strong ? 4 : 3);
      drop.life = 0;
      drop.max = 42 + Math.random() * 30;
      drop.alive = true;

      drop.el.style.width = `${drop.size}px`;
      drop.el.style.height = `${drop.size}px`;
    };

    const emit = (count: number, strong: boolean) => {
      for (let i = 0; i < count; i++) spawn(strong);
    };

    burstRef.current = () => emit(10, true);

    // ── Loop ────────────────────────────────────────────────────────────────
    let velocity = 0;
    let slosh = 1;
    let lastY = window.scrollY;
    let lastDirection = 0;
    let emitCredit = 0;
    let frame = 0;

    const tick = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const speed = Math.abs(delta);
      lastY = y;

      // Smooth the raw per-frame delta first, or a single fast wheel tick
      // spikes the waves and drops them again within a few frames.
      velocity += (speed - velocity) * VELOCITY_EASING;

      // The ratio is clamped to 1 before scaling, not to MAX_SLOSH — clamping
      // afterwards would let a fast scroll reach 1 + MAX_SLOSH² and throw the
      // crest well past the top of the button.
      const ratio = Math.min(1, velocity / VELOCITY_AT_FULL_SLOSH);
      slosh += (1 + ratio * MAX_SLOSH - slosh) * SLOSH_EASING;

      const target = readProgress();
      level += (target - level) * LEVEL_EASING;
      if (Math.abs(target - level) < 0.0005) level = target;

      water.style.transform = applyLevel(level);

      // Amplitude is scaleY on the layer that holds the sliding tile, never on
      // the tile itself — that one carries the CSS slide animation, and a
      // transform written here would overwrite it every frame.
      back.style.transform = `scaleY(${slosh * 1.25})`;
      front.style.transform = `scaleY(${slosh})`;

      // Emission rate rides velocity, accumulated as fractional credit so slow
      // scrolling produces the occasional drop rather than none at all.
      if (velocity > EMIT_THRESHOLD) {
        emitCredit += (velocity - EMIT_THRESHOLD) * EMIT_RATE;
        while (emitCredit >= 1) {
          spawn(false);
          emitCredit -= 1;
        }
      } else {
        emitCredit = 0;
      }

      // A reversal disturbs the surface even at modest speed.
      const direction = Math.sign(delta);
      if (
        direction !== 0 &&
        lastDirection !== 0 &&
        direction !== lastDirection &&
        velocity > EMIT_THRESHOLD * 0.6
      ) {
        emit(3, false);
      }
      if (direction !== 0) lastDirection = direction;

      for (const drop of pool) {
        if (!drop.alive) continue;

        drop.vy += GRAVITY;
        drop.x += drop.vx;
        drop.y += drop.vy;
        drop.rot += drop.vr;
        drop.life += 1;

        if (drop.x < X_MIN || drop.x > X_MAX) {
          drop.vx *= -0.5;
          drop.x = Math.min(X_MAX, Math.max(X_MIN, drop.x));
        }

        // Landing: stop it dead and pull the remaining life down to the squash
        // window, so the flatten happens on impact rather than at whatever
        // height the timer happened to run out.
        if (drop.y >= landingY) {
          drop.y = landingY;
          drop.vy = 0;
          drop.vx *= 0.4;
          if (drop.max - drop.life > SQUASH_FRAMES) {
            drop.max = drop.life + SQUASH_FRAMES;
          }
        }

        const remaining = drop.max - drop.life;
        let scaleX = 1;
        let scaleY = 1;

        if (remaining <= SQUASH_FRAMES) {
          // Flattens on the way out so it reads as landing rather than simply
          // vanishing mid-air.
          const t = 1 - Math.max(0, remaining) / SQUASH_FRAMES;
          scaleY = 1 - t * 0.7;
          scaleX = 1 + t * 0.6;
        }

        const fade = Math.min(1, Math.max(0, remaining / (drop.max * 0.45)));

        drop.el.style.opacity = String(fade * 0.9);
        drop.el.style.transform =
          `translate3d(${drop.x}px, ${drop.y}px, 0) ` +
          `rotate(${drop.rot}deg) scale(${scaleX}, ${scaleY})`;

        if (drop.life >= drop.max) {
          drop.alive = false;
          drop.el.style.opacity = "0";
        }
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      burstRef.current = null;
      for (const drop of pool) drop.el.remove();
    };
  }, []);

  const handleClick = useCallback(() => {
    burstRef.current?.();
    scrollToTop();
  }, []);

  return (
    <div className="btt-root">
      <button
        type="button"
        onClick={handleClick}
        className="back-to-top"
        data-visible={visible}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        aria-label="Back to top"
        title="Back to top"
      >
        <span ref={waterRef} className="btt-water" aria-hidden>
          <span ref={backRef} className="btt-wave btt-wave--back">
            <WaveLayer />
          </span>
          <span ref={frontRef} className="btt-wave btt-wave--front">
            <WaveLayer />
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

      {/* Sibling of the button, not a child: the button clips its own contents
          to the circle, and droplets have to escape that. */}
      <span
        ref={splashRef}
        className="btt-splash"
        data-visible={visible}
        aria-hidden
      />
    </div>
  );
}
