import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";

/**
 * The guard every admin API route runs first.
 *
 * Extracted so no route can forget it — the check is one call and its failure
 * is a response the caller returns unchanged. An authorisation check that has
 * to be re-typed at the top of each handler is one that eventually is not.
 *
 * Returns `null` when the request is authorised.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const store = await cookies();

  let user;
  try {
    user = await getSessionUser(store.get(SESSION_COOKIE)?.value);
  } catch (error) {
    // Fail closed: unable to verify is not the same as verified, and the safe
    // reading of "I cannot tell" is "no".
    console.error("[admin] could not verify session:", error);
    return NextResponse.json(
      { ok: false, message: "Service unavailable." },
      { status: 503 },
    );
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Not signed in." },
      { status: 401 },
    );
  }

  return null;
}
