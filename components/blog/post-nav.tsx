import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PostCard } from "@/lib/blog-store";

/**
 * Previous and next, in publication order.
 *
 * "Previous" is the older post and "next" is the newer one, which matches the
 * index above: a reader arriving from the list is moving down it, and the
 * opposite convention reads correctly on a single page and backwards the moment
 * anyone came from anywhere.
 *
 * Either side may be missing — the first and last posts each have one
 * neighbour — so the grid places them by column rather than by order, and a
 * lone "next" stays on the right where it belongs.
 */
export function PostNav({
  previous,
  next,
}: {
  previous: PostCard | null;
  next: PostCard | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav className="bx-post-nav" aria-label="More posts">
      {previous && (
        <Link href={`/blog/${previous.slug}`} className="bx-post-nav__item">
          <span className="bx-post-nav__label">
            <ArrowLeft className="size-3.5" strokeWidth={1.8} aria-hidden />
            Previous
          </span>
          <span className="bx-post-nav__title">{previous.title}</span>
        </Link>
      )}

      {next && (
        <Link
          href={`/blog/${next.slug}`}
          className="bx-post-nav__item bx-post-nav__item--next"
        >
          <span className="bx-post-nav__label">
            Next
            <ArrowRight className="size-3.5" strokeWidth={1.8} aria-hidden />
          </span>
          <span className="bx-post-nav__title">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
