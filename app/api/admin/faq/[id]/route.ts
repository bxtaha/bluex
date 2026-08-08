import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteFaq, publishFaqs, updateFaq } from "@/lib/faq";

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
    const faq = await updateFaq(id, body);
    if (!faq) {
      return NextResponse.json(
        { ok: false, message: "No such question." },
        { status: 404 },
      );
    }

    publishFaqs();
    return NextResponse.json({ ok: true, faq });
  } catch (error) {
    console.error("[faq] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the question." },
      { status: 503 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    if (!(await deleteFaq(id))) {
      return NextResponse.json(
        { ok: false, message: "No such question." },
        { status: 404 },
      );
    }

    publishFaqs();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[faq] delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not delete the question." },
      { status: 503 },
    );
  }
}
