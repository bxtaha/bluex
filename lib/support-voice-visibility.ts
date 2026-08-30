import type { SupportVoiceVisibilityMode } from "./support-voice-schema.ts";

/**
 * Which pages the support button appears on.
 *
 * Pure and framework-free, because it runs in two places that share nothing
 * else: the browser, where `usePathname()` decides whether to render the
 * launcher, and the server, where the settings are normalised before storage.
 * One matcher means the rule an administrator typed and the rule the page
 * applies cannot drift apart.
 *
 * The grammar is deliberately two-thirds of what a glob would give you. An
 * entry is either an exact path (`/pricing`) or a prefix wildcard (`/blog/*`).
 * That is enough for "this page" and "this section", which is the whole of
 * what the setting is for, and it is small enough to explain in the one line
 * of help text under the field. A full glob would need a dependency and a
 * paragraph.
 */

/** Trailing slashes and case are not meaningful in a route here; a bare `/` is. */
function normalise(path: string): string {
  const trimmed = path.trim().toLowerCase();
  const withoutTrailing = trimmed.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

function matches(pathname: string, entry: string): boolean {
  const target = normalise(pathname);

  if (entry.endsWith("/*")) {
    // `/blog/*` covers `/blog` itself as well as everything beneath it —
    // "this section" is what someone means by it, and a section includes its
    // own index page.
    const base = normalise(entry.slice(0, -2));
    if (base === "/") return true;
    // The `/` in the second test is what stops `/blog/*` matching `/blogging`.
    // `startsWith(base)` alone does, which is the bug this line exists for.
    return target === base || target.startsWith(`${base}/`);
  }

  return target === normalise(entry);
}

export function isVisibleOnPath(
  pathname: string,
  mode: SupportVoiceVisibilityMode,
  paths: string[],
): boolean {
  if (mode === "all") return true;

  const hit = paths.some((entry) => matches(pathname, entry));

  // Not symmetric, and not by accident. "Only these paths" with no paths named
  // is a request for nowhere; "all except nothing" is everywhere. Collapsing
  // the empty case to one answer would make one of the two modes lie.
  return mode === "only" ? hit : !hit;
}

/** Enough entries for a real site, few enough that a paste cannot fill the document. */
const MAX_ENTRIES = 50;

/** `/blog/` and `/blog` both spell the same wildcard; `/` spells `/*`, not `//*`. */
function wildcardOf(base: string): string {
  const root = normalise(base);
  return root === "/" ? "/*" : `${root}/*`;
}

/**
 * A textarea, as typed by a person, into a list this file can match against.
 *
 * Accepts commas as well as newlines because both are what people actually
 * type into a box that holds several paths, and adds the leading slash rather
 * than rejecting a line for missing it — `pricing` is unambiguous and refusing
 * it would be pedantry with a form error attached.
 */
export function parsePathList(raw: string): string[] {
  const seen = new Set<string>();

  for (const piece of raw.split(/[\n,]/)) {
    const trimmed = piece.trim();
    if (!trimmed) continue;

    const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    // Collapses `/pricing` and `/pricing/` to one entry, so a list cannot hold
    // the same rule twice in two spellings.
    const cleaned = withSlash.endsWith("/*")
      ? wildcardOf(withSlash.slice(0, -2))
      : normalise(withSlash);

    seen.add(cleaned);
    if (seen.size >= MAX_ENTRIES) break;
  }

  return [...seen];
}

/** The stored list, back into something a textarea can show. */
export function formatPathList(paths: string[]): string {
  return paths.join("\n");
}
