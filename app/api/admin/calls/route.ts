import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getCallByConversationId, listCalls } from "@/lib/call-store";
import { getCallSyncState } from "@/lib/call-sync";
import type { CallDirection } from "@/lib/call-payload";

function parseDirection(value: string | null): CallDirection | undefined {
  return value === "inbound" || value === "outbound" ? value : undefined;
}

/**
 * The archive: list, search, or one call by conversation id.
 *
 * The single-call lookup shares this route rather than getting its own,
 * because the Leads panel wants exactly one thing — the call behind a lead —
 * and a second endpoint for a one-line query is a second thing to keep in step.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;

  const conversation = params.get("conversation");
  if (conversation) {
    try {
      return NextResponse.json({
        ok: true,
        call: await getCallByConversationId(conversation),
      });
    } catch (error) {
      console.error("[calls] lookup failed:", error);
      return NextResponse.json(
        { ok: false, message: "Could not load that call." },
        { status: 503 },
      );
    }
  }

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
