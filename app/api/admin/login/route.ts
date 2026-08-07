import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearAttempts,
  createSessionToken,
  isValidLogin,
  recordFailure,
  tooManyAttempts,
} from "@/lib/admin-auth";

/**
 * Admin sign-in.
 *
 * The comparison happens here and only here. The client posts the credentials
 * and gets back a yes or a no — it never receives the expected values, so the
 * password is not sitting in the JavaScript bundle for anyone who opens
 * devtools.
 *
 * The session comes back as an httpOnly cookie, which script on the page cannot
 * read, so an XSS elsewhere on the site cannot lift it.
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

  // Behind a proxy the socket address is the proxy's, so the forwarded header
  // is the only thing resembling a client identity. It is spoofable, which is
  // part of why the throttle below is a speed bump rather than a control.
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  if (!isValidLogin(body.email, body.password)) {
    recordFailure(key);
    // One message for both a wrong address and a wrong password: saying which
    // was wrong tells an attacker when they have found a real account.
    return NextResponse.json(
      { ok: false, message: "Those details did not match." },
      { status: 401 },
    );
  }

  clearAttempts(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
