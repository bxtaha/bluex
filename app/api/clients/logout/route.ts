import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CLIENT_SESSION_COOKIE,
  destroyClientSession,
} from "@/lib/client-auth";

/**
 * Sign out of the client portal.
 *
 * Deletes the session document as well as clearing the cookie. Clearing only the
 * cookie leaves a token that still verifies, so anyone holding a copy stays
 * signed in — which is the one case signing out exists for.
 *
 * POST rather than GET so a link or an image on another site cannot trigger it.
 */
export async function POST() {
  const store = await cookies();
  const token = store.get(CLIENT_SESSION_COOKIE)?.value;

  try {
    await destroyClientSession(token);
  } catch (error) {
    // The cookie is still cleared below: a browser that cannot reach the
    // database should not be left holding a live-looking session.
    console.error("[clients] could not delete session:", error);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
