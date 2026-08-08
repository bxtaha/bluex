import { createHash } from "node:crypto";

/**
 * Who sent this request, and how we store that.
 *
 * The site sits behind Traefik (see docker-compose.yml), so `x-forwarded-for`
 * is the real client address and the socket address is the proxy's. The header
 * is a comma-separated chain appended to by each hop; the left-most entry is
 * the original client and is also the only one a client can forge. That is
 * acceptable here — the two things it feeds are a spam counter and an audit
 * breadcrumb, not authorisation — but it is why this must never gate anything
 * that matters.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * A one-way digest of an address, salted.
 *
 * An IP address is personal data, and a plain column of them in a marketing
 * site's database is a liability with no matching benefit: nothing here ever
 * needs to know *which* address, only whether two submissions came from the
 * same one. Hashing keeps that comparison and discards the rest.
 *
 * The salt matters. The IPv4 space is small enough to enumerate in seconds, so
 * an unsalted SHA-256 of an address is reversible by anyone with a laptop.
 * `IP_HASH_SALT` falls back to the session secret, which is already required to
 * be set and secret; with neither, hashing is skipped entirely rather than
 * writing a digest that only looks protective.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.ADMIN_SESSION_SECRET;
  if (!salt) return "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
