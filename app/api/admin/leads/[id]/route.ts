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

  // Validate everything before writing anything. A handler that writes as it
  // validates cannot report failure honestly: with `stage` applied first and
  // `followUpAt` checked second, a bad date on an otherwise-valid request
  // would return 422 after the stage change had already committed — a
  // caller told "this failed" while part of it had, silently, succeeded.
  let stage: LeadStage | null = null;
  if (body.stage !== undefined) {
    stage = parseStage(body.stage);
    if (!stage) {
      return NextResponse.json(
        { ok: false, message: "Unknown stage." },
        { status: 422 },
      );
    }
  }

  let followUpAt: Date | null | undefined;
  if (body.followUpAt !== undefined) {
    // Null clears it. An empty string is what a cleared date input sends,
    // and treating it as "1970" would make every lead permanently overdue.
    const raw = body.followUpAt;
    followUpAt = raw === null || raw === "" ? null : new Date(String(raw));

    if (followUpAt && Number.isNaN(followUpAt.getTime())) {
      return NextResponse.json(
        { ok: false, message: "That date could not be read." },
        { status: 422 },
      );
    }
  }

  try {
    if (stage) {
      const ok = await setLeadStage(id, stage);
      if (!ok) {
        return NextResponse.json(
          { ok: false, message: "No such lead." },
          { status: 404 },
        );
      }
    }

    if (followUpAt !== undefined) {
      const ok = await setLeadFollowUp(id, followUpAt);
      if (!ok) {
        return NextResponse.json(
          { ok: false, message: "No such lead." },
          { status: 404 },
        );
      }
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
