import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
  login,
} from "@/lib/admin-auth";

/**
 * Admin sign-in.
 *
 * Credentials are checked here and nowhere else. The client posts what was
 * typed and receives a yes or a no; it never sees a hash, a user record, or
 * anything it could compare against offline.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };

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
    result = await login(body.email, body.password);
  } catch (error) {
    // A database that is down is not a failed login, and saying so is the
    // difference between "check your password" and twenty minutes of confusion.
    console.error("[admin] login failed to reach the database:", error);
    return NextResponse.json(
      { ok: false, message: "Sign in is unavailable right now." },
      { status: 503 },
    );
  }

  if (!result.ok) {
    if (result.reason === "locked") {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many failed attempts. Try again in 15 minutes.",
        },
        { status: 429 },
      );
    }

    // One message whether the address is unknown or the password is wrong:
    // distinguishing them tells an attacker when they have found a real
    // account.
    return NextResponse.json(
      { ok: false, message: "Those details did not match." },
      { status: 401 },
    );
  }

  const token = await createSession(result.user);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    // Unreadable to script, so an XSS anywhere on the site cannot lift it.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
