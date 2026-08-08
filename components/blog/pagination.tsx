import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Page links.
 *
 * Numbered pages rather than infinite scroll, which the brief offered as an
 * alternative. Infinite scroll on a blog costs you the footer, deep links to
 * page 3, and the browser's own restore-my-position behaviour — and it needs
 * JavaScript to show content that is otherwise already rendered. Numbered pages
 * are links.
 *
 * Every page beyond the first is `noindex`-free but naturally low value; the
 * canonical on each view points at itself, so a crawler sees a chain rather
 * than twelve near-duplicates of `/blog`.
 */
export function Pagination({
  page,
  totalPages,
  category,
}: {
  page: number;
  totalPages: number;
  category: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/blog?${query}` : "/blog";
  };

  // Every page number, because a blog with more than a handful of pages of
  // posts is a problem this site does not have yet. Windowing here would be
  // machinery guarding against a case that has never occurred.
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="bx-pagination" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="bx-pagination__step" rel="prev">
          <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
          <span>Newer</span>
        </Link>
      )}

      <ol className="bx-pagination__list">
        {pages.map((n) => (
          <li key={n}>
            <Link
              href={href(n)}
              className="bx-pagination__page"
              aria-current={n === page ? "page" : undefined}
              aria-label={`Page ${n}`}
            >
              {n}
            </Link>
          </li>
        ))}
      </ol>

      {page < totalPages && (
        <Link href={href(page + 1)} className="bx-pagination__step" rel="next">
          <span>Older</span>
          <ChevronRight className="size-4" strokeWidth={1.8} aria-hidden />
        </Link>
      )}
    </nav>
  );
}
