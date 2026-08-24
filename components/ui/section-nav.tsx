"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";
import { SECTIONS, useSections } from "@/components/providers/section-provider";
import { scrollToSection } from "@/lib/lenis";
import { scrollProgress } from "@/lib/scroll-extent";

/**
 * Section navigation: one pill against the right edge that rides the scroll
 * position and unfolds into a panel when tapped.
 *
 * The same at every size. There is no wide-screen variant — a single control
 * that behaves identically everywhere is one thing to learn and one thing to
 * maintain, and it leaves the page itself as the only thing changing between
 * a phone and a desktop.
 *
 * Which section is current is not decided here: it comes from SectionProvider,
 * so this and the header pill can never disagree.
 */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** Fraction of the distance left to the target the pill covers each frame. */
const PILL_EASING = 0.09;

/** Frames stop once the pill is closer than this to its target, in progress. */
const PILL_EPSILON = 0.0004;

/** How long the goo filter stays applied after a toggle. Matches the CSS. */
const MORPH_MS = 560;

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  // The server cannot know, and guessing would swap behaviour out from under
  // the user on hydration. It reports false and the real value arrives with the
  // first client render.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Blur, then push alpha far past its own range and pull it back down. Partly
 * transparent edges either round up to solid or fall to nothing, so two blurred
 * shapes that overlap read as one surface with a single continuous outline.
 */
function GooFilter() {
  return (
    <svg className="nav-defs" aria-hidden focusable="false">
      <defs>
        <filter id="nav-goo" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 22 -11"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function SectionNav() {
  const { activeIndex, navOpen, setNavOpen } = useSections();
  const [morphing, setMorphing] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reduced = useMediaQuery(REDUCED_QUERY);
  const active = SECTIONS[activeIndex];

  /* Scroll progress drives the pill's position, and the panel's unfold origin
     is derived from it in CSS. Written to the root as a custom property so the
     shape layer and the content layer read the same number and stay welded. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Cached — see lib/scroll-extent.ts. This runs inside a rAF tick, and the
    // `scrollHeight` read it replaces forced a layout flush every frame.
    const target = () => scrollProgress();

    const write = (value: number) =>
      root.style.setProperty("--nav-progress", value.toFixed(4));

    // Easing the pill's travel is itself a motion effect. With reduced motion
    // it is written straight from the scroll position, which also means no
    // animation frames are ever scheduled.
    if (reduced) {
      const onScroll = () => write(target());
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    let current = target();
    let frame = 0;
    let running = false;
    write(current);

    const tick = () => {
      const goal = target();
      current += (goal - current) * PILL_EASING;

      if (Math.abs(goal - current) < PILL_EPSILON) {
        current = goal;
        write(current);
        running = false;
        return;
      }

      write(current);
      frame = requestAnimationFrame(tick);
    };

    // The loop runs only while there is distance left to cover, so a page at
    // rest costs nothing.
    const onScroll = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  /* The shape layer mirrors the panel, and an empty element has no content to
     take its height from — left alone it collapses to nothing and the panel
     opens with no surface under it at all. The real panel's measured height is
     published so the shape can borrow it, and so the CSS that positions the
     unfold origin has a panel height to work from. */
  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;

    const observer = new ResizeObserver(() => {
      // A layout value, so the panel's own scale transform does not feed back
      // into it.
      root.style.setProperty("--nav-panel-h", `${panel.offsetHeight}px`);
    });

    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(
    (next: boolean) => {
      setNavOpen(next);
      // The goo is a transition effect. Off at rest, so the resting shapes keep
      // their crisp edges and their backdrop blur, which an SVG filter on the
      // same subtree would otherwise take away.
      if (reduced) return;
      setMorphing(true);
    },
    [reduced, setNavOpen],
  );

  useEffect(() => {
    if (!morphing) return;
    const timer = window.setTimeout(() => setMorphing(false), MORPH_MS);
    return () => window.clearTimeout(timer);
  }, [morphing]);

  /* Escape, a click outside, and a focus loop — the three things a panel that
     covers the page owes the person using it. */
  useEffect(() => {
    if (!navOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggle(false);
        pillRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      // Wrap by hand: the panel is not a <dialog>, because a top-layer element
      // could not sit in the same stacking context as the shape it morphs out
      // of, and the morph is the point.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!panel.contains(event.target as Node)) toggle(false);
    };

    document.addEventListener("keydown", onKeyDown);
    // Deferred a frame: the pointerdown that opened the panel — which may have
    // landed on the header's menu button, not the pill — is still being
    // dispatched, and this listener would see it and close the panel again.
    const arm = requestAnimationFrame(() =>
      document.addEventListener("pointerdown", onPointerDown),
    );

    focusable()[0]?.focus();

    return () => {
      cancelAnimationFrame(arm);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [navOpen, toggle]);

  // Closing hands focus back to the control that opened the panel, so tabbing
  // does not restart from the top of the document.
  const close = () => {
    toggle(false);
    pillRef.current?.focus();
  };

  const go = (id: string) => {
    toggle(false);
    scrollToSection(id);
  };

  return (
    <>
      <GooFilter />

      <div
        ref={rootRef}
        className="nav-dock"
        data-open={navOpen}
        data-morphing={morphing}
      >
        {/* Shape layer. Nothing here has content — it exists to be blurred and
            re-contrasted into a single liquid mass by the goo filter, which the
            icons and labels above it never touch. */}
        <div className="nav-goo" aria-hidden>
          <span className="nav-goo__pill" />
          <span className="nav-goo__panel" />
        </div>

        <button
          ref={pillRef}
          type="button"
          className="nav-pill"
          aria-label={`Sections — currently ${active.label}`}
          aria-expanded={navOpen}
          onClick={() => toggle(!navOpen)}
        >
          {/* Every icon is mounted and only the active one is opaque, so the
              change is a crossfade between two of them rather than one icon
              being swapped out under a fade. */}
          <span className="nav-pill__icons">
            {SECTIONS.map((section, i) => (
              <section.Icon
                key={section.id}
                className="nav-icon nav-pill__icon"
                strokeWidth={1.6}
                data-active={i === activeIndex ? "true" : undefined}
                aria-hidden
              />
            ))}
          </span>
        </button>

        <div
          ref={panelRef}
          className="nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Sections"
          // Hidden from assistive tech and from tabbing while collapsed. The
          // element stays mounted so the unfold has something to animate.
          inert={!navOpen}
        >
          <button
            type="button"
            className="nav-panel__close"
            aria-label="Close navigation"
            onClick={close}
          >
            <X className="nav-icon" strokeWidth={1.7} aria-hidden />
          </button>

          <ul className="nav-panel__list">
            {SECTIONS.map((section, i) => (
              <li
                key={section.id}
                className="nav-panel__row"
                style={{ "--nav-i": i } as CSSProperties}
              >
                <button
                  type="button"
                  className="nav-panel__item"
                  aria-current={i === activeIndex ? "page" : undefined}
                  onClick={() => go(section.id)}
                >
                  <section.Icon
                    className="nav-icon"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                  <span>{section.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
