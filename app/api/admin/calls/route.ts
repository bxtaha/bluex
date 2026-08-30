import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listCalls } from "@/lib/call-store";
import { getCallSyncState } from "@/lib/call-sync";
import type { CallChannel, CallDirection } from "@/lib/call-payload";

function parseDirection(value: string | null): CallDirection | undefined {
  return value === "inbound" || value === "outbound" ? value : undefined;
}

function parseChannel(value: string | null): CallChannel | undefined {
  return value === "phone" || value === "web" ? value : undefined;
}

/**
 * The archive: list, search, or every call for one lead via `?lead=` (what
 * the Leads panel actually uses to show a person's call history).
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;

  try {
    const [calls, sync] = await Promise.all([
      listCalls({
        direction: parseDirection(params.get("direction")),
        // Unused by the panel today, which distinguishes the two with a badge
        // rather than a filter. It exists because `listCalls` needs the caller
        // to spell out which channel it wants, and a query parameter is the
        // one honest way to ask for that over HTTP.
        channel: parseChannel(params.get("channel")),
        query: params.get("q") ?? undefined,
        leadId: params.get("lead") ?? undefined,
      }),
      getCallSyncState(),
    ]);

    return NextResponse.json({ ok: true, calls, sync });
  } catch (error) {
    console.error("[calls] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the calls." },
      { status: 503 },
    );
  }
}
