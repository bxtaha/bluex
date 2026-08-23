"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as a live value.
 *
 * Reading `matchMedia(...).matches` once inside an effect answers the question
 * for the moment the component mounted and never again. Someone who turns on
 * "reduce motion" while the page is open keeps every animation until they
 * reload — which is the wrong way round, because the setting is most often
 * reached for by someone who is already uncomfortable.
 *
 * Returned through `useSyncExternalStore` so a change re-renders, and any
 * effect that lists the value as a dependency tears down and sets itself up
 * again on its own.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // The server cannot know. It reports "no preference", which is the same
    // assumption the stylesheet makes, so markup and styles agree on the first
    // paint and the real value arrives with the first client render.
    () => false,
  );
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

/**
 * A pointer that cannot hover and cannot point precisely — a finger.
 *
 * Both halves are needed. `hover: none` alone matches a laptop with a
 * touchscreen that also has a trackpad, and `pointer: coarse` alone matches
 * some pens. Together they describe a device whose only input is touch.
 */
export const TOUCH_ONLY_QUERY = "(hover: none) and (pointer: coarse)";

export function useTouchOnly() {
  return useMediaQuery(TOUCH_ONLY_QUERY);
}
