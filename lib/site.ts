/**
 * Where this site lives. Absolute URLs are required for canonical links, Open
 * Graph and the sitemap — a relative one there is silently ignored by most
 * consumers rather than resolved.
 *
 * Overridable per environment so preview deployments describe themselves
 * rather than pointing every crawler and link preview at production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bluex.agency"
).replace(/\/$/, "");

export const SITE_NAME = "BlueX";

export const SITE_TAGLINE = "Every lead called back in five minutes";

/**
 * One string, five consumers: the meta description, `og:description`,
 * `twitter:description`, the RSS channel, the organisation's JSON-LD, and the
 * summary line in `/llms.txt`. Changing it changes all of them, which is the
 * point — a site that describes itself differently depending on who asked is
 * a site nobody can quote.
 *
 * Kept to a single line and under ~200 characters. Facebook truncates around
 * 300, LinkedIn and X noticeably earlier, and a sentence cut mid-clause reads
 * worse than one that ended on purpose.
 */
export const SITE_DESCRIPTION =
  "Never miss a call. Never lose a lead. We build smart AI agents solution for your business that answer every single call 24/7 and call back every new client within five minutes.";

export const CONTACT_EMAIL = "hey@bluex.agency";
