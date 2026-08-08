/**
 * Presentation helpers shared by the teaser, the index, the post page and the
 * feed. Dependency-free, so client and server components can both use them.
 */

/**
 * A date, written the same way everywhere.
 *
 * The locale is pinned to `en-GB` rather than left to the reader's, which is
 * the opposite of what the admin inbox does — and deliberately. These dates are
 * rendered once during static generation and then served to everyone, so
 * "the reader's locale" is really "whatever locale the build machine had". A
 * fixed one is at least honest about that, and it matches the `datetime`
 * attribute beside it.
 */
export function formatPostDate(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The machine-readable half of a `<time>` element. */
export function isoDate(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function readTimeLabel(minutes: number): string {
  return `${Math.max(1, minutes)} min read`;
}

/**
 * Asks Cloudinary for a smaller image.
 *
 * Cover images are stored as whatever URL the admin saved, which may be a
 * Cloudinary delivery URL or a link to somewhere else entirely. That is why
 * these render through a plain `<img>` rather than `next/image`: the optimiser
 * refuses any host not listed in `next.config.ts` at build time, so a pasted
 * URL from an unlisted host would render a server error instead of a picture.
 *
 * When the URL *is* Cloudinary, its transformation segment does the same job —
 * width-capped, auto format, auto quality — on their CDN rather than ours.
 * Anything else is returned untouched.
 */
export function coverImageUrl(url: string, width: number): string {
  if (!url) return "";
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || at === -1) return url;

  const head = url.slice(0, at + marker.length);
  const tail = url.slice(at + marker.length);
  // A URL that already carries a transformation is left alone rather than
  // having a second one stacked in front of it.
  if (/^[a-z]_[^/]+\//.test(tail)) return url;

  return `${head}f_auto,q_auto,c_limit,w_${width}/${tail}`;
}
