import Image from "next/image";
import { ShareLinks } from "@/components/ui/share-links";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const COLUMNS = [
  {
    heading: "Services",
    links: [
      { label: "Outbound voice agents", href: "#services" },
      { label: "Inbound call answering", href: "#services" },
      { label: "Websites & e-commerce", href: "#services" },
      /* Not "How it works", which is what the header nav calls it. Two links
         to the same target under the same words was the page's only repeated
         anchor text — and anchor text is a description of the destination, so
         a second one is only worth having if it describes it differently. */
      { label: "How the callback works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "hey@bluex.agency", href: "mailto:hey@bluex.agency" },
      { label: "Book a call", href: "#top" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-[100rem]">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <Image
              src="/bluex-logo.png"
              alt="BlueX"
              width={525}
              height={271}
              sizes="93px"
              className="h-12 w-auto"
            />
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A web and AI-automation studio for businesses in the Gulf, Canada
              and Australia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((column) => (
              /* `nav` + `aria-label` rather than a heading. These two words
                 were `h2`s, which put "Services" and "Contact" into the
                 document outline at the same level as the real sections of
                 those names — two headings that said nothing new and read as
                 duplicates to a crawler. A labelled landmark is what a group
                 of links actually is, and screen readers announce it the same
                 way the heading did. */
              <nav key={column.heading} aria-label={column.heading}>
                <p className="bx-eyebrow">{column.heading}</p>
                {/* The rows carry their own height now, so the gap between
                    them comes out of the list. */}
                <ul className="mt-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        /* The tap target is the row, not the glyphs. Inline
                           text is only as tall as its line box, which left
                           these at 17px — well under a fingertip. The negative
                           inline margin keeps the text optically flush with
                           the heading above while the padded box extends past
                           it. */
                        className="-mx-2 inline-flex min-h-11 items-center px-2 text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* `pr-16` reserves the lane the back-to-top button and the section
            dock occupy. Nothing in this footer used to reach the right edge —
            the copyright line is a short string on the left — so the fixed
            controls had nothing to sit on top of. The share row does reach it,
            and measured at 959px the last button ran 844–919 against the
            control's 886–930: 33px of it was covered and unclickable. */}
        <div className="mt-12 flex flex-col gap-6 border-t border-white/8 pt-6 pr-16 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            &copy; {new Date().getFullYear()} BlueX. All rights reserved.
          </p>

          <ShareLinks
            url={SITE_URL}
            title={`${SITE_NAME} — ${SITE_TAGLINE}`}
            label="Share"
          />
        </div>
      </div>
    </footer>
  );
}
