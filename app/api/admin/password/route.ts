import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  changePassword,
  createSession,
  getSessionUser,
  revokeAllSessions,
} from "@/lib/admin-auth";

/**
 * Change the signed-in account's password.
 *
 * Two guards, not one: the request must carry a valid session *and* know the
 * current password. The session says which account is being changed; the
 * password says the person asking is entitled to change it.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  let sessionUser;
  try {
    sessionUser = await getSessionUser(token);
  } catch (error) {
    console.error("[admin] could not verify session:", error);
    return NextResponse.json(
      { ok: false, message: "Service unavailable. Try again shortly." },
      { status: 503 },
    );
  }

  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, message: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await changePassword(
      sessionUser.email,
      body.currentPassword,
      body.newPassword,
    );
  } catch (error) {
    console.error("[admin] password change failed:", error);
    return NextResponse.json(
      { ok: false, message: "Service unavailable. Try again shortly." },
      { status: 503 },
    );
  }

  if (!result.ok) {
    const message =
      result.reason === "weak"
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : result.reason === "same"
          ? "That is already your password."
          : "Your current password is not correct.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  // Everything is signed out, including this browser's own session, and then
  // this browser alone is given a new one. Anyone else holding a cookie for
  // this account — which is often the reason a password is being changed — is
  // dropped immediately rather than at their own leisure.
  try {
    await revokeAllSessions(result.user._id!);
    const fresh = await createSession(result.user);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    // The password itself did change. Say so, rather than reporting a failure
    // that would have them try the old one again.
    console.error("[admin] could not reissue session:", error);
    return NextResponse.json(
      {
        ok: true,
        message: "Password changed. Please sign in again.",
        reauth: true,
      },
      { status: 200 },
    );
  }
}
