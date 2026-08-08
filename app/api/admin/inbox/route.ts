import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSyncState } from "@/lib/imap-sync";
import {
  listThreads,
  unreadThreadCount,
  type ThreadFilter,
} from "@/lib/message-store";

/** Anything else is treated as "all" rather than rejected — it is a view. */
function parseFilter(value: string | null): ThreadFilter {
  return value === "unread" || value === "contact_form" || value === "email"
    ? value
    : "all";
}

/**
 * The thread list, the unread badge and the state of the last IMAP run.
 *
 * All three in one response because the inbox needs all three to render, and
 * three round trips to paint one screen is three chances to show a half-built
 * page.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(request.url);
  const filter = parseFilter(url.searchParams.get("filter"));
  const archived = url.searchParams.get("archived") === "true";

  try {
    const [threads, unread, sync] = await Promise.all([
      listThreads({ filter, archived }),
      unreadThreadCount(),
      getSyncState(),
    ]);

    return NextResponse.json({ ok: true, threads, unread, sync });
  } catch (error) {
    console.error("[inbox] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the inbox." },
      { status: 503 },
    );
  }
}
