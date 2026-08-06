"use client";

/**
 * One IntersectionObserver shared by every reveal on the page.
 *
 * A per-element observer is the common shortcut and it costs real work: each
 * one carries its own root/threshold bookkeeping and its own callback into the
 * main thread. A single observer batches every intersection into one callback,
 * and elements unsubscribe as they fire.
 */

/** Fire when the element is ~12% into the viewport. */
const ROOT_MARGIN = "0px 0px -12% 0px";

let observer: IntersectionObserver | null = null;
const handlers = new Map<Element, () => void>();

function getObserver(): IntersectionObserver {
  if (observer) return observer;

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const handler = handlers.get(entry.target);
        if (!handler) continue;
        handler();
        // Reveals run once. Unobserving here — rather than tracking a "done"
        // flag — means a revealed element stops costing anything at all.
        observer?.unobserve(entry.target);
        handlers.delete(entry.target);
      }
    },
    { rootMargin: ROOT_MARGIN },
  );

  return observer;
}

/**
 * Calls `onEnter` once, the first time `el` crosses the trigger line.
 * Returns an unsubscribe function for React cleanup.
 */
export function observeOnce(el: Element, onEnter: () => void): () => void {
  const instance = getObserver();
  handlers.set(el, onEnter);
  instance.observe(el);

  return () => {
    instance.unobserve(el);
    handlers.delete(el);
  };
}
