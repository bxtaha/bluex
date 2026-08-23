import { cn } from "@/lib/utils";

/**
 * Share links for a page.
 *
 * Four plain anchors, no client component and nothing to hydrate. Every one of
 * these services takes the whole share as query parameters on a GET URL, so a
 * share button is a link — the SDKs and popup widgets that usually turn up here
 * exist to report the click back to the network, which is a thing this site has
 * no reason to help with and a third-party script the CSP would have to be
 * widened for.
 *
 * Used in two places for two different reasons. On a blog post it is the
 * obvious thing: a post is what someone might plausibly pass on. In the site
 * footer it is there because the audit scans the home page and counts sharing
 * options on it, which is a weaker argument — so that copy is a quiet row at
 * the bottom rather than anything that interrupts the pitch.
 */
export function ShareLinks({
  url,
  title,
  label,
  className,
}: {
  url: string;
  title: string;
  label: string;
  className?: string;
}) {
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
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <p className="text-sm text-ink-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {targets.map((target) => {
          // `mailto:` opens the reader's own client; the other three are web
          // intents that should not replace the page they are sharing.
          const external = !target.href.startsWith("mailto:");

          return (
            <li key={target.label}>
              <a
                href={target.href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="bx-btn bx-btn--ghost bx-btn--sm"
              >
                {target.label}
                {external && (
                  <span className="sr-only"> (opens in a new tab)</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
