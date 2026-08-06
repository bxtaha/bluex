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

export const SITE_DESCRIPTION =
  "A web and AI-automation studio. We build the websites that bring you leads and the AI voice agents that call them within five minutes.";

export const CONTACT_EMAIL = "hey@bluex.agency";
