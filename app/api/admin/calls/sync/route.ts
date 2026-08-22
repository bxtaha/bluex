import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { syncCalls } from "@/lib/call-sync";

/**
 * The Refresh button. Same work the cron does, behind the session guard
 * instead of the shared secret — so the archive is usable before anyone has
 * wired up a scheduler.
 */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const result = await syncCalls();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    console.error("[calls] sync failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not sync the calls." },
      { status: 503 },
    );
  }
}
