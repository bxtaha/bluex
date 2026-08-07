"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  useSections,
  type SectionId,
} from "@/components/providers/section-provider";
import { CallCta } from "@/components/ui/call-cta";

/**
 * Every section the dock lists, in the same order — the two navigations offer
 * the same places to go, not overlapping subsets of them.
 *
 * The labels are the nav's own, and shorter: eight of the dock's phrasings
 * across the top of the page would push the pill into the logo well before a
 * laptop runs out of width. The `SectionId` annotation is what stops an id
 * being listed here that the observer does not watch.
 */
const LINKS: readonly { id: SectionId; label: string }[] = [
  { id: "top", label: "Home" },
  { id: "services", label: "Services" },
  { id: "how-it-works", label: "How it works" },
  { id: "experience", label: "Try it" },
  { id: "why-bluex", label: "Why BlueX" },
  { id: "process", label: "Process" },
  { id: "outcomes", label: "Outcomes" },
  { id: "contact", label: "Contact" },
];

/** Scroll distance after which the pill contracts and lifts. */
const CONTRACT_AT = 24;

/**
 * Floating glass pill over the top of the page, made of the same material as
 * the side dock — both read their surface from the `--glass-*` tokens, so
 * neither can be restyled without the other following.
 *
 * The indicator still handles a section it has no entry for by fading out where
 * it stands, rather than jumping somewhere arbitrary. Nothing reaches that
 * branch while the two lists match, but the day one is trimmed it is the
 * difference between an indicator that steps aside and one that lies.
 */
export function SiteHeader() {
  const { activeId } = useSections();

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
            /* The box is 93px wide on a phone and 108px on a desktop. Without
               this the browser has no width to reason about and takes the
               largest candidate in the set — a 1080px source for a 108px slot. */
            sizes="(min-width: 640px) 108px, 93px"
            className="h-12 w-auto sm:h-14"
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
          {/* 44px tall on a phone, where it is tapped rather than clicked. */}
          <CallCta
            size="sm"
            magnetic={false}
            className="h-11 shrink-0 px-3 text-xs sm:h-11 sm:px-4 sm:text-[0.8125rem]"
          >
            Get a call
          </CallCta>
        </div>
      </div>
    </header>
  );
}
