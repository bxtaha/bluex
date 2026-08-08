import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncInbox } from "@/lib/imap-sync";

/**
 * The scheduled mail pull. Point a cron at this every 2–5 minutes.
 *
 * Not behind the admin session guard, because a scheduler has no session. It is
 * behind a shared secret instead, sent as `Authorization: Bearer …` — a header,
 * not a query string, because query strings end up in access logs.
 *
 * If `CRON_SECRET` is unset the route refuses everything rather than running
 * open. An unauthenticated endpoint that opens an IMAP connection is a way to
 * exhaust the mail server's connection limit from the outside, and "we forgot
 * to set it" must not be the same as "anyone may call it".
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;

  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // Compared in constant time. `===` on secrets leaks their length and prefix
  // through timing, and a cron endpoint is called often enough to measure.
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await syncInbox();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

// Both verbs: schedulers disagree about which one a job should use, and this
// endpoint is idempotent either way.
export const GET = run;
export const POST = run;
