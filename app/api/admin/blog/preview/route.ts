import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { readPostById } from "@/lib/blog";

/**
 * Redirects to a path, not to a URL.
 *
 * `NextResponse.redirect` demands an absolute URL, and the only origin
 * available to build one from is the server's own — which in the standalone
 * build is whatever `HOSTNAME` is set to. In this container that is `0.0.0.0`,
 * so the redirect sent the browser to a *different origin* from the one it
 * asked on, the draft cookie set alongside it was not sent to that origin, and
 * the preview 404'd. Behind Traefik the same bug would send visitors to the
 * internal service address.
 *
 * A relative `Location` is valid HTTP (RFC 7231 §7.1.2) and every client
 * resolves it against the request URL, which is exactly the origin the cookie
 * belongs to.
 */
function redirectTo(path: string): Response {
  return new Response(null, { status: 307, headers: { location: path } });
}

/** Only same-site paths. A `//evil.example` Location is an open redirect. */
function safePath(value: string | null, fallback: string): string {
  return value && /^\/(?!\/)/.test(value) ? value : fallback;
}

/**
 * The draft-preview door.
 *
 * Enabling draft mode sets a signed, httpOnly cookie that Next itself issues;
 * `/blog/[slug]` reads it and, only then, will load an unpublished post. The
 * important property is that **this route is the only thing that sets it**, and
 * it is behind the admin session guard — so the preview branch on the post page
 * is reachable only by someone who was signed in when they asked.
 *
 * A redirect rather than JSON: the point is to land on the real post URL with
 * the real layout, which is what makes a preview worth having.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Leaving preview needs no session. Someone who has ended up with a stale
  // draft cookie should always be able to get rid of it, and turning it off can
  // only ever show them less.
  if (url.searchParams.get("exit") === "1") {
    (await draftMode()).disable();
    return redirectTo(safePath(url.searchParams.get("to"), "/blog"));
  }

  const denied = await requireAdmin();
  if (denied) return denied;

  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Which post?" },
      { status: 400 },
    );
  }

  try {
    // Resolved from the id rather than trusting a slug in the query string: the
    // redirect target then comes from the database, so this cannot be pointed
    // at an arbitrary path by editing the URL.
    const post = await readPostById(id);
    if (!post) {
      return NextResponse.json(
        { ok: false, message: "No such post." },
        { status: 404 },
      );
    }

    (await draftMode()).enable();
    return redirectTo(`/blog/${encodeURIComponent(post.slug)}`);
  } catch (error) {
    console.error("[blog] preview failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not start the preview." },
      { status: 503 },
    );
  }
}
