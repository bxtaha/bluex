import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { publishPricing, createTier, listAllTiers } from "@/lib/pricing";

/** Every tier, hidden ones included. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, tiers: await listAllTiers() });
  } catch (error) {
    console.error("[pricing] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load tiers." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // A create with no body is a blank tier, which is a reasonable thing to ask
    // for from an "Add tier" button.
  }

  try {
    const tier = await createTier(body);
    // Drops the public section's cached copy. Without this the new tier would
    // not appear on the site until the cache expired on its own.
    publishPricing();
    return NextResponse.json({ ok: true, tier }, { status: 201 });
  } catch (error) {
    console.error("[pricing] create failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create the tier." },
      { status: 503 },
    );
  }
}
