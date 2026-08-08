"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Briefcase,
  CalendarCheck,
  Home,
  Layers,
  MessagesSquare,
  PenLine,
  PhoneCall,
  Route,
  ShieldCheck,
  Tag,
  TrendingUp,
  Workflow,
} from "lucide-react";

/**
 * One reading of where the page is, shared by everything that needs it.
 *
 * The header pill and the side dock both highlight the current section. Run
 * from separate observers they would disagree — different roots, different
 * callback order, different answers at a boundary — and two navigations
 * pointing at different sections is worse than either being slightly late.
 *
 * Items must stay in document order: the active item is the topmost section
 * crossing the middle of the viewport, which relies on index order matching
 * page order.
 *
 * Anchors, all of them — "Blog" scrolls to the teaser on this page rather than
 * navigating to `/blog`. The index is one click further on, from the teaser's
 * own "Read everything".
 *
 * One caveat that comes with that: `BlogTeaser` renders nothing below three
 * published posts, so if the blog is ever trimmed to two this row scrolls
 * nowhere. `scrollToSection` no-ops on a missing element rather than throwing,
 * so it fails quietly rather than badly.
 *
 * `#final-cta` is absent. It is the closing flourish rather than a place anyone
 * navigates to, and the observer holds the last active item across it.
 */
export const SECTIONS = [
  { id: "top", label: "Home", Icon: Home },
  { id: "services", label: "What we build", Icon: Layers },
  { id: "how-it-works", label: "How it works", Icon: Workflow },
  { id: "experience", label: "Try the agent", Icon: PhoneCall },
  { id: "why-bluex", label: "Why BlueX", Icon: ShieldCheck },
  { id: "process", label: "Process", Icon: Route },
  { id: "outcomes", label: "Outcomes", Icon: TrendingUp },
  { id: "work", label: "Selected work", Icon: Briefcase },
  { id: "pricing", label: "Pricing", Icon: Tag },
  { id: "faq", label: "Questions", Icon: MessagesSquare },
  { id: "writing", label: "Blog", Icon: PenLine },
  { id: "contact", label: "Get a call", Icon: CalendarCheck },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/**
 * Narrows the observer's root to a band across the middle of the viewport, so
 * "active" means the section being looked at rather than any section with a
 * pixel on screen — near a boundary two are always partly visible, and the top
 * edge would flip the state a full screen early.
 */
const ROOT_MARGIN = "-45% 0px -45% 0px";

type SectionState = {
  activeIndex: number;
  activeId: SectionId;
  /** Whether the dock's panel is expanded. Shared so the header's menu button
   *  opens that panel rather than introducing a second menu beside it. */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
};

const SectionContext = createContext<SectionState | null>(null);

export function SectionProvider({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

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
        // right: neither navigation should blank out between two entries.
        if (inBand.size === 0) return;
        setActiveIndex(Math.min(...inBand));
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    for (const el of elements) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const value = useMemo(
    () => ({
      activeIndex,
      activeId: SECTIONS[activeIndex].id,
      navOpen,
      setNavOpen,
    }),
    [activeIndex, navOpen],
  );

  return (
    <SectionContext.Provider value={value}>{children}</SectionContext.Provider>
  );
}

export function useSections() {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useSections must be used inside <SectionProvider>");
  }
  return context;
}
