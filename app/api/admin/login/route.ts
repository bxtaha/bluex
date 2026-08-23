import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSession,
  login,
} from "@/lib/admin-auth";
import { clientIp, hashIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Admin sign-in.
 *
 * Credentials are checked here and nowhere else. The client posts what was
 * typed and receives a yes or a no; it never sees a hash, a user record, or
 * anything it could compare against offline.
 */

/**
 * Per-address attempt cap, in front of the per-account lockout in `login()`.
 *
 * The lockout alone left two holes. One address could try a single likely
 * password against a hundred addresses and never trip a per-account counter,
 * because each account only saw one failure. And anyone who knew an
 * administrator's email could take the account away for fifteen minutes
 * whenever they liked by failing eight logins against it — a lockout with
 * nothing in front of it is a denial-of-service aimed at the account it
 * protects.
 *
 * Ten rather than eight, so an administrator mistyping a password twice before
 * getting it right is never the person this stops.
 */
const IP_LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

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

  // Checked before the password is verified, not after. scrypt is deliberately
  // expensive — ~32MB and real CPU per call — so an unlimited endpoint that
  // reaches it is a way to exhaust the server without guessing anything.
  const ip = clientIp(await headers());
  const limit = await rateLimit(
    `admin-login:ip:${hashIp(ip) || ip}`,
    IP_LIMIT,
    WINDOW_MS,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again in a few minutes." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000)),
          ),
        },
      },
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
