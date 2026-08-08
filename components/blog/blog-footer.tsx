import Link from "next/link";
import { Rss } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

/**
 * A short footer for the blog. Not `SiteFooter`, for the same reason the header
 * is not `SiteHeader` — that one is a column of anchors into homepage sections.
 */
export function BlogFooter() {
  return (
    <footer className="relative z-10 border-t border-white/8">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-4 px-6 py-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="transition-colors hover:text-ink">
            Back to the site
          </Link>
          <Link href="/blog" className="transition-colors hover:text-ink">
            All posts
          </Link>
          <a
            href="/blog/rss.xml"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
          >
            <Rss className="size-3.5" strokeWidth={1.8} aria-hidden />
            RSS
          </a>
        </div>
      </div>
    </footer>
  );
}
