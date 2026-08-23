import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-guard";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import { appendLeadNote, getLead } from "@/lib/lead-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

/**
 * Appends a note.
 *
 * The author is taken from the session, never from the request body. A note
 * saying who wrote it is only worth anything if the writer could not choose
 * what it says.
 */
export async function POST(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: { body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json(
      { ok: false, message: "A note needs something in it." },
      { status: 422 },
    );
  }

  try {
    const store = await cookies();
    const user = await getSessionUser(store.get(SESSION_COOKIE)?.value);

    const ok = await appendLeadNote(id, {
      body: text,
      author: user?.email ?? "unknown",
    });
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "No such lead." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, lead: await getLead(id) });
  } catch (error) {
    console.error("[leads] note failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save that note." },
      { status: 503 },
    );
  }
}
