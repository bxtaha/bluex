"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-media-query";

/**
 * The fluid sim, kept off the critical path.
 *
 * `ssr: false` because it is a WebGL canvas with nothing to render on a server,
 * and — the part that matters here — a dynamic import keeps 35KB of shader
 * source out of the first load. It arrives in its own chunk once the page is
 * done.
 */
const SplashCursor = dynamic(() => import("@/components/ui/splash-cursor"), {
  ssr: false,
});

/**
 * Tuning for the fluid.
 *
 * `RAINBOW_MODE: false` is what makes `COLOR` mean anything; with the rainbow
 * on, upstream cycles the whole hue wheel and ignores the value. The sim scales
 * whatever it is given by 0.15 before the dye, so a token value lands at the
 * same intensity the rainbow did. `COLOR_UPDATE_SPEED` only re-picks the
 * pointer's colour, so with the rainbow off it re-picks the same value each
 * time — kept at the given number because it costs nothing and matters again
 * the moment the rainbow is switched back on.
 */
const SPLASH_CONFIG = {
  DENSITY_DISSIPATION: 3.5,
  VELOCITY_DISSIPATION: 3.5,
  PRESSURE: 0.1,
  CURL: 3,
  SPLAT_RADIUS: 0.01,
  SPLAT_FORCE: 6500,
  COLOR_UPDATE_SPEED: 27,
  SHADING: true,
  RAINBOW_MODE: false,
} as const;

/**
 * The token the scroll progress bar fills with — `.scroll-progress__fill` is
 * `background: var(--color-electric)`. The cursor reads the same property, so
 * the two cannot drift: retune the token and both follow.
 */
const COLOR_TOKEN = "--color-electric";

/** Used only if the token is missing or is not a plain hex. Today's value. */
const COLOR_FALLBACK = "#2e6bff";

/**
 * Resolves the token to a hex string the sim can parse.
 *
 * The sim's own `hexToRGB` understands `#rgb` and `#rrggbb` and nothing else —
 * hand it an `oklch()` or a `color-mix()` and every channel comes back `NaN`,
 * which renders as an invisible splat rather than an error. So the value is
 * checked rather than trusted: anything that is not a plain hex falls back.
 */
function resolveSplashColor(): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(COLOR_TOKEN)
    .trim();

  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : COLOR_FALLBACK;
}

/**
 * Breathing room after `load` before the sim is built.
 *
 * This was `requestIdleCallback` first, which was wrong in a way worth
 * recording: Lenis runs off GSAP's ticker, so this page holds an rAF loop open
 * for its whole life and never becomes idle. Measured over CDP, the layer
 * mounted ~20s after navigation and ~13s after `load` — the idle timeout does
 * not get a prompt slot either, because a forced idle callback still has to
 * wait for a gap between frames. A plain timeout has the same intent (be after
 * the largest paint, not in front of it) and an edge that actually arrives.
 */
const MOUNT_DELAY = 300;

/**
 * Decides *when* the splash cursor exists; the sim itself decides what it looks
 * like.
 *
 * Two gates, for two different reasons:
 *
 * **Reduced motion.** Everything else on this page honours it — Lenis is never
 * started, the reveals collapse to 0.01ms. A full-screen fluid simulation
 * chasing the pointer is the most motion on the page, so it does not get to be
 * the one exception.
 *
 * **Shortly after load.** Compiling ten shader programs and allocating the
 * framebuffers is main-thread work, and the page's LCP budget was won by
 * deleting exactly this shape of cost (an unused SplitText registration, ~600ms
 * on a throttled phone). Waiting for `load` puts all of it after the largest
 * paint rather than in front of it. Nothing above the fold depends on it, so
 * nothing about the page looks unfinished during the wait.
 */
export function SplashCursorMount() {
  const reduced = useReducedMotion();
  // One piece of state, not a `ready` flag beside a colour: the colour is only
  // readable once the stylesheet has applied, which is the same moment the sim
  // may be built. Null means "not yet".
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (reduced) return;

    let handle: number | undefined;

    const start = () => {
      // Resolved here rather than at module scope: custom properties do not
      // exist until the stylesheet is applied, and this file is imported long
      // before that.
      handle = window.setTimeout(() => setColor(resolveSplashColor()), MOUNT_DELAY);
    };

    // A page restored from bfcache, or one hydrated after `load` already fired,
    // never sees the event — it is complete before this effect runs.
    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      window.removeEventListener("load", start);
      if (handle !== undefined) window.clearTimeout(handle);
    };
  }, [reduced]);

  // `reduced` is live, not read once at mount: turning the preference on with
  // the page open unmounts the sim, and its own cleanup cancels the rAF loop
  // and drops the pointer listeners.
  if (reduced || color === null) return null;

  return <SplashCursor {...SPLASH_CONFIG} COLOR={color} />;
}
