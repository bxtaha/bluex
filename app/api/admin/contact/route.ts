import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getContactSettings,
  publishContact,
  updateContactSettings,
} from "@/lib/contact";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, settings: await getContactSettings() });
  } catch (error) {
    console.error("[contact] settings read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the contact details." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

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
    const settings = await updateContactSettings(body);
    // Drops the cached read *and* the prerendered page — see `publishContact`.
    publishContact();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[contact] settings save failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the contact details." },
      { status: 503 },
    );
  }
}
