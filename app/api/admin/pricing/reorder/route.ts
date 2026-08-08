import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { publishPricing, reorderTiers } from "@/lib/pricing";

/**
 * Takes the full list of ids in their intended order.
 *
 * Not "move this one up": two tabs open on this page, or one left open while
 * the other reorders, would otherwise apply relative moves against different
 * starting states and interleave into an order neither asked for.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.ids) ||
    !body.ids.every((id): id is string => typeof id === "string")
  ) {
    return NextResponse.json(
      { ok: false, message: "Expected an array of ids." },
      { status: 400 },
    );
  }

  try {
    await reorderTiers(body.ids);
    publishPricing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pricing] reorder failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the order." },
      { status: 503 },
    );
  }
}
