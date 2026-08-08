import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { syncInbox } from "@/lib/imap-sync";

/**
 * The "Refresh" button.
 *
 * The same function the scheduled job runs, behind the admin guard instead of
 * the cron secret. One implementation, two doors — a manual refresh that took
 * a different path from the automatic one would be a second thing to keep
 * correct, and the one that runs less often is the one that quietly breaks.
 */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const result = await syncInbox();
  // 200 either way: the request itself succeeded, and the UI shows the reason
  // the mailbox could not be reached rather than a bare failed fetch.
  return NextResponse.json(result);
}
