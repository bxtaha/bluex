"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { CallCta } from "@/components/ui/call-cta";

const LINKS = [
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how-it-works" },
];

/**
 * Fixed header that stays transparent over the hero and picks up a blurred
 * backing once the page scrolls, so it never competes with the headline but
 * stays readable over content further down.
 */
export function SiteHeader() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // A plain scroll listener rather than a ScrollTrigger: this only needs a
    // boolean at one threshold, and it must keep working with reduced motion,
    // where Lenis is never started.
    const onScroll = () => {
      el.dataset.scrolled = String(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={ref}
      data-scrolled="false"
      className="group fixed inset-x-0 top-0 z-50 transition-colors duration-300 data-[scrolled=true]:border-b data-[scrolled=true]:border-white/8 data-[scrolled=true]:bg-void/70 data-[scrolled=true]:backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <a href="#top" aria-label="BlueX — home" className="shrink-0">
          <Image
            src="/bluex-logo.png"
            alt="BlueX"
            width={525}
            height={271}
            priority
            className="h-11 w-auto sm:h-13"
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <CallCta size="sm" magnetic={false} className="hidden sm:inline-flex">
          Get a call
        </CallCta>
      </div>
    </header>
  );
}
