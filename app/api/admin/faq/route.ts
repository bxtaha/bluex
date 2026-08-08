import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createFaq, listAllFaqs, publishFaqs } from "@/lib/faq";

/** Every FAQ, hidden ones included. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, faqs: await listAllFaqs() });
  } catch (error) {
    console.error("[faq] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load questions." },
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
    // No body is a blank question, which is what "Add question" means.
  }

  try {
    const faq = await createFaq(body);
    publishFaqs();
    return NextResponse.json({ ok: true, faq }, { status: 201 });
  } catch (error) {
    console.error("[faq] create failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create the question." },
      { status: 503 },
    );
  }
}
