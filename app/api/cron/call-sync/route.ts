import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncCalls } from "@/lib/call-sync";

/**
 * The scheduled call reconciliation. Point a cron at this every 5–15 minutes.
 *
 * Behind the same shared secret as the mail sync, for the same reason: a
 * scheduler has no session, and an unauthenticated endpoint that makes paid
 * upstream API calls is a way to spend someone else's money from the outside.
 *
 * With `CRON_SECRET` unset it refuses everything. "We forgot to set it" must
 * not be the same as "anyone may call it".
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;

  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await syncCalls();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export const GET = run;
export const POST = run;
