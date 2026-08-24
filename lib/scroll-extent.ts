"use client";

/**
 * How far this document can scroll, cached.
 *
 * Three separate rAF loops on the homepage wanted the same number every frame —
 * the bottom progress bar, the back-to-top water level and the nav dock's pill
 * — and each computed it the same way:
 *
 *     document.documentElement.scrollHeight - window.innerHeight
 *
 * `scrollHeight` is a layout-forcing read. Asking for it inside an animation
 * frame makes the browser flush style and layout before it can answer, and on
 * this page that lands at the worst possible moment: while a `.bx-slider` is
 * pinned, ScrollTrigger is mutating the pin spacer's box every frame, so layout
 * is guaranteed dirty and the flush is guaranteed expensive. Three of them per
 * frame, on a phone, is a measurable slice of a 16ms budget.
 *
 * The value only changes when the document's height changes, which is rare and
 * observable — so it is computed once and invalidated by an observer rather
 * than recomputed by every reader on every frame. `window.scrollY`, which is
 * what actually changes per frame, is not layout-forcing and stays at the call
 * sites.
 *
 * Invalidation is deliberately broad rather than a list of known causes. Fonts
 * swapping, images decoding, a pin spacer appearing, a reveal expanding, an
 * orientation change — enumerating those is how a stale cache ships. A
 * `ResizeObserver` on the document catches all of them for the cost of one
 * observer, and a stale value here means a progress bar that reads wrong, so
 * the conservative choice is the correct one.
 *
 * The listeners are module-scoped and never removed. That is intentional: this
 * describes the document, not a component, and there is exactly one document
 * for the lifetime of the page.
 */

let cached = -1;
let wired = false;
const listeners = new Set<() => void>();

function invalidate(): void {
  cached = -1;
  for (const listener of listeners) listener();
}

/**
 * Called whenever the document's scrollable height may have changed.
 *
 * Readers that only redraw in response to scrolling need this: once a loop
 * stops re-arming every frame, a document that grows — a font swapping, an
 * image decoding, a pin spacer appearing — moves the answer without the reader
 * having scrolled, and nothing would repaint. Subscribing costs one callback
 * on a rare event; not subscribing costs a progress bar that is quietly wrong
 * until the next scroll.
 */
export function onExtentChange(listener: () => void): () => void {
  wire();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function wire(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;

  window.addEventListener("resize", invalidate, { passive: true });
  // `orientationchange` fires on phones where `resize` sometimes does not.
  window.addEventListener("orientationchange", invalidate, { passive: true });

  // Both, because either can be the one that grows: `<body>` tracks content
  // height in a normal flow document, and `<html>` is what `scrollHeight` is
  // actually read from.
  const observer = new ResizeObserver(invalidate);
  observer.observe(document.documentElement);
  if (document.body) observer.observe(document.body);
}

/** Maximum `scrollY`. Zero when the document does not scroll. */
export function maxScroll(): number {
  wire();
  if (cached < 0) {
    cached = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
  }
  return cached;
}

/**
 * How far down the document the reader is, 0 to 1.
 *
 * The shape every caller wanted, so none of them re-derives it — and clamped,
 * because overscroll on iOS reports a `scrollY` past the end.
 */
export function scrollProgress(): number {
  const max = maxScroll();
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / max));
}
