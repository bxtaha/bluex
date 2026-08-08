import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySession } from "@/lib/admin-auth";

/**
 * Sign out.
 *
 * Deletes the session document as well as clearing the cookie. Clearing only
 * the cookie would leave a token that still verifies — anyone holding a copy
 * would remain signed in, which is precisely the case signing out exists for.
 *
 * POST rather than GET so a link or an image on another site cannot trigger it.
 */
export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  try {
    await destroySession(token);
  } catch (error) {
    // The cookie is still cleared below: a browser that cannot reach the
    // database should not be left holding a live-looking session.
    console.error("[admin] could not delete session:", error);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
