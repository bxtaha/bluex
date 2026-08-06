"use client";

import type Lenis from "lenis";

/**
 * Holds the running Lenis instance so components outside the provider can drive
 * scrolling through it.
 *
 * Lenis owns the scroll position while it is running, so calling
 * `window.scrollTo({ behavior: "smooth" })` fights it and produces a stutter or
 * an outright jump. Anything that programmatically scrolls has to go through
 * the same instance.
 *
 * A module-level reference rather than context: this is a single global
 * instance, and consumers only need it inside event handlers, never during
 * render, so context would add a provider boundary for no benefit.
 */

let instance: Lenis | null = null;

export function setLenis(next: Lenis | null) {
  instance = next;
}

/**
 * Scrolls the page to the top. Falls back to a native jump when Lenis is not
 * running — which is the reduced-motion case, where an instant scroll is what
 * is wanted anyway.
 */
export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0);
    return;
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

/** Clearance under the fixed header, mirroring `scroll-padding-top` in
 *  globals.css. The bar itself is 88px; this leaves a little air under it. */
export const HEADER_OFFSET = 96;

/**
 * Scrolls a section into view under the fixed header.
 *
 * Lenis takes the offset explicitly because it drives scroll itself and never
 * sees `scroll-padding-top`; the native fallback does honour that property, so
 * it needs no offset of its own.
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  if (instance) {
    instance.scrollTo(el, { offset: -HEADER_OFFSET });
    return;
  }
  el.scrollIntoView({ behavior: "auto", block: "start" });
}
