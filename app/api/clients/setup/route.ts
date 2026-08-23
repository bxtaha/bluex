import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { MIN_PASSWORD_LENGTH, SESSION_MAX_AGE } from "@/lib/auth-core";
import {
  CLIENT_SESSION_COOKIE,
  completeSetup,
  createClientSession,
} from "@/lib/client-auth";
import { clientIp, hashIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Completes an invitation: sets the password the setup link was issued for.
 *
 * The single-use guarantee lives in `completeSetup`, as one conditional update.
 * This route's job is the envelope — limit, validate, then hand the browser a
 * session so the person who just chose a password is not immediately asked to
 * type it again.
 */

/**
 * The token is 256 bits, so this is not what makes guessing infeasible — the
 * token's own entropy is. The limit is here because the endpoint does a database
 * lookup per request and an unbounded one is worth capping regardless.
 */
const IP_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const ip = clientIp(await headers());
  const limit = await rateLimit(
    `client-setup:ip:${hashIp(ip) || ip}`,
    IP_LIMIT,
    WINDOW_MS,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json(
      { ok: false, message: "That setup link is not valid." },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await completeSetup(body.token, body.password);
  } catch (error) {
    console.error("[clients] setup failed:", error);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Try again shortly." },
      { status: 503 },
    );
  }

  if (!result.ok) {
    // Each reason gets its own message, because every one of them is actionable
    // and none of them discloses anything: whoever holds the token already holds
    // the secret. Telling someone "this link has expired" when it has is the
    // difference between asking for a new one and assuming they mistyped a
    // password.
    const messages: Record<typeof result.reason, string> = {
      weak: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      unknown: "That setup link is not valid. Ask us for a new one.",
      expired: "That setup link has expired. Ask us for a new one.",
      used: "That setup link has already been used. Sign in instead.",
      suspended: "This account is not active. Get in touch and we will help.",
    };

    return NextResponse.json(
      { ok: false, message: messages[result.reason] },
      { status: result.reason === "weak" ? 400 : 410 },
    );
  }

  // Signed in immediately. The alternative is bouncing someone to a login form
  // to retype the password they chose four seconds ago, which teaches nothing
  // and loses people.
  const token = await createClientSession(result.client);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
