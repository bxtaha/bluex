"use client";

import Link from "next/link";
import Image from "next/image";
import { CallCta } from "@/components/ui/call-cta";

/**
 * The blog's own header.
 *
 * Not `SiteHeader`. That one is a section indicator: its links are anchors into
 * the homepage, driven by `SectionProvider`'s observer, and its highlight
 * follows whichever section is crossing the middle of the viewport. On a blog
 * page none of those sections exist, so every link would be a no-op and the
 * indicator would have nothing to point at.
 *
 * The material is shared, though — same `.site-header__pill` glass, same
 * tokens — so this reads as the same site rather than a subdomain someone
 * bolted on.
 */
export function BlogHeader() {
  return (
    <header className="site-header" data-scrolled="true">
      <div className="relative mx-auto flex max-w-[100rem] items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-16">
        <Link
          href="/"
          aria-label="BlueX — home"
          className="site-header__edge shrink-0"
        >
          <Image
            src="/bluex-logo.png"
            alt="BlueX"
            width={525}
            height={271}
            priority
            /* Same slot and the same `sizes` as the marketing header: without
               it the browser has no width to reason about and downloads the
               1080px source for a 108px box. */
            sizes="(min-width: 640px) 108px, 93px"
            className="h-12 w-auto sm:h-14"
          />
        </Link>

        <nav className="site-header__pill" aria-label="Main">
          <ul className="site-header__list">
            <li>
              <Link href="/" className="site-header__link">
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="site-header__link"
                aria-current="page"
              >
                Writing
              </Link>
            </li>
          </ul>
        </nav>

        <div className="site-header__actions">
          <CallCta size="sm" magnetic={false}>
            Get a call
          </CallCta>
        </div>
      </div>
    </header>
  );
}
