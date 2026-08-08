import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getThread,
  setThreadArchived,
  setThreadStatus,
} from "@/lib/message-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

/**
 * One conversation.
 *
 * Opening a thread marks it read, which is what the brief asks for and is also
 * why this is a GET with a side effect — the alternative is a second request
 * from the client that can fail on its own and leave the badge lying. The
 * effect is idempotent, which is the part that actually matters.
 */
export async function GET(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    // Marked read *before* the read, so the messages that come back describe
    // the conversation as it now is. The other order returns every message
    // still flagged unread, which is a stale field in a response the client is
    // about to render.
    const marked = await setThreadStatus(id, "read");
    if (!marked) {
      return NextResponse.json(
        { ok: false, message: "No such conversation." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, messages: await getThread(id) });
  } catch (error) {
    console.error("[inbox] read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not open the conversation." },
      { status: 503 },
    );
  }
}

/** Manual read/unread and archive/unarchive. */
export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: { status?: unknown; archived?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  try {
    if (body.status === "unread" || body.status === "read") {
      await setThreadStatus(id, body.status);
    }
    if (typeof body.archived === "boolean") {
      await setThreadArchived(id, body.archived);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[inbox] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not update the conversation." },
      { status: 503 },
    );
  }
}
