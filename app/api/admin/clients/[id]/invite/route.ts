import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { SETUP_TOKEN_TTL_MS, reissueSetupToken } from "@/lib/client-auth";
import { sendClientInvitation } from "@/lib/client-invite";

/**
 * Resends a setup link.
 *
 * The old link stops working the moment this succeeds, because the new token's
 * hash overwrites it in the same update — invalidation is a consequence of
 * issuing rather than a second step someone could omit. That also means this is
 * the right button for "they never got the email" *and* for "that link may have
 * been seen by the wrong person": both want the outstanding one dead.
 *
 * There is no way to resend the *same* link. Only its digest was ever stored, so
 * nothing here can reconstruct it — which is the property that makes a leaked
 * database less than a stack of live invitations.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let reissued;
  try {
    reissued = await reissueSetupToken(id);
  } catch (error) {
    console.error("[clients] reissue failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create a new setup link." },
      { status: 503 },
    );
  }

  if (!reissued) {
    return NextResponse.json(
      { ok: false, message: "No such client." },
      { status: 404 },
    );
  }

  const mail = await sendClientInvitation({
    to: reissued.client.email,
    name: reissued.client.name,
    token: reissued.setupToken,
    ttlMs: SETUP_TOKEN_TTL_MS,
  });

  if (!mail.sent) {
    console.error(
      `[clients] invitation not sent to ${reissued.client.email}: ${mail.reason}`,
    );

    // Reported as a failure, unlike on create. Nothing else happened in this
    // request — the only thing it was asked to do was get an email to someone —
    // so "ok" would be a lie, and the previous link has already been invalidated
    // by the reissue, which the administrator needs to know.
    return NextResponse.json(
      {
        ok: false,
        message:
          mail.reason === "unconfigured"
            ? "Mail is not configured, so nothing was sent. The previous link no longer works."
            : "The email could not be sent. The previous link no longer works.",
        client: reissued.client,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, client: reissued.client });
}
