import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { SESSION_MAX_AGE } from "@/lib/auth-core";
import {
  CLIENT_SESSION_COOKIE,
  clientLogin,
  createClientSession,
} from "@/lib/client-auth";
import { clientIp, hashIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Client portal sign-in.
 *
 * The same shape as the admin route, against a different collection and setting
 * a different cookie. Sharing the handler would mean one endpoint that decides
 * which collection to consult from something in the request, and that decision
 * is the exact thing this design is trying not to have.
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

  // Before the password check, so a flood never reaches scrypt. See the admin
  // login route for why that ordering is the point rather than a detail.
  const ip = clientIp(await headers());
  const limit = await rateLimit(
    `client-login:ip:${hashIp(ip) || ip}`,
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
    result = await clientLogin(body.email, body.password);
  } catch (error) {
    console.error("[clients] login failed to reach the database:", error);
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

    // "invited" and "inactive" both return the generic message rather than the
    // true one. Saying "this account has not finished setup" or "this account is
    // deactivated" confirms the address is a real customer of ours, which is
    // worth more to someone probing than it is to the person who mistyped their
    // password. A client genuinely in either state needs to talk to us anyway,
    // and the contact route for that is not this form.
    return NextResponse.json(
      { ok: false, message: "Those details did not match." },
      { status: 401 },
    );
  }

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
