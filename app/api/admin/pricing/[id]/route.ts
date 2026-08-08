import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { publishPricing, deleteTier, updateTier } from "@/lib/pricing";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  try {
    const tier = await updateTier(id, body);
    if (!tier) {
      return NextResponse.json(
        { ok: false, message: "No such tier." },
        { status: 404 },
      );
    }

    publishPricing();
    return NextResponse.json({ ok: true, tier });
  } catch (error) {
    console.error("[pricing] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the tier." },
      { status: 503 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    if (!(await deleteTier(id))) {
      return NextResponse.json(
        { ok: false, message: "No such tier." },
        { status: 404 },
      );
    }

    publishPricing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pricing] delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not delete the tier." },
      { status: 503 },
    );
  }
}
