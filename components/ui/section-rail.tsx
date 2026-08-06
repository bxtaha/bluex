"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  Home,
  Layers,
  PhoneCall,
  Route,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { scrollToSection } from "@/lib/lenis";

/**
 * Vertical navigation rail pinned to the right edge, ported from the tab bar on
 * bluex_v2. The spacing rhythm, icon size and interaction feel are carried over
 * unchanged; the orientation, position and background treatment are not.
 *
 * Items must stay in document order — the active item is resolved as the
 * topmost section currently crossing the middle of the viewport, and that
 * relies on index order matching page order.
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
 * "active" means "the section you are actually looking at" rather than "the
 * section with a pixel on screen" — near a boundary two sections are always
 * partly visible, and the top edge would flip the state a full screen early.
 */
const ROOT_MARGIN = "-45% 0px -45% 0px";

export function SectionRail() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id));

    // Which sections are currently in the band. Kept as a set rather than a
    // single index because several qualify at once while one scrolls out and
    // the next scrolls in.
    const inBand = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = elements.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (entry.isIntersecting) inBand.add(index);
          else inBand.delete(index);
        }

        // Untracked stretches of page sit between some sections — the trust
        // strip, the speed hook, the footer. Holding the last active item
        // through them is right: the rail should never blank out or snap back
        // to the top just because the reader is between two of its entries.
        if (inBand.size === 0) return;
        setActiveIndex(Math.min(...inBand));
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    for (const el of elements) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resizing changes the rail's font-size, and every measurement derives from
  // it — so the indicator's resting place moves and it would glide there over
  // half a second, chasing the drag. Suppressed while resizing, exactly as the
  // source bar does, and restored on the next click.
  useEffect(() => {
    const onResize = () => listRef.current?.style.setProperty("--timeOut", "none");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const go = (index: number, id: string) => {
    listRef.current?.style.removeProperty("--timeOut");
    // Set immediately rather than waiting for the observer: the indicator
    // should leave with the click, not after the scroll has landed.
    setActiveIndex(index);
    scrollToSection(id);
  };

  return (
    <nav className="rail" aria-label="Sections">
      <ul
        ref={listRef}
        className="rail__list"
        style={{ "--rail-active": activeIndex } as React.CSSProperties}
      >
        {/* One sliding element rather than a marker per item. Items are
            identical squares, so its offset is exactly index × its own height
            — no measuring, and it re-derives itself for free when the em-based
            sizing changes with the viewport. */}
        <li className="rail__pill" aria-hidden />

        {SECTIONS.map((section, index) => (
          <li key={section.id}>
            <button
              type="button"
              className="rail__item"
              aria-label={section.label}
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => go(index, section.id)}
            >
              <section.Icon className="icon" strokeWidth={1.6} aria-hidden />
              {/* Labelling is done by aria-label above, so this is decoration:
                  exposing both would read the name out twice. */}
              <span className="rail__label" aria-hidden>
                {section.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
