import Image from "next/image";

const COLUMNS = [
  {
    heading: "Services",
    links: [
      { label: "AI voice automation", href: "#services" },
      { label: "Websites & e-commerce", href: "#services" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: "hello@bluex.dev", href: "mailto:hello@bluex.dev" },
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
              className="h-12 w-auto"
            />
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A web and AI-automation studio for businesses in the Gulf, Canada
              and Australia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="bx-eyebrow">{column.heading}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 border-t border-white/8 pt-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} BlueX. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
