import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listCalls } from "@/lib/call-store";
import { getCallSyncState } from "@/lib/call-sync";
import type { CallDirection } from "@/lib/call-payload";

function parseDirection(value: string | null): CallDirection | undefined {
  return value === "inbound" || value === "outbound" ? value : undefined;
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
