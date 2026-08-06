"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import {
  useSections,
  type SectionId,
} from "@/components/providers/section-provider";
import { CallCta } from "@/components/ui/call-cta";

/**
 * The nav's own labels rather than the section list's: "Services" reads better
 * across the top of the page than "What we build" does. Only the ids are
 * shared, and the `SectionId` annotation is what stops one being listed here
 * that the observer does not watch.
 */
const LINKS: readonly { id: SectionId; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How it works" },
  { id: "why-bluex", label: "Why BlueX" },
  { id: "process", label: "Process" },
];

/** Scroll distance after which the pill contracts and lifts. */
const CONTRACT_AT = 24;

/**
 * Floating glass pill over the top of the page, made of the same material as
 * the side dock — both read their surface from the `--glass-*` tokens, so
 * neither can be restyled without the other following.
 *
 * It carries only four of the eight sections; the dock carries all of them.
 * When the reader is in one the header does not list, the indicator fades out
 * where it stands rather than jumping somewhere arbitrary or picking a nearest
 * neighbour that would be a lie.
 */
export function SiteHeader() {
  const { activeId, navOpen, setNavOpen } = useSections();

  const headerRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLLIElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeLink = LINKS.findIndex((link) => link.id === activeId);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    // A plain scroll listener rather than a ScrollTrigger: this only needs a
    // boolean at one threshold, and it must keep working with reduced motion,
    // where Lenis is never started.
    const onScroll = () => {
      el.dataset.scrolled = String(window.scrollY > CONTRACT_AT);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* The indicator is measured rather than computed: items are text, so they are
     all different widths and there is no arithmetic that gives their positions.
     Written straight to the DOM, not held in state — this runs on font load and
     on every resize, and none of it is anything React needs to re-render for.

     Offsets are taken inside the list, which is the indicator's offset parent.
     The pill's padding changes when it contracts; that moves the whole list and
     leaves the geometry inside it untouched. */
  useEffect(() => {
    const indicator = indicatorRef.current;
    const list = listRef.current;
    if (!indicator || !list) return;

    const place = () => {
      const item = itemRefs.current[activeLink];
      // `offsetParent` is null while the list is display:none, which is every
      // width below the breakpoint — measuring there would write a zero width
      // that then animates open when the window is widened.
      if (!item || item.offsetParent === null) {
        // No header entry for this section. Left where it is, so returning to a
        // listed section slides it back from a sensible place.
        indicator.style.opacity = "0";
        return;
      }
      indicator.style.opacity = "1";
      indicator.style.transform = `translate3d(${item.offsetLeft}px, 0, 0)`;
      indicator.style.width = `${item.offsetWidth}px`;
    };

    place();

    // Webfonts change text metrics, which changes every item's width and
    // position. Without this the indicator keeps its pre-swap geometry.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) place();
    });

    window.addEventListener("resize", place);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", place);
    };
  }, [activeLink]);

  return (
    <header ref={headerRef} data-scrolled="false" className="site-header">
      <div className="relative mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <a
          href="#top"
          aria-label="BlueX — home"
          className="site-header__edge shrink-0"
        >
          <Image
            src="/bluex-logo.png"
            alt="BlueX"
            width={525}
            height={271}
            priority
            className="h-11 w-auto sm:h-13"
          />
        </a>

        {/* Centred on the viewport rather than sitting between its neighbours:
            the logo and the action group are different widths, so a flex
            middle child would land off-centre by half that difference. */}
        <nav className="site-header__pill" aria-label="Main">
          <ul ref={listRef} className="site-header__list">
            {/* One sliding element, animating both its position and its width
                to fit whichever item is current. */}
            <li className="site-header__indicator" ref={indicatorRef} aria-hidden />

            {LINKS.map((link, i) => (
              <li key={link.id}>
                {/* A real anchor: SmoothScroll intercepts hash links globally
                    and hands them to Lenis, so this needs no click handler and
                    still works as a link when JavaScript has not loaded. */}
                <a
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  href={`#${link.id}`}
                  className="site-header__link"
                  aria-current={activeLink === i ? "page" : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__edge site-header__actions">
          <CallCta
            size="sm"
            magnetic={false}
            className="h-9 shrink-0 px-3 text-xs sm:h-10 sm:px-4 sm:text-[0.8125rem]"
          >
            Get a call
          </CallCta>

          {/* Opens the dock's panel rather than a second menu of its own. Below
              the breakpoint where the links fit, that panel is the navigation. */}
          <button
            type="button"
            className="site-header__menu"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(!navOpen)}
          >
            <Menu className="nav-icon" strokeWidth={1.7} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
