"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  CalendarCheck,
  Home,
  Layers,
  PhoneCall,
  Route,
  ShieldCheck,
  TrendingUp,
  Workflow,
  X,
} from "lucide-react";
import { scrollToSection } from "@/lib/lenis";

/**
 * Section navigation: one pill against the right edge that rides the scroll
 * position and unfolds into a panel when tapped.
 *
 * The same at every size. There is no wide-screen variant — a single control
 * that behaves identically everywhere is one thing to learn and one thing to
 * maintain, and it leaves the page itself as the only thing changing between
 * a phone and a desktop.
 *
 * Items must stay in document order: the active item is the topmost section
 * crossing the middle of the viewport, which relies on index order matching
 * page order.
 */
const SECTIONS = [
  { id: "top", label: "Home", Icon: Home },
  { id: "services", label: "What we build", Icon: Layers },
  { id: "how-it-works", label: "How it works", Icon: Workflow },
  { id: "experience", label: "Try the agent", Icon: PhoneCall },
  { id: "why-bluex", label: "Why BlueX", Icon: ShieldCheck },
  { id: "process", label: "Process", Icon: Route },
  { id: "outcomes", label: "Outcomes", Icon: TrendingUp },
  { id: "contact", label: "Get a call", Icon: CalendarCheck },
] as const;

/**
 * Narrows the observer's root to a band across the middle of the viewport, so
 * "active" means the section being looked at rather than any section with a
 * pixel on screen — near a boundary two are always partly visible, and the top
 * edge would flip the state a full screen early.
 */
const ROOT_MARGIN = "-45% 0px -45% 0px";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** Fraction of the distance left to the target the pill covers each frame. */
const PILL_EASING = 0.09;

/** Frames stop once the pill is closer than this to its target, in progress. */
const PILL_EPSILON = 0.0004;

/** How long the goo filter stays applied after a toggle. Matches the CSS. */
const MORPH_MS = 560;

/* ── Hooks ────────────────────────────────────────────────────────────────── */

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

function useActiveSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id));

    // Which sections are in the band. A set rather than one index because
    // several qualify at once while one scrolls out and the next scrolls in.
    const inBand = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = elements.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (entry.isIntersecting) inBand.add(index);
          else inBand.delete(index);
        }

        // Untracked stretches sit between some sections — the trust strip, the
        // speed hook, the footer. Holding the last active item through them is
        // right: the nav should not blank out between two of its entries.
        if (inBand.size === 0) return;
        setActiveIndex(Math.min(...inBand));
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    for (const el of elements) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return activeIndex;
}

/* ── Filter ───────────────────────────────────────────────────────────────── */

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

/* ── The dock ─────────────────────────────────────────────────────────────── */

export function SectionNav() {
  const activeIndex = useActiveSection();
  const [open, setOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reduced = useMediaQuery(REDUCED_QUERY);
  const active = SECTIONS[activeIndex];

  /* Scroll progress drives the pill's position. Written to the root as a custom
     property so the shape layer and the content layer read the same number and
     stay welded together. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const target = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    };

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
     published so the shape can borrow it. */
  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;

    const observer = new ResizeObserver(() => {
      // The border box, not the content box: the shape has to cover the
      // panel's padding too. A layout value, so the panel's own scale transform
      // does not feed back into it.
      root.style.setProperty("--nav-panel-h", `${panel.offsetHeight}px`);
    });

    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  /* The panel unfolds out of the pill, so its transform origin is wherever the
     pill happens to be — which changes with scroll. Measured at the moment of
     opening, when the pill is still in its collapsed position. */
  const setOrigin = useCallback(() => {
    const root = rootRef.current;
    const pill = pillRef.current;
    if (!root || !pill) return;
    const pillBox = pill.getBoundingClientRect();
    const rootBox = root.getBoundingClientRect();
    root.style.setProperty(
      "--nav-origin-y",
      `${pillBox.top + pillBox.height / 2 - rootBox.top}px`,
    );
  }, []);

  const toggle = useCallback(
    (next: boolean) => {
      if (next) setOrigin();
      setOpen(next);
      // The goo is a transition effect. Off at rest, so the resting shapes keep
      // their crisp edges and their backdrop blur, which an SVG filter on the
      // same subtree would otherwise take away.
      if (reduced) return;
      setMorphing(true);
    },
    [reduced, setOrigin],
  );

  useEffect(() => {
    if (!morphing) return;
    const timer = window.setTimeout(() => setMorphing(false), MORPH_MS);
    return () => window.clearTimeout(timer);
  }, [morphing]);

  /* Escape, a click outside, and a focus loop — the three things a panel that
     covers the page owes the person using it. */
  useEffect(() => {
    if (!open) return;
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
    // Deferred a frame: the pointerdown that opened the panel is still being
    // dispatched, and this listener would see it and close it immediately.
    const arm = requestAnimationFrame(() =>
      document.addEventListener("pointerdown", onPointerDown),
    );

    focusable()[0]?.focus();

    return () => {
      cancelAnimationFrame(arm);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, toggle]);

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
        data-open={open}
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
          aria-expanded={open}
          onClick={() => toggle(!open)}
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
          inert={!open}
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
                  aria-current={i === activeIndex ? "true" : undefined}
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
