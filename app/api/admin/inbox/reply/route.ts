import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { sendMail } from "@/lib/mailer";
import { lastInboundInThread, recordReply } from "@/lib/message-store";

/**
 * Replies to a conversation, over SMTP, and records what was sent.
 *
 * The threading headers are the whole point. Without `In-Reply-To` and
 * `References` the reply arrives in the recipient's client as a brand new mail
 * with a familiar subject — most clients will not group it, and the person gets
 * two disconnected messages instead of a conversation. Both headers are built
 * from the message being answered: `In-Reply-To` is its Message-ID, and
 * `References` is its own chain with that id appended, which is what lets a
 * client reconstruct the whole thread rather than just one hop.
 *
 * A contact-form submission has no Message-ID — it never travelled as mail — so
 * a reply to one starts the chain instead of continuing it. That is correct,
 * and the reply we send is what everything after it will thread onto.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { threadId?: unknown; subject?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  const text = typeof body.message === "string" ? body.message.trim() : "";

  if (!threadId || !text) {
    return NextResponse.json(
      { ok: false, message: "A conversation and a message are both required." },
      { status: 400 },
    );
  }

  try {
    const parent = await lastInboundInThread(threadId);
    if (!parent) {
      return NextResponse.json(
        { ok: false, message: "No such conversation." },
        { status: 404 },
      );
    }
    if (!parent.email) {
      return NextResponse.json(
        { ok: false, message: "That conversation has no reply address." },
        { status: 409 },
      );
    }

    const subject =
      (typeof body.subject === "string" && body.subject.trim()) ||
      defaultSubject(parent.subject);

    const references = parent.messageId
      ? [...parent.references, parent.messageId]
      : [];

    const sent = await sendMail({
      to: parent.email,
      subject: subject.slice(0, 200),
      text,
      inReplyTo: parent.messageId || undefined,
      references,
    });

    if (!sent.sent) {
      // Nothing is recorded when nothing was sent. A reply in the thread that
      // never left the building is worse than no reply — it is the thread
      // telling you it has been answered when it has not.
      const status = sent.reason === "unconfigured" ? 503 : 502;
      return NextResponse.json(
        {
          ok: false,
          message:
            sent.reason === "unconfigured"
              ? "Sending is not configured. Set SMTP_USER and SMTP_PASS."
              : "The mail server rejected that. Nothing was sent.",
        },
        { status },
      );
    }

    const reply = await recordReply({
      threadId,
      to: parent.email,
      subject,
      message: text,
      messageId: sent.messageId,
      inReplyTo: parent.messageId,
      references,
      source: parent.source,
    });

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    console.error("[inbox] reply failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not send the reply." },
      { status: 503 },
    );
  }
}

/** `Re:` once, however many the incoming subject already carried. */
function defaultSubject(subject: string): string {
  const base = subject.replace(/^(\s*re\s*:\s*)+/i, "").trim();
  return `Re: ${base || "your message"}`;
}
