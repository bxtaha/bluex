import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CLIENT_SESSION_COOKIE,
  getClientSessionUser,
  type SessionClient,
} from "@/lib/client-auth";

/**
 * The guard every client API route runs first.
 *
 * The counterpart to `requireAdmin`, and deliberately not the same function with
 * a parameter. Two call sites that read two different cookies against two
 * different collections cannot be made to authorise each other by accident; one
 * function taking a `role` argument can, the first time someone omits it or
 * passes the wrong constant.
 *
 * Returns the client when authorised, or a response the caller returns unchanged.
 */
export async function requireClient(): Promise<
  { client: SessionClient; denied: null } | { client: null; denied: NextResponse }
> {
  const store = await cookies();

  let client: SessionClient | null;
  try {
    client = await getClientSessionUser(store.get(CLIENT_SESSION_COOKIE)?.value);
  } catch (error) {
    // Fail closed, for the same reason the admin guard does: unable to verify is
    // not the same as verified, and the safe reading of "I cannot tell" is "no".
    console.error("[clients] could not verify session:", error);
    return {
      client: null,
      denied: NextResponse.json(
        { ok: false, message: "Service unavailable." },
        { status: 503 },
      ),
    };
  }

  if (!client) {
    return {
      client: null,
      denied: NextResponse.json(
        { ok: false, message: "Not signed in." },
        { status: 401 },
      ),
    };
  }

  return { client, denied: null };
}

/**
 * The page-level equivalent, for server components.
 *
 * Returns null rather than redirecting, so the caller decides where to send
 * someone — `redirect()` throws to unwind, and a helper that throws on behalf of
 * its caller is harder to reason about at the call site than one that answers
 * the question it was asked.
 */
export async function currentClient(): Promise<SessionClient | null> {
  const store = await cookies();

  try {
    return await getClientSessionUser(store.get(CLIENT_SESSION_COOKIE)?.value);
  } catch (error) {
    console.error("[clients] could not verify session:", error);
    return null;
  }
}
