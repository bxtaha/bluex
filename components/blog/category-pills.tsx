import Link from "next/link";

/**
 * Category filters.
 *
 * Links, not buttons. Each filtered view is a real URL that can be shared,
 * bookmarked, indexed and opened in a new tab, and it works with JavaScript
 * off — none of which is true of a client-side filter over a list the server
 * already had to query. It also means this component ships no JavaScript at
 * all.
 */
export function CategoryPills({
  categories,
  active,
}: {
  categories: string[];
  /** The category currently filtered on, or "" for all. */
  active: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav className="bx-cat-pills" aria-label="Filter by category">
      <Link
        href="/blog"
        className="bx-cat-pill"
        aria-current={active === "" ? "page" : undefined}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/blog?category=${encodeURIComponent(category)}`}
          className="bx-cat-pill"
          aria-current={active === category ? "page" : undefined}
        >
          {category}
        </Link>
      ))}
    </nav>
  );
}
