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
 * Kept to a single line and under 155 characters, which is the binding limit.
 * Facebook truncates around 300 and LinkedIn and X noticeably earlier, but
 * Google is stricter than all of them and measures pixels rather than
 * characters: the previous 176-character version rendered at 1066px against a
 * ~1000px ceiling and lost its closing clause — the five-minute promise, which
 * is the whole offer — to an ellipsis in search results. This one measures
 * around 850px, so the sentence that ends the description is the sentence
 * readers actually see.
 */
export const SITE_DESCRIPTION =
  "Never miss a call. Never lose a lead. Smart AI agents that answer every single call 24/7 and call back every new client within five minutes.";

export const CONTACT_EMAIL = "hey@bluex.agency";
