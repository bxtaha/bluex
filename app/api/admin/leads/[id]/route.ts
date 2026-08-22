import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getLead,
  setLeadFollowUp,
  setLeadStage,
  type LeadStage,
} from "@/lib/lead-store";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "won", "lost"];

function parseStage(value: unknown): LeadStage | null {
  return typeof value === "string" && STAGES.includes(value as LeadStage)
    ? (value as LeadStage)
    : null;
}

/**
 * Stage and follow-up date.
 *
 * A closed set, checked here rather than trusted: `stage` drives the sidebar
 * badge's query, and an arbitrary string written into it would produce a lead
 * that no filter can ever surface again.
 */
export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: { stage?: unknown; followUpAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  try {
    if (body.stage !== undefined) {
      const stage = parseStage(body.stage);
      if (!stage) {
        return NextResponse.json(
          { ok: false, message: "Unknown stage." },
          { status: 422 },
        );
      }
      const ok = await setLeadStage(id, stage);
      if (!ok) {
        return NextResponse.json(
          { ok: false, message: "No such lead." },
          { status: 404 },
        );
      }
    }

    if (body.followUpAt !== undefined) {
      // Null clears it. An empty string is what a cleared date input sends,
      // and treating it as "1970" would make every lead permanently overdue.
      const raw = body.followUpAt;
      const at =
        raw === null || raw === ""
          ? null
          : new Date(String(raw));

      if (at && Number.isNaN(at.getTime())) {
        return NextResponse.json(
          { ok: false, message: "That date could not be read." },
          { status: 422 },
        );
      }
      await setLeadFollowUp(id, at);
    }

    return NextResponse.json({ ok: true, lead: await getLead(id) });
  } catch (error) {
    console.error("[leads] patch failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save that." },
      { status: 503 },
    );
  }
}
