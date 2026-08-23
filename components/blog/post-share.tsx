import { SITE_URL } from "@/lib/site";

/**
 * Share links for a post.
 *
 * Four plain anchors, no client component and nothing to hydrate. Every one of
 * these services takes the whole share as query parameters on a GET URL, so a
 * share button is a link — the SDKs and popup widgets that usually turn up here
 * exist to report the click back to the network, which is a thing this site has
 * no reason to help with and a third-party script the CSP would have to be
 * widened for.
 *
 * The audit's "limited social sharing" sat in the same tier as the missing
 * touch icon and is not going to move a ranking on its own. It is on the blog
 * rather than the marketing page on purpose: a post is the thing someone might
 * plausibly pass on, and share buttons on a landing page are furniture.
 */
export function PostShare({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  const url = `${SITE_URL}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      label: "X",
      href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
      <p className="text-sm text-ink-muted">Share this</p>
      <ul className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <li key={target.label}>
            <a
              href={target.href}
              // `mailto:` opens the reader's own client; the other three are
              // web intents that should not replace the post they are sharing.
              {...(target.href.startsWith("mailto:")
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="bx-btn bx-btn--ghost bx-btn--sm"
            >
              {target.label}
              {!target.href.startsWith("mailto:") && (
                <span className="sr-only"> (opens in a new tab)</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
