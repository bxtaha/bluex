/**
 * Where a visitor is, as a value — with no idea how it was worked out.
 *
 * Split from `geoip.ts` because the two halves have incompatible homes.
 * Resolving an address needs a 110MB dataset and must never reach a browser;
 * *rendering* the answer happens in the admin panel, which is a client
 * component. One file cannot be both `server-only` and importable by the UI.
 *
 * Keeping the type and the formatting here also means `npm test` can pin their
 * behaviour down without importing the dataset — the same pure/impure split
 * `client-schema.ts` and `client-auth.ts` already use.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **There is no address in this type, and that is the point.** The address is
 * read from the request, resolved, and dropped inside the same request.
 * `lib/client-ip.ts` hashes addresses because "an IP address is personal data,
 * and a plain column of them in a marketing site's database is a liability with
 * no matching benefit"; this keeps that promise rather than carving out an
 * exception to it. The test suite asserts these three keys and no others, so an
 * `ip` field added later "just for debugging" fails rather than ships.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type VisitorLocation = {
  /** ISO 3166-1 alpha-2. Empty when unknown. */
  country: string;
  /**
   * The subdivision **code**, not its name — `"C"`, not `"Dhaka Division"`.
   * That is what the dataset carries, and translating codes to names would mean
   * shipping a second dataset to display a field nobody filters on.
   */
  region: string;
  /** Frequently empty. The dataset knows far more countries than cities. */
  city: string;
};

/**
 * Normalises the shapes an address actually arrives in.
 *
 * `x-forwarded-for` is written by whatever proxy chain a request crossed, so
 * entries turn up bare, with a port, and as bracketed IPv6. None of that is
 * exotic — it is what the header looks like in the wild, and this value comes
 * from a header a client can set to anything at all.
 */
export function normaliseAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  // `[::1]:443` → `::1`
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(trimmed);
  if (bracketed) return bracketed[1];

  // `1.2.3.4:443` → `1.2.3.4`. IPv4 only: a bare IPv6 address is full of
  // colons and stripping after the last one would corrupt it.
  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(trimmed);
  if (withPort) return withPort[1];

  return trimmed;
}

/**
 * For display. Never renders a stray separator for a part the dataset lacked.
 *
 * The dataset knows a country far more often than a city, so `", BD"` is the
 * common failure this exists to prevent.
 */
export function formatLocation(location: VisitorLocation | null | undefined): string {
  if (!location) return "Unknown";

  const parts = [location.city, location.country].filter((part) => part.trim().length > 0);
  return parts.length > 0 ? parts.join(", ") : "Unknown";
}
