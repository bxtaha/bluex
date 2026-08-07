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

/**
 * Freezes and restores page scrolling, for anything that covers the page.
 *
 * Stopping Lenis is the whole lock while it is running: it owns the wheel and
 * touch handling, so a stopped instance is a page that does not scroll — and,
 * unlike `overflow: hidden` on the root, it removes no scrollbar and therefore
 * shifts no layout. The fixed header and dock would visibly jump by the
 * scrollbar's width if we took that route.
 *
 * The `overflow` fallback is only for the reduced-motion case, where Lenis is
 * never started and there is nothing else holding the page still. Both axes are
 * stated by the shorthand, which is deliberate — `overflow-y` alone computes
 * `overflow-x` to `auto` and grows a phantom scrollbar.
 */
export function lockScroll() {
  if (instance) {
    instance.stop();
    return;
  }
  document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  if (instance) {
    instance.start();
    return;
  }
  document.documentElement.style.overflow = "";
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
